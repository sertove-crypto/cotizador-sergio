import React, { useState, useMemo, useRef, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type } from '@google/genai';
import { FabricGroup, FoamType } from './types';
import { 
  FOAM_MULTIPLIERS, 
  CUSHION_BASE_FACTOR, 
  CUSHION_AREA_FACTOR,
  CUSHION_PREMIUM_SURCHARGE,
  FURNITURE_PREMIUM_FABRIC_ADD,
  FURNITURE_VOLUME_FACTOR,
  STANDARD_MATTRESS_PRICES,
  BUSINESS_WHATSAPP
} from './constants';

// --- Utilidades de Audio para Gemini Live API ---

function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function encodeBase64(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('cushion');
  const [customer, setCustomer] = useState({ name: '', phone: '' });
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [micStatus, setMicStatus] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [showPermissionHelp, setShowPermissionHelp] = useState(false);

  // Estados de productos
  const [cushions, setCushions] = useState(() => [{ w: 45, h: 45, qty: 0 }]);
  const [seats, setSeats] = useState(() => [{ w: 50, h: 50, t: 10, qty: 0 }]);
  const [backrests, setBackrests] = useState(() => [{ w: 50, h: 40, t: 8, qty: 0 }]);
  const [mattresses, setMattresses] = useState(() => STANDARD_MATTRESS_PRICES.map(m => ({ ...m, qty: 0 })));

  // Estados de configuración
  const [cushionsFabricGroup, setCushionsFabricGroup] = useState<FabricGroup>(FabricGroup.A);
  const [furnitureFoamType, setFurnitureFoamType] = useState<FoamType>(FoamType.STANDARD);
  const [furnitureFabricGroup, setFurnitureFabricGroup] = useState<FabricGroup>(FabricGroup.A);

  // Referencias para Live API
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<{ input: AudioContext; output: AudioContext } | null>(null);
  const nextStartTimeRef = useRef(0);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const micStreamRef = useRef<MediaStream | null>(null);

  // Sincronizar estado de permisos al cargar
  useEffect(() => {
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'microphone' as PermissionName }).then((result) => {
        setMicStatus(result.state as any);
        result.onchange = () => setMicStatus(result.state as any);
      }).catch(() => {});
    }
  }, []);

  const addRow = (type: 'cushion' | 'seat' | 'backrest') => {
    if (type === 'cushion') setCushions(prev => [...prev, { w: 45, h: 45, qty: 0 }]);
    if (type === 'seat') setSeats(prev => [...prev, { w: 50, h: 50, t: 10, qty: 0 }]);
    if (type === 'backrest') setBackrests(prev => [...prev, { w: 50, h: 40, t: 8, qty: 0 }]);
  };

  const calculation = useMemo(() => {
    let items: any[] = [];
    let grandTotal = 0;

    cushions.forEach(it => {
      if (it.qty > 0 && it.w > 0 && it.h > 0) {
        let area = it.w * it.h;
        let base = CUSHION_BASE_FACTOR + (area * CUSHION_AREA_FACTOR);
        if (it.w >= 50 && it.h >= 50) base = Math.max(base, 10.00);
        let unit = cushionsFabricGroup === FabricGroup.B ? base + CUSHION_PREMIUM_SURCHARGE : base;
        items.push({ label: `Cojín ${it.w}x${it.h}`, qty: it.qty, sub: unit * it.qty, category: 'decor' });
        grandTotal += unit * it.qty;
      }
    });

    const processFurniture = (list: any[], name: string) => {
      list.forEach(it => {
        if (it.qty > 0 && it.w > 0 && it.h > 0 && it.t > 0) {
          let vol = it.w * it.h * it.t;
          let base = (vol * FURNITURE_VOLUME_FACTOR) * FOAM_MULTIPLIERS[furnitureFoamType];
          let unit = base + (furnitureFabricGroup === FabricGroup.B ? FURNITURE_PREMIUM_FABRIC_ADD : 0);
          items.push({ label: `${name} ${it.w}x${it.h}x${it.t}`, qty: it.qty, sub: unit * it.qty, category: 'furniture' });
          grandTotal += unit * it.qty;
        }
      });
    };
    processFurniture(seats, "Asiento");
    processFurniture(backrests, "Espaldar");

    mattresses.forEach(it => {
      if (it.qty > 0) {
        const sub = it.unit * it.qty;
        items.push({ label: `Colchoneta ${it.w}x${it.h}x${it.t}`, qty: it.qty, sub, category: 'mattress' });
        grandTotal += sub;
      }
    });

    return { items, total: grandTotal };
  }, [cushions, seats, backrests, mattresses, cushionsFabricGroup, furnitureFoamType, furnitureFabricGroup]);

  const stopVoiceAssistant = () => {
    if (sessionRef.current) { sessionRef.current.close(); sessionRef.current = null; }
    if (micStreamRef.current) { micStreamRef.current.getTracks().forEach(t => t.stop()); micStreamRef.current = null; }
    activeSourcesRef.current.forEach(s => { try { s.stop(); } catch (e) {} });
    activeSourcesRef.current.clear();
    setIsVoiceActive(false);
  };

  const startVoiceAssistant = async () => {
    if (isVoiceActive) { stopVoiceAssistant(); return; }

    if (micStatus === 'denied') {
      setShowPermissionHelp(true);
      return;
    }
    
    try {
      if (!window.isSecureContext && window.location.hostname !== 'localhost') {
        alert("El acceso al micrófono requiere una conexión segura (HTTPS).");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      setMicStatus('granted');
      
      if (!audioContextRef.current) {
        audioContextRef.current = {
          input: new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 }),
          output: new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 }),
        };
      }
      if (audioContextRef.current.input.state === 'suspended') await audioContextRef.current.input.resume();
      if (audioContextRef.current.output.state === 'suspended') await audioContextRef.current.output.resume();

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setIsVoiceActive(true);
            const source = audioContextRef.current!.input.createMediaStreamSource(stream);
            const scriptProcessor = audioContextRef.current!.input.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
              sessionPromise.then(session => {
                session.sendRealtimeInput({
                  media: { data: encodeBase64(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' }
                });
              });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(audioContextRef.current!.input.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            const base64Audio = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              const outCtx = audioContextRef.current!.output;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outCtx.currentTime);
              const buffer = await decodeAudioData(decodeBase64(base64Audio), outCtx, 24000, 1);
              const source = outCtx.createBufferSource();
              source.buffer = buffer;
              source.connect(outCtx.destination);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              activeSourcesRef.current.add(source);
              source.onended = () => activeSourcesRef.current.delete(source);
            }

            if (msg.toolCall) {
              for (const fc of msg.toolCall.functionCalls) {
                let toolResult = "ok";
                switch(fc.name) {
                  case 'updateTab':
                    const tab = fc.args.tab as string;
                    if (['cushion', 'mueble', 'mattress'].includes(tab)) setActiveTab(tab);
                    break;
                  case 'updateCushion':
                    setCushions(prev => {
                      const n = [...prev];
                      const i = (fc.args.index as number) || 0;
                      if (!n[i]) n[i] = { w: 45, h: 45, qty: 0 };
                      if (fc.args.w) n[i].w = Number(fc.args.w);
                      if (fc.args.h) n[i].h = Number(fc.args.h);
                      if (fc.args.qty !== undefined) n[i].qty = Number(fc.args.qty);
                      return n;
                    });
                    break;
                  case 'updateFurniture':
                    const targetSetter = fc.args.type === 'asiento' ? setSeats : setBackrests;
                    targetSetter(prev => {
                      const n = [...prev];
                      const i = (fc.args.index as number) || 0;
                      if (!n[i]) n[i] = { w: 50, h: 50, t: 10, qty: 0 };
                      if (fc.args.w) n[i].w = Number(fc.args.w);
                      if (fc.args.h) n[i].h = Number(fc.args.h);
                      if (fc.args.t) n[i].t = Number(fc.args.t);
                      if (fc.args.qty !== undefined) n[i].qty = Number(fc.args.qty);
                      return n;
                    });
                    break;
                }
                sessionPromise.then(s => s.sendToolResponse({
                  functionResponses: { id: fc.id, name: fc.name, response: { result: toolResult } }
                }));
              }
            }
          },
          onerror: (e) => { console.error(e); stopVoiceAssistant(); },
          onclose: () => setIsVoiceActive(false)
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } },
          systemInstruction: 'Asistente de Cojines Sergio. Ayudas a cotizar cojines (cushion), muebles (mueble) y colchonetas (mattress). Puedes cambiar de pestaña y actualizar medidas.',
          tools: [{
            functionDeclarations: [
              { name: 'updateTab', parameters: { type: Type.OBJECT, properties: { tab: { type: Type.STRING } } } },
              { name: 'updateCushion', parameters: { type: Type.OBJECT, properties: { index: { type: Type.NUMBER }, w: { type: Type.NUMBER }, h: { type: Type.NUMBER }, qty: { type: Type.NUMBER } } } },
              { name: 'updateFurniture', parameters: { type: Type.OBJECT, properties: { type: { type: Type.STRING }, index: { type: Type.NUMBER }, w: { type: Type.NUMBER }, h: { type: Type.NUMBER }, t: { type: Type.NUMBER }, qty: { type: Type.NUMBER } } } }
            ]
          }]
        }
      });
      sessionPromise.then(s => sessionRef.current = s);
    } catch (err: any) {
      console.error("Mic error:", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setMicStatus('denied');
        setShowPermissionHelp(true);
      } else {
        alert("No se pudo iniciar el asistente: " + err.message);
      }
      stopVoiceAssistant();
    }
  };

  const handleWhatsApp = () => {
    let text = `*COTIZACIÓN COJINES SERGIO*\n*Cliente:* ${customer.name || 'Invitado'}\n\n`;
    calculation.items.forEach(it => { text += `• ${it.label} x${it.qty}: $${it.sub.toFixed(2)}\n`; });
    text += `\n*TOTAL: $${calculation.total.toFixed(2)}*`;
    window.open(`https://wa.me/${BUSINESS_WHATSAPP}?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-transparent pb-24 md:pb-8 flex flex-col">
      {/* Resumen Superior (Móvil) */}
      <div className="sticky top-0 z-50 px-4 pt-4 md:hidden">
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-4 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Total Cotizado</span>
            <span className="text-2xl font-black text-[#005f6b]">${calculation.total.toFixed(2)}</span>
          </div>
          <button onClick={() => setShowSummary(!showSummary)} className="bg-[#005f6b] text-white p-3 rounded-xl shadow-lg relative">
            {calculation.items.length > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-[8px] w-4 h-4 rounded-full flex items-center justify-center border border-white font-black">{calculation.items.length}</span>}
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
          </button>
        </div>
      </div>

      <header className="px-6 py-8 text-center md:text-left md:max-w-4xl md:mx-auto w-full">
        <h1 className="text-3xl font-black text-white drop-shadow-md">Cojines Sergio</h1>
        <p className="text-white/70 text-sm font-medium">Cotizador inteligente de tapicería a medida</p>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 mb-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="md:col-span-2 space-y-4">
            <div className="glass-card rounded-3xl p-1 shadow-2xl overflow-hidden border border-white/30">
              {/* Tabs Desktop */}
              <div className="hidden md:flex border-b border-gray-100 mb-2">
                {['cushion', 'mueble', 'mattress'].map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-4 text-xs font-bold uppercase tracking-widest ${activeTab === tab ? 'text-[#005f6b] bg-gray-50' : 'text-gray-400'}`}>
                    {tab === 'cushion' ? 'Cojines' : tab === 'mueble' ? 'Muebles' : 'Colchonetas'}
                  </button>
                ))}
              </div>

              <div className="p-4 md:p-6 space-y-6">
                {activeTab === 'cushion' && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-extrabold text-[#005f6b] text-sm uppercase tracking-tighter">Cojines Decorativos</h3>
                      <select value={cushionsFabricGroup} onChange={(e) => setCushionsFabricGroup(e.target.value as FabricGroup)} className="text-[10px] font-bold border rounded-lg px-2 py-1 bg-white outline-none">
                        <option value={FabricGroup.A}>TELA ESTÁNDAR</option>
                        <option value={FabricGroup.B}>TELA PREMIUM</option>
                      </select>
                    </div>
                    {cushions.map((it, idx) => (
                      <div key={idx} className="flex gap-2 items-center bg-white/50 p-2 rounded-2xl border border-white/80">
                        <div className="flex-1 grid grid-cols-2 gap-2">
                          <input type="number" placeholder="Ancho" value={it.w || ''} onChange={e => { const n = [...cushions]; n[idx].w = +e.target.value; setCushions(n); }} className="w-full bg-white rounded-xl p-3 text-sm font-bold shadow-sm" />
                          <input type="number" placeholder="Alto" value={it.h || ''} onChange={e => { const n = [...cushions]; n[idx].h = +e.target.value; setCushions(n); }} className="w-full bg-white rounded-xl p-3 text-sm font-bold shadow-sm" />
                        </div>
                        <input type="number" placeholder="Cant" value={it.qty || ''} onChange={e => { const n = [...cushions]; n[idx].qty = +e.target.value; setCushions(n); }} className="w-16 bg-[#005f6b]/10 rounded-xl p-3 text-center text-sm font-black text-[#005f6b]" />
                      </div>
                    ))}
                    <button onClick={() => addRow('cushion')} className="w-full py-3 border-2 border-dashed border-[#005f6b]/20 text-[#005f6b] text-[10px] font-black uppercase rounded-2xl">+ Nuevo Cojín</button>
                  </div>
                )}

                {activeTab === 'mueble' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                    <div className="grid grid-cols-2 gap-3">
                      <select value={furnitureFoamType} onChange={e => setFurnitureFoamType(e.target.value as FoamType)} className="w-full bg-white rounded-2xl p-3 text-[10px] font-bold shadow-sm outline-none">
                        <option value={FoamType.ECONOMY}>Espuma Básica</option>
                        <option value={FoamType.STANDARD}>Espuma Estándar</option>
                        <option value={FoamType.PREMIUM}>Espuma Premium</option>
                      </select>
                      <select value={furnitureFabricGroup} onChange={e => setFurnitureFabricGroup(e.target.value as FabricGroup)} className="w-full bg-white rounded-2xl p-3 text-[10px] font-bold shadow-sm outline-none">
                        <option value={FabricGroup.A}>Tela Estándar</option>
                        <option value={FabricGroup.B}>Tela Premium</option>
                      </select>
                    </div>
                    {/* Compact input for furniture seats/backrests */}
                    <div className="space-y-4">
                       <h4 className="font-extrabold text-[#005f6b] text-xs uppercase tracking-tighter">Asientos / Espaldares</h4>
                       {seats.map((it, idx) => (
                         <div key={idx} className="flex gap-2 bg-white/50 p-2 rounded-2xl border border-white/80">
                           <input type="number" placeholder="L" value={it.w || ''} onChange={e => { const n = [...seats]; n[idx].w = +e.target.value; setSeats(n); }} className="w-full bg-white p-2 rounded-xl text-xs font-bold" />
                           <input type="number" placeholder="An" value={it.h || ''} onChange={e => { const n = [...seats]; n[idx].h = +e.target.value; setSeats(n); }} className="w-full bg-white p-2 rounded-xl text-xs font-bold" />
                           <input type="number" placeholder="Es" value={it.t || ''} onChange={e => { const n = [...seats]; n[idx].t = +e.target.value; setSeats(n); }} className="w-full bg-white p-2 rounded-xl text-xs font-bold" />
                           <input type="number" placeholder="x" value={it.qty || ''} onChange={e => { const n = [...seats]; n[idx].qty = +e.target.value; setSeats(n); }} className="w-12 bg-[#005f6b]/10 p-2 rounded-xl text-center text-xs font-black text-[#005f6b]" />
                         </div>
                       ))}
                       <button onClick={() => addRow('seat')} className="text-[#005f6b] text-[10px] font-bold uppercase tracking-widest">+ Agregar Fila</button>
                    </div>
                  </div>
                )}

                {activeTab === 'mattress' && (
                  <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                    {mattresses.map((it, idx) => (
                      <div key={idx} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${it.qty > 0 ? 'bg-[#005f6b]/10 border-[#005f6b]/20 shadow-inner' : 'bg-white/50 border-white/80'}`}>
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-gray-800">{it.w}x{it.h}x{it.t} cm</span>
                          <span className="text-[10px] font-bold text-[#005f6b]">${it.unit.toFixed(2)} c/u</span>
                        </div>
                        <input type="number" placeholder="0" value={it.qty || ''} onChange={e => { const n = [...mattresses]; n[idx].qty = +e.target.value; setMattresses(n); }} className="w-16 bg-white p-2 rounded-xl text-center text-xs font-black text-[#005f6b] shadow-sm" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="hidden md:block glass-card rounded-3xl p-6 shadow-xl border border-white/30">
              <input type="text" placeholder="Tu Nombre" value={customer.name} onChange={e => setCustomer({...customer, name: e.target.value})} className="w-full bg-white rounded-2xl p-4 text-sm font-medium shadow-sm outline-none" />
            </div>
          </div>

          <div className="hidden md:block">
            <div className="bg-[#005f6b] text-white rounded-[2.5rem] shadow-2xl p-8 sticky top-8 border border-white/10 flex flex-col min-h-[400px]">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mb-6">Resumen</h3>
              <div className="flex-1 space-y-4 max-h-[300px] overflow-y-auto no-scrollbar mb-6">
                {calculation.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between items-center text-[10px] font-bold">
                    <span className="truncate w-32">{it.label} x{it.qty}</span>
                    <span className="font-mono text-[#80d8e4]">${it.sub.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="pt-6 border-t border-white/10">
                <div className="flex justify-between items-baseline mb-6">
                  <span className="text-xs font-bold opacity-50 uppercase">Total</span>
                  <span className="text-4xl font-black">${calculation.total.toFixed(2)}</span>
                </div>
                <button onClick={handleWhatsApp} disabled={calculation.total === 0} className="w-full bg-[#80d8e4] text-[#005f6b] font-black py-5 rounded-3xl shadow-lg active:scale-95 disabled:opacity-20 text-[10px] tracking-widest uppercase">WhatsApp</button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* UI Ayuda Permisos Micrófono */}
      {showPermissionHelp && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl space-y-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-black text-gray-900 uppercase">Micrófono Bloqueado</h3>
              <p className="text-sm text-gray-500 font-medium">El navegador denegó el acceso. Para hablar con el asistente:</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-2xl space-y-3">
              <div className="flex gap-3 items-start">
                <span className="bg-gray-200 text-gray-600 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0">1</span>
                <p className="text-xs text-gray-600 leading-tight">Haz clic en el ícono del <b>candado</b> junto a la dirección URL.</p>
              </div>
              <div className="flex gap-3 items-start">
                <span className="bg-gray-200 text-gray-600 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0">2</span>
                <p className="text-xs text-gray-600 leading-tight">Activa el interruptor de <b>Micrófono</b>.</p>
              </div>
              <div className="flex gap-3 items-start">
                <span className="bg-gray-200 text-gray-600 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0">3</span>
                <p className="text-xs text-gray-600 leading-tight">Recarga la página y vuelve a intentarlo.</p>
              </div>
            </div>
            <button onClick={() => setShowPermissionHelp(false)} className="w-full py-4 bg-[#005f6b] text-white font-black rounded-2xl uppercase tracking-widest text-[10px]">Entendido</button>
          </div>
        </div>
      )}

      {/* Modal Resumen Móvil */}
      {showSummary && (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm p-4 flex items-end justify-center md:hidden" onClick={() => setShowSummary(false)}>
          <div className="bg-[#005f6b] w-full max-w-sm rounded-[3rem] p-8 shadow-2xl flex flex-col gap-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center text-white">
              <h3 className="text-xs font-black uppercase tracking-widest">Tu Cotización</h3>
              <button onClick={() => setShowSummary(false)}><svg className="w-6 h-6 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="space-y-4 max-h-[30vh] overflow-y-auto pr-2 no-scrollbar">
               {calculation.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between text-white/90 text-[10px] font-bold uppercase tracking-tight">
                    <span>{it.label} x{it.qty}</span>
                    <span className="font-mono text-[#80d8e4]">${it.sub.toFixed(2)}</span>
                  </div>
               ))}
            </div>
            <div className="space-y-3">
              <input type="text" placeholder="Tu Nombre" value={customer.name} onChange={e => setCustomer({...customer, name: e.target.value})} className="w-full bg-white/10 border-0 rounded-2xl p-4 text-xs font-bold text-white placeholder:text-white/30 outline-none" />
            </div>
            <div className="flex justify-between items-end text-white border-t border-white/10 pt-4">
               <span className="text-xs font-bold opacity-50 uppercase">Total</span>
               <span className="text-4xl font-black">${calculation.total.toFixed(2)}</span>
            </div>
            <button onClick={handleWhatsApp} disabled={calculation.total === 0} className="w-full bg-[#80d8e4] text-[#005f6b] py-5 rounded-3xl font-black uppercase text-[10px] tracking-widest">Enviar WhatsApp</button>
          </div>
        </div>
      )}

      {/* Botón Asistente AI Flotante */}
      <div className="fixed bottom-24 right-6 md:bottom-8 md:right-8 z-40">
        <button onClick={startVoiceAssistant} className={`w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center shadow-2xl transition-all duration-500 active:scale-90 relative ${isVoiceActive ? 'bg-red-500 animate-pulse' : 'bg-white text-[#005f6b]'}`}>
          {micStatus === 'denied' && !isVoiceActive && <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[8px] w-4 h-4 rounded-full border border-white flex items-center justify-center font-black">!</span>}
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={isVoiceActive ? "M21 12a9 9 0 11-18 0 9 9 0 0118 0z M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H10a1 1 0 01-1-1v-4z" : "M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"} /></svg>
        </button>
      </div>

      {/* Navbar Inferior (Móvil) */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-t border-gray-100 flex md:hidden px-2 pb-6 pt-2">
        {['cushion', 'mueble', 'mattress'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 transition-all ${activeTab === tab ? 'text-[#005f6b]' : 'text-gray-300'}`}>
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${activeTab === tab ? 'bg-[#005f6b]/10' : ''}`}>
              {tab === 'cushion' ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg> : 
               tab === 'mueble' ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" /></svg> : 
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>}
            </div>
            <span className="text-[8px] font-black uppercase tracking-widest">{tab === 'cushion' ? 'Cojines' : tab === 'mueble' ? 'Muebles' : 'Colchonetas'}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}