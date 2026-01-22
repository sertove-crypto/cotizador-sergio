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

// --- Utilidades de Audio ---
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
  const [activeTab, setActiveTab] = useState<string>('mueble');
  const [customer, setCustomer] = useState({ name: '', phone: '' });
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [micStatus, setMicStatus] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [showMicHelp, setShowMicHelp] = useState(false);

  // Estados de productos
  const [cushions, setCushions] = useState(() => [{ w: 45, h: 45, qty: 0 }]);
  const [seats, setSeats] = useState(() => [{ w: 50, h: 50, t: 10, qty: 0 }]);
  const [backrests, setBackrests] = useState(() => [{ w: 50, h: 40, t: 8, qty: 0 }]);
  const [mattresses, setMattresses] = useState(() => STANDARD_MATTRESS_PRICES.map(m => ({ ...m, qty: 0 })));

  // Estados de configuración
  const [cushionsFabricGroup, setCushionsFabricGroup] = useState<FabricGroup>(FabricGroup.A);
  const [furnitureFoamType, setFurnitureFoamType] = useState<FoamType>(FoamType.STANDARD);
  const [furnitureFabricGroup, setFurnitureFabricGroup] = useState<FabricGroup>(FabricGroup.A);

  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<{ input: AudioContext; output: AudioContext } | null>(null);
  const nextStartTimeRef = useRef(0);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const micStreamRef = useRef<MediaStream | null>(null);

  // Monitorear permisos del micrófono
  useEffect(() => {
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'microphone' as PermissionName }).then((result) => {
        setMicStatus(result.state as any);
        result.onchange = () => {
          setMicStatus(result.state as any);
          if (result.state === 'granted') setShowMicHelp(false);
        };
      });
    }
  }, []);

  const performReset = () => {
    // Resetear absolutamente todos los estados y cantidades a cero
    setCushions([{ w: 45, h: 45, qty: 0 }]);
    setSeats([{ w: 50, h: 50, t: 10, qty: 0 }]);
    setBackrests([{ w: 50, h: 40, t: 8, qty: 0 }]);
    setMattresses(STANDARD_MATTRESS_PRICES.map(m => ({ ...m, qty: 0 })));
    setCustomer({ name: '', phone: '' });
    setCushionsFabricGroup(FabricGroup.A);
    setFurnitureFoamType(FoamType.STANDARD);
    setFurnitureFabricGroup(FabricGroup.A);
  };

  const handleReset = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (window.confirm("¿Deseas limpiar toda la cotización actual?")) {
      performReset();
    }
  };

  const addRow = (type: 'cushion' | 'seat' | 'backrest') => {
    if (type === 'cushion') setCushions(prev => [...prev, { w: 45, h: 45, qty: 0 }]);
    if (type === 'seat') setSeats(prev => [...prev, { w: 50, h: 50, t: 10, qty: 0 }]);
    if (type === 'backrest') setBackrests(prev => [...prev, { w: 50, h: 40, t: 8, qty: 0 }]);
  };

  const calculation = useMemo(() => {
    let items: any[] = [];
    let grandTotal = 0;

    // Sumar Cojines
    cushions.forEach(it => {
      if (it.qty > 0 && it.w > 0 && it.h > 0) {
        let area = it.w * it.h;
        let base = CUSHION_BASE_FACTOR + (area * CUSHION_AREA_FACTOR);
        if (it.w >= 50 && it.h >= 50) base = Math.max(base, 10.00);
        let unit = cushionsFabricGroup === FabricGroup.B ? base + CUSHION_PREMIUM_SURCHARGE : base;
        items.push({ label: `Cojín ${it.w}x${it.h} (${cushionsFabricGroup === FabricGroup.A ? 'Estándar' : 'Premium'})`, qty: it.qty, sub: unit * it.qty });
        grandTotal += unit * it.qty;
      }
    });

    // Sumar Muebles (Asientos y Espaldares)
    const processFurniture = (list: any[], name: string) => {
      list.forEach(it => {
        if (it.qty > 0 && it.w > 0 && it.h > 0 && it.t > 0) {
          let vol = it.w * it.h * it.t;
          let base = (vol * FURNITURE_VOLUME_FACTOR) * FOAM_MULTIPLIERS[furnitureFoamType];
          let unit = base + (furnitureFabricGroup === FabricGroup.B ? FURNITURE_PREMIUM_FABRIC_ADD : 0);
          items.push({ label: `${name} ${it.w}x${it.h}x${it.t} (${furnitureFoamType}/${furnitureFabricGroup === FabricGroup.A ? 'Estándar' : 'Premium'})`, qty: it.qty, sub: unit * it.qty });
          grandTotal += unit * it.qty;
        }
      });
    };
    processFurniture(seats, "Asiento");
    processFurniture(backrests, "Espaldar");

    // Sumar Colchonetas
    mattresses.forEach(it => {
      if (it.qty > 0) {
        const sub = it.unit * it.qty;
        items.push({ label: `Colchoneta ${it.w}x${it.h}x${it.t}`, qty: it.qty, sub });
        grandTotal += sub;
      }
    });

    return { items, total: grandTotal };
  }, [cushions, seats, backrests, mattresses, cushionsFabricGroup, furnitureFoamType, furnitureFabricGroup]);

  const startVoiceAssistant = async () => {
    if (isVoiceActive) {
      stopVoiceAssistant();
      return;
    }

    if (micStatus === 'denied') {
      setShowMicHelp(true);
      return;
    }

    try {
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
              sessionPromise.then(session => session.sendRealtimeInput({ media: { data: encodeBase64(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' } }));
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
                switch (fc.name) {
                  case 'updateTab': if (['cojin', 'mueble', 'colchoneta'].includes(fc.args.tab as string)) setActiveTab(fc.args.tab as string); break;
                  case 'updateCushion': setCushions(prev => { const n = [...prev]; const i = (fc.args.index as number) || 0; if(!n[i]) n[i] = {w:0,h:0,qty:0}; if(fc.args.w) n[i].w=Number(fc.args.w); if(fc.args.h) n[i].h=Number(fc.args.h); if(fc.args.qty !== undefined) n[i].qty=Number(fc.args.qty); return n; }); break;
                  case 'updateFurniture': const setter = fc.args.type === 'asiento' ? setSeats : setBackrests; setter(prev => { const n = [...prev]; const i = (fc.args.index as number) || 0; if(!n[i]) n[i] = {w:0,h:0,t:0,qty:0}; if(fc.args.w) n[i].w=Number(fc.args.w); if(fc.args.h) n[i].h=Number(fc.args.h); if(fc.args.t) n[i].t=Number(fc.args.t); if(fc.args.qty !== undefined) n[i].qty=Number(fc.args.qty); return n; }); break;
                  case 'setCustomerInfo': setCustomer(prev => ({ name: (fc.args.name as string) || prev.name, phone: (fc.args.phone as string) || prev.phone })); break;
                  case 'clearAll': performReset(); break;
                }
                sessionPromise.then(s => s.sendToolResponse({ functionResponses: { id: fc.id, name: fc.name, response: { result: "ok" } } }));
              }
            }
          },
          onclose: () => setIsVoiceActive(false),
          onerror: () => stopVoiceAssistant()
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } },
          systemInstruction: 'Asistente de Cojines Sergio. Ayudas a cotizar cojines decorativos (tab: cojin), muebles (asientos/espaldares, tab: mueble) y colchonetas predefinidas (tab: colchoneta). El usuario puede decir "Limpiar todo" o "Resetear" para borrar los datos y volver a cero.',
          tools: [{
            functionDeclarations: [
              { name: 'updateTab', parameters: { type: Type.OBJECT, properties: { tab: { type: Type.STRING } } } },
              { name: 'updateCushion', parameters: { type: Type.OBJECT, properties: { index: { type: Type.NUMBER }, w: { type: Type.NUMBER }, h: { type: Type.NUMBER }, qty: { type: Type.NUMBER } } } },
              { name: 'updateFurniture', parameters: { type: Type.OBJECT, properties: { type: { type: Type.STRING, enum: ['asiento', 'espaldar'] }, index: { type: Type.NUMBER }, w: { type: Type.NUMBER }, h: { type: Type.NUMBER }, t: { type: Type.NUMBER }, qty: { type: Type.NUMBER } } } },
              { name: 'setCustomerInfo', parameters: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, phone: { type: Type.STRING } } } },
              { name: 'clearAll', parameters: { type: Type.OBJECT, properties: {} } }
            ]
          }]
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.message.includes('Permission denied')) {
        setMicStatus('denied');
        setShowMicHelp(true);
      } else {
        alert("Error de asistente de voz: " + err.message);
      }
      setIsVoiceActive(false);
    }
  };

  const stopVoiceAssistant = () => {
    if (sessionRef.current) { sessionRef.current.close(); sessionRef.current = null; }
    if (micStreamRef.current) { micStreamRef.current.getTracks().forEach(t => t.stop()); micStreamRef.current = null; }
    activeSourcesRef.current.forEach(s => { try { s.stop(); } catch(e){} });
    activeSourcesRef.current.clear();
    setIsVoiceActive(false);
  };

  const sendWhatsApp = () => {
    let msg = `🧾 *COTIZACIÓN - COJINES SERGIO*\n\n*CLIENTE:* ${customer.name || 'Invitado'}\n\n*DETALLE:*\n${calculation.items.map(i => `• ${i.qty}x ${i.label} -> $${i.sub.toFixed(2)}`).join('\n')}\n\n💰 *TOTAL: $${calculation.total.toFixed(2)}*`;
    window.open(`https://wa.me/${BUSINESS_WHATSAPP}?text=${encodeURIComponent(msg)}`);
  };

  return (
    <div className="min-h-screen pb-40">
      <header className="px-8 pt-10 pb-16 flex flex-col items-center">
        <h1 className="text-[26px] font-extrabold text-white drop-shadow-lg text-center">Cojines Sergio</h1>
        <p className="text-[10px] font-bold text-white/70 tracking-widest uppercase mt-1">Taller de Tapicería</p>
      </header>

      <main className="max-w-xl mx-auto px-4 md:px-6">
        <nav className="flex items-center bg-white/10 backdrop-blur-md p-1.5 rounded-[2.5rem] mb-8 gap-1 border border-white/20 sticky top-4 z-40">
          {['cojin', 'mueble', 'colchoneta'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-4 px-3 rounded-[2rem] text-[9px] font-extrabold transition-all uppercase text-center ${activeTab === tab ? 'bg-white text-[#005f6b] shadow-lg scale-[1.02]' : 'text-white/60 hover:text-white/80'}`}>
              {tab === 'mueble' ? 'ASIENTOS / ESPALDARES' : tab === 'cojin' ? 'COJINES' : tab}
            </button>
          ))}
        </nav>

        {/* Botón de Reestablecer */}
        <div className="flex justify-end mb-4 px-2">
          <button 
            type="button"
            onClick={handleReset}
            className="flex items-center gap-2 py-2.5 px-5 bg-white/10 hover:bg-white/20 text-white/90 rounded-full border border-white/10 backdrop-blur-sm transition-all active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            <span className="text-[10px] font-black uppercase tracking-widest">Limpiar Cotización</span>
          </button>
        </div>

        <section className="glass-card rounded-[2.5rem] p-6 shadow-2xl mb-12">
          
          {/* SECCIÓN COJINES */}
          {activeTab === 'cojin' && (
            <div className="space-y-8">
              <div className="space-y-4">
                <p className="text-[10px] font-black text-[#005f6b]/60 uppercase tracking-widest px-1">Calidad de Tela</p>
                <div className="flex bg-slate-100 p-1 rounded-2xl gap-1">
                  {[FabricGroup.A, FabricGroup.B].map(g => (
                    <button 
                      key={g} 
                      onClick={() => setCushionsFabricGroup(g)} 
                      className={`flex-1 py-3 rounded-xl text-[10px] font-bold transition-all ${cushionsFabricGroup === g ? 'bg-white text-[#005f6b] shadow-md' : 'text-slate-400'}`}
                    >
                      {g === FabricGroup.A ? 'ESTÁNDAR' : 'PREMIUM'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-[11px] font-black text-[#005f6b] uppercase tracking-widest px-1">Medidas de Cojines</h3>
                {cushions.map((it, i) => (
                  <div key={i} className={`flex flex-col gap-4 p-4 rounded-3xl border transition-all ${it.qty > 0 ? 'bg-[#E0F7F9] border-[#80d8e4]' : 'bg-white/50 border-slate-100'}`}>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <p className="text-[8px] font-bold text-slate-400 mb-1 ml-1">Ancho (cm)</p>
                        <input type="number" value={it.w || ''} placeholder="An" onChange={e=>{let n=[...cushions]; n[i].w=+e.target.value; setCushions(n)}} className="w-full h-14 bg-white border border-slate-200 rounded-2xl p-3 font-bold text-center text-lg focus:border-[#005f6b] outline-none transition-all" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[8px] font-bold text-slate-400 mb-1 ml-1">Alto (cm)</p>
                        <input type="number" value={it.h || ''} placeholder="Al" onChange={e=>{let n=[...cushions]; n[i].h=+e.target.value; setCushions(n)}} className="w-full h-14 bg-white border border-slate-200 rounded-2xl p-3 font-bold text-center text-lg focus:border-[#005f6b] outline-none transition-all" />
                      </div>
                      <div className="w-20">
                        <p className="text-[8px] font-bold text-slate-400 mb-1 ml-1">Cant</p>
                        <input type="number" value={it.qty === 0 ? '' : it.qty} placeholder="0" onChange={e=>{let n=[...cushions]; n[i].qty=+e.target.value; setCushions(n)}} className="w-full h-14 bg-white border border-slate-200 rounded-2xl p-3 font-black text-[#005f6b] text-center text-lg focus:border-[#005f6b] outline-none transition-all" />
                      </div>
                    </div>
                  </div>
                ))}
                <button onClick={() => addRow('cushion')} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:border-[#005f6b] hover:text-[#005f6b] hover:bg-[#005f6b]/5 transition-all">+ Agregar Fila de Cojín</button>
              </div>
            </div>
          )}

          {/* SECCIÓN MUEBLES */}
          {activeTab === 'mueble' && (
            <div className="space-y-10">
              <div className="space-y-6 bg-slate-50/50 p-4 rounded-3xl border border-slate-100">
                <div className="space-y-3">
                  <p className="text-[10px] font-black text-[#005f6b]/60 uppercase tracking-widest px-1">Tipo de Espuma</p>
                  <div className="flex bg-slate-200/50 p-1 rounded-2xl gap-1">
                    {[FoamType.ECONOMY, FoamType.STANDARD, FoamType.PREMIUM].map(f => (
                      <button 
                        key={f} 
                        onClick={() => setFurnitureFoamType(f)} 
                        className={`flex-1 py-3 rounded-xl text-[9px] font-bold transition-all ${furnitureFoamType === f ? 'bg-white text-[#005f6b] shadow-md' : 'text-slate-400'}`}
                      >
                        {f.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <p className="text-[10px] font-black text-[#005f6b]/60 uppercase tracking-widest px-1">Calidad de Tela</p>
                  <div className="flex bg-slate-200/50 p-1 rounded-2xl gap-1">
                    {[FabricGroup.A, FabricGroup.B].map(g => (
                      <button 
                        key={g} 
                        onClick={() => setFurnitureFabricGroup(g)} 
                        className={`flex-1 py-3 rounded-xl text-[10px] font-bold transition-all ${furnitureFabricGroup === g ? 'bg-white text-[#005f6b] shadow-md' : 'text-slate-400'}`}
                      >
                        {g === FabricGroup.A ? 'ESTÁNDAR' : 'PREMIUM'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                <div className="space-y-6">
                  <h3 className="text-[11px] font-black text-[#005f6b] uppercase tracking-widest px-1">Asientos</h3>
                  {seats.map((it, i) => (
                    <div key={i} className={`flex flex-col gap-4 p-4 rounded-3xl border transition-all ${it.qty > 0 ? 'bg-[#E0F7F9] border-[#80d8e4]' : 'bg-white/50 border-slate-100'}`}>
                      <div className="flex gap-2">
                        <div className="flex-1"><p className="text-[8px] font-bold text-slate-400 mb-1 ml-1 text-center">Largo</p><input type="number" placeholder="L" value={it.w || ''} onChange={e=>{let n=[...seats]; n[i].w=+e.target.value; setSeats(n)}} className="w-full h-14 bg-white border border-slate-200 rounded-2xl p-2 font-bold text-center text-lg outline-none focus:border-[#005f6b]" /></div>
                        <div className="flex-1"><p className="text-[8px] font-bold text-slate-400 mb-1 ml-1 text-center">Ancho</p><input type="number" placeholder="An" value={it.h || ''} onChange={e=>{let n=[...seats]; n[i].h=+e.target.value; setSeats(n)}} className="w-full h-14 bg-white border border-slate-200 rounded-2xl p-2 font-bold text-center text-lg outline-none focus:border-[#005f6b]" /></div>
                        <div className="flex-1"><p className="text-[8px] font-bold text-slate-400 mb-1 ml-1 text-center">Esp</p><input type="number" placeholder="Es" value={it.t || ''} onChange={e=>{let n=[...seats]; n[i].t=+e.target.value; setSeats(n)}} className="w-full h-14 bg-white border border-slate-200 rounded-2xl p-2 font-bold text-center text-lg outline-none focus:border-[#005f6b]" /></div>
                        <div className="w-20"><p className="text-[8px] font-bold text-slate-400 mb-1 ml-1 text-center">Cant</p><input type="number" placeholder="Cant" value={it.qty === 0 ? '' : it.qty} onChange={e=>{let n=[...seats]; n[i].qty=+e.target.value; setSeats(n)}} className="w-full h-14 bg-white border border-slate-200 rounded-2xl p-2 font-black text-[#005f6b] text-center text-lg outline-none focus:border-[#005f6b]" /></div>
                      </div>
                    </div>
                  ))}
                  <button onClick={() => addRow('seat')} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:border-[#005f6b] hover:text-[#005f6b] transition-all">+ Agregar Asiento</button>
                </div>

                <div className="space-y-6 pt-6 border-t border-slate-100">
                  <h3 className="text-[11px] font-black text-[#005f6b] uppercase tracking-widest px-1">Espaldares</h3>
                  {backrests.map((it, i) => (
                    <div key={i} className={`flex flex-col gap-4 p-4 rounded-3xl border transition-all ${it.qty > 0 ? 'bg-[#E0F7F9] border-[#80d8e4]' : 'bg-white/50 border-slate-100'}`}>
                      <div className="flex gap-2">
                        <div className="flex-1"><p className="text-[8px] font-bold text-slate-400 mb-1 ml-1 text-center">Largo</p><input type="number" placeholder="L" value={it.w || ''} onChange={e=>{let n=[...backrests]; n[i].w=+e.target.value; setBackrests(n)}} className="w-full h-14 bg-white border border-slate-200 rounded-2xl p-2 font-bold text-center text-lg outline-none focus:border-[#005f6b]" /></div>
                        <div className="flex-1"><p className="text-[8px] font-bold text-slate-400 mb-1 ml-1 text-center">Ancho</p><input type="number" placeholder="An" value={it.h || ''} onChange={e=>{let n=[...backrests]; n[i].h=+e.target.value; setBackrests(n)}} className="w-full h-14 bg-white border border-slate-200 rounded-2xl p-2 font-bold text-center text-lg outline-none focus:border-[#005f6b]" /></div>
                        <div className="flex-1"><p className="text-[8px] font-bold text-slate-400 mb-1 ml-1 text-center">Esp</p><input type="number" placeholder="Es" value={it.t || ''} onChange={e=>{let n=[...backrests]; n[i].t=+e.target.value; setBackrests(n)}} className="w-full h-14 bg-white border border-slate-200 rounded-2xl p-2 font-bold text-center text-lg outline-none focus:border-[#005f6b]" /></div>
                        <div className="w-20"><p className="text-[8px] font-bold text-slate-400 mb-1 ml-1 text-center">Cant</p><input type="number" placeholder="Cant" value={it.qty === 0 ? '' : it.qty} onChange={e=>{let n=[...backrests]; n[i].qty=+e.target.value; setBackrests(n)}} className="w-full h-14 bg-white border border-slate-200 rounded-2xl p-2 font-black text-[#005f6b] text-center text-lg outline-none focus:border-[#005f6b]" /></div>
                      </div>
                    </div>
                  ))}
                  <button onClick={() => addRow('backrest')} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:border-[#005f6b] hover:text-[#005f6b] transition-all">+ Agregar Espaldar</button>
                </div>
              </div>
            </div>
          )}

          {/* SECCIÓN COLCHONETAS */}
          {activeTab === 'colchoneta' && (
            <div className="space-y-6">
              <h3 className="text-[11px] font-black text-[#005f6b] uppercase tracking-widest mb-2 px-1">Medidas Estándar</h3>
              <div className="grid gap-4">
                {mattresses.map((it, i) => (
                  <div key={i} className={`flex items-center justify-between p-5 rounded-3xl border transition-all ${it.qty > 0 ? 'bg-[#E0F7F9] border-[#80d8e4] shadow-md' : 'bg-slate-50 border-slate-100'}`}>
                    <div className="flex flex-col">
                      <span className="text-[14px] font-extrabold text-slate-700">{it.w}x{it.h}x{it.t} cm</span>
                      <span className="text-[12px] font-black text-[#005f6b] mt-1">${it.unit.toFixed(2)} c/u</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <p className="text-[8px] font-bold text-slate-400 mb-1">Cant</p>
                      <input type="number" value={it.qty === 0 ? '' : it.qty} placeholder="0" onChange={e=>{let n=[...mattresses]; n[i].qty=+e.target.value; setMattresses(n)}} className="w-20 h-12 bg-white border border-slate-200 rounded-xl p-2 text-center font-black text-[#005f6b] text-lg shadow-inner outline-none focus:border-[#005f6b]" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* RESUMEN DE PRESUPUESTO - DETALLE UNIFICADO */}
        <section className="bg-[#005f6b] rounded-[2.5rem] p-8 text-white shadow-2xl mx-2 mb-12 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700"></div>
          
          <div className="mb-6 relative z-10 border-b border-[#80d8e4]/20 pb-4">
            <p className="text-[10px] font-black text-[#80d8e4] tracking-widest uppercase mb-4">Detalle de Productos</p>
            {calculation.items.length > 0 ? (
              <ul className="space-y-3">
                {calculation.items.map((item, idx) => (
                  <li key={idx} className="flex justify-between items-start gap-4">
                    <span className="text-[11px] font-bold leading-tight flex-1">
                      <span className="text-[#80d8e4] font-black mr-1">{item.qty}x</span> {item.label}
                    </span>
                    <span className="text-[11px] font-black whitespace-nowrap">${item.sub.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[11px] font-medium opacity-50 italic">Selecciona medidas y cantidades para ver el resumen...</p>
            )}
          </div>

          <div className="relative z-10">
            <p className="text-[10px] font-black text-[#80d8e4] tracking-widest uppercase mb-4">Presupuesto Total Estimado</p>
            <div className="flex items-baseline">
              <span className="text-2xl font-bold mr-1.5 opacity-60">$</span>
              <span className="text-7xl font-extrabold tracking-tighter leading-none">{calculation.total.toFixed(2).split('.')[0]}</span>
              <span className="text-3xl font-bold opacity-40 ml-1.5">.{calculation.total.toFixed(2).split('.')[1]}</span>
            </div>
          </div>
        </section>

        {/* DATOS DEL CLIENTE */}
        <div className="px-4 space-y-6 mb-16">
          <div className="relative">
            <p className="text-[9px] font-black text-white/50 uppercase tracking-widest mb-2 ml-3">Información del Cliente</p>
            <div className="space-y-4">
              <input type="text" placeholder="NOMBRE COMPLETO" value={customer.name} onChange={e=>setCustomer({...customer, name:e.target.value})} className="w-full bg-white/10 border-2 border-white/20 py-5 px-6 font-black text-white outline-none rounded-2xl placeholder:text-white/30 uppercase focus:border-white/50 transition-all" />
              <input type="tel" placeholder="TELÉFONO DE CONTACTO" value={customer.phone} onChange={e=>setCustomer({...customer, phone:e.target.value})} className="w-full bg-white/10 border-2 border-white/20 py-5 px-6 font-black text-white outline-none rounded-2xl placeholder:text-white/30 focus:border-white/50 transition-all" />
            </div>
          </div>
        </div>
      </main>

      {/* --- Modales y Botones Flotantes --- */}
      {showMicHelp && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white rounded-[3rem] p-10 max-w-sm w-full shadow-2xl space-y-6 text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Acceso Bloqueado</h3>
            <p className="text-sm text-slate-500 leading-relaxed">Para usar el asistente de voz, debes permitir el micrófono en los ajustes de tu navegador y recargar la página.</p>
            <button onClick={() => setShowMicHelp(false)} className="w-full py-5 bg-[#005f6b] text-white font-black rounded-2xl uppercase tracking-widest text-[11px] shadow-lg active:scale-95 transition-all">Entendido</button>
          </div>
        </div>
      )}

      {/* --- Botón de IA por Voz --- */}
      <div className="fixed bottom-36 right-8 z-[60]">
        <button onClick={startVoiceAssistant} className={`w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition-all duration-500 relative ${isVoiceActive ? 'bg-red-500 animate-pulse scale-110 shadow-red-500/40' : 'bg-[#005f6b] active:scale-90 shadow-cyan-900/40'}`} style={{width:'5rem',height:'5rem'}}>
          <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
          {isVoiceActive && <div className="absolute inset-0 rounded-full border-4 border-white/30 animate-ping"></div>}
        </button>
      </div>

      {/* ACCIÓN PRINCIPAL: WHATSAPP */}
      <div className="fixed bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-[#004d57] via-[#004d57]/95 to-transparent z-50">
        <button 
          onClick={sendWhatsApp} 
          disabled={calculation.total === 0} 
          className="w-full max-w-lg mx-auto h-18 rounded-[2rem] bg-white text-[#005f6b] font-black text-[12px] tracking-[0.2em] uppercase shadow-2xl disabled:opacity-20 disabled:grayscale flex items-center justify-center gap-3 transition-all active:scale-95 py-6"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.319 1.592 5.548 0 10.058-4.51 10.06-10.059 0-2.689-1.047-5.215-2.949-7.118-1.902-1.903-4.426-2.951-7.117-2.952-5.548 0-10.058 4.51-10.06 10.06-.001 2.124.599 3.956 1.676 5.319l-.994 3.635 3.705-.992l-.34-.18z"/></svg>
          ENVIAR POR WHATSAPP
        </button>
      </div>
    </div>
  );
}