
import React, { useState, useMemo, useRef } from 'react';
// Import necessary types from @google/genai
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
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

// --- Audio Utility Functions for Gemini Live API ---

/**
 * Decodes a base64 string into a Uint8Array.
 */
function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Encodes a Uint8Array into a base64 string.
 */
function encodeBase64(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Decodes raw PCM audio data into an AudioBuffer for playback.
 */
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

  // Product states
  const [cushions, setCushions] = useState(() => [{ w: 45, h: 45, qty: 0 }]);
  const [seats, setSeats] = useState(() => [{ w: 50, h: 50, t: 10, qty: 0 }]);
  const [backrests, setBackrests] = useState(() => [{ w: 50, h: 40, t: 8, qty: 0 }]);
  const [mattresses, setMattresses] = useState(() => STANDARD_MATTRESS_PRICES.map(m => ({ ...m, qty: 0 })));

  // Configuration states
  const [cushionsFabricGroup, setCushionsFabricGroup] = useState<FabricGroup>(FabricGroup.A);
  const [furnitureFoamType, setFurnitureFoamType] = useState<FoamType>(FoamType.STANDARD);
  const [furnitureFabricGroup, setFurnitureFabricGroup] = useState<FabricGroup>(FabricGroup.A);

  // References for Gemini Live API
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<{ input: AudioContext; output: AudioContext } | null>(null);
  const nextStartTimeRef = useRef(0);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const micStreamRef = useRef<MediaStream | null>(null);

  /**
   * Adds a new row for input fields.
   */
  const addRow = (type: 'cushion' | 'seat' | 'backrest') => {
    if (type === 'cushion') setCushions(prev => [...prev, { w: 45, h: 45, qty: 0 }]);
    if (type === 'seat') setSeats(prev => [...prev, { w: 50, h: 50, t: 10, qty: 0 }]);
    if (type === 'backrest') setBackrests(prev => [...prev, { w: 50, h: 40, t: 8, qty: 0 }]);
  };

  /**
   * Main calculation logic for the quote.
   */
  const calculation = useMemo(() => {
    let items: any[] = [];
    let grandTotal = 0;

    cushions.forEach(it => {
      if (it.qty > 0 && it.w > 0 && it.h > 0) {
        let area = it.w * it.h;
        let base = CUSHION_BASE_FACTOR + (area * CUSHION_AREA_FACTOR);
        if (it.w >= 50 && it.h >= 50) base = Math.max(base, 10.00);
        let unit = cushionsFabricGroup === FabricGroup.B ? base + CUSHION_PREMIUM_SURCHARGE : base;
        items.push({ label: `Cojín ${it.w}x${it.h} (${cushionsFabricGroup === FabricGroup.A ? 'Tapiz Estándar' : 'Tapiz Premium'})`, qty: it.qty, sub: unit * it.qty });
        grandTotal += unit * it.qty;
      }
    });

    const processFurniture = (list: any[], name: string) => {
      list.forEach(it => {
        if (it.qty > 0 && it.w > 0 && it.h > 0 && it.t > 0) {
          let vol = it.w * it.h * it.t;
          let base = (vol * FURNITURE_VOLUME_FACTOR) * FOAM_MULTIPLIERS[furnitureFoamType];
          let unit = base + (furnitureFabricGroup === FabricGroup.B ? FURNITURE_PREMIUM_FABRIC_ADD : 0);
          items.push({ label: `${name} ${it.w}x${it.h}x${it.t} (Esp. ${furnitureFoamType} / ${furnitureFabricGroup === FabricGroup.A ? 'Tela Estándar' : 'Tela Premium'})`, qty: it.qty, sub: unit * it.qty });
          grandTotal += unit * it.qty;
        }
      });
    };
    processFurniture(seats, "Asiento");
    processFurniture(backrests, "Espaldar");

    mattresses.forEach(it => {
      if (it.qty > 0) {
        const sub = it.unit * it.qty;
        items.push({ label: `Colchoneta ${it.w}x${it.h}x${it.t}`, qty: it.qty, sub });
        grandTotal += sub;
      }
    });

    return { items, total: grandTotal };
  }, [cushions, seats, backrests, mattresses, cushionsFabricGroup, furnitureFoamType, furnitureFabricGroup]);

  // FIX: Added missing stopVoiceAssistant function to clean up resources
  const stopVoiceAssistant = () => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }
    activeSourcesRef.current.forEach(s => {
      try { s.stop(); } catch (e) {}
    });
    activeSourcesRef.current.clear();
    setIsVoiceActive(false);
  };

  /**
   * Starts the Gemini Live Assistant session.
   */
  const startVoiceAssistant = async () => {
    if (isVoiceActive) {
      stopVoiceAssistant();
      return;
    }

    try {
      if (!window.isSecureContext && window.location.hostname !== 'localhost') {
        alert("¡Error de seguridad! El micrófono solo funciona en sitios con HTTPS.");
        return;
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("API de micrófono no disponible.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      
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
              
              // Rely on sessionPromise to send data to avoid race conditions
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
            if (msg.serverContent?.interrupted) {
              activeSourcesRef.current.forEach(s => {
                try { s.stop(); } catch (e) {}
              });
              activeSourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e) => {
            console.error(e);
            stopVoiceAssistant();
          },
          onclose: () => {
            setIsVoiceActive(false);
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }
          },
          systemInstruction: 'Eres un asistente experto en cotizaciones de tapicería. Ayuda al usuario con precios de cojines, asientos y colchonetas según sus medidas.'
        }
      });

      sessionPromise.then(s => sessionRef.current = s);

    } catch (err) {
      console.error(err);
      alert("Error iniciando asistente de voz.");
    }
  };

  /**
   * Generates a WhatsApp message with the quote details.
   */
  const handleWhatsApp = () => {
    let text = `Hola, mi nombre es ${customer.name || 'Cliente'}. Deseo cotizar:\n\n`;
    calculation.items.forEach(it => {
      text += `- ${it.label} x${it.qty}: $${it.sub.toFixed(2)}\n`;
    });
    text += `\n*TOTAL: $${calculation.total.toFixed(2)}*`;
    window.open(`https://wa.me/${BUSINESS_WHATSAPP}?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-gray-100">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cotizador Tapicería</h1>
            <p className="text-gray-500 text-sm">Calcula el valor de tus proyectos a medida</p>
          </div>
          
          <button
            onClick={startVoiceAssistant}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-medium transition-all ${
              isVoiceActive 
              ? 'bg-red-100 text-red-600 animate-pulse border border-red-200' 
              : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100'
            }`}
          >
            {isVoiceActive ? (
              <><span className="w-2 h-2 bg-red-600 rounded-full"></span> Escuchando...</>
            ) : (
              <><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/></svg> Asistente AI</>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Main Configuration Section */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="flex border-b">
                <button onClick={() => setActiveTab('cushion')} className={`flex-1 py-4 px-2 text-sm font-semibold ${activeTab === 'cushion' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30' : 'text-gray-500 hover:bg-gray-50'}`}>Cojines</button>
                <button onClick={() => setActiveTab('mueble')} className={`flex-1 py-4 px-2 text-sm font-semibold ${activeTab === 'mueble' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30' : 'text-gray-500 hover:bg-gray-50'}`}>Asientos/Espaldar</button>
                <button onClick={() => setActiveTab('mattress')} className={`flex-1 py-4 px-2 text-sm font-semibold ${activeTab === 'mattress' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30' : 'text-gray-500 hover:bg-gray-50'}`}>Colchonetas</button>
              </div>

              <div className="p-6">
                {activeTab === 'cushion' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-lg">Cojines Decorativos</h3>
                      <select 
                        value={cushionsFabricGroup} 
                        onChange={(e) => setCushionsFabricGroup(e.target.value as FabricGroup)}
                        className="text-sm border rounded-lg px-2 py-1 bg-gray-50"
                      >
                        <option value={FabricGroup.A}>Tapiz Estándar (A)</option>
                        <option value={FabricGroup.B}>Tapiz Premium (B)</option>
                      </select>
                    </div>
                    {cushions.map((it, idx) => (
                      <div key={idx} className="grid grid-cols-3 gap-2">
                        <input type="number" placeholder="Ancho" value={it.w || ''} onChange={e => { const n = [...cushions]; n[idx].w = +e.target.value; setCushions(n); }} className="border rounded-lg p-2 text-sm focus:ring-1 focus:ring-indigo-500" />
                        <input type="number" placeholder="Alto" value={it.h || ''} onChange={e => { const n = [...cushions]; n[idx].h = +e.target.value; setCushions(n); }} className="border rounded-lg p-2 text-sm focus:ring-1 focus:ring-indigo-500" />
                        <input type="number" placeholder="Cant." value={it.qty || ''} onChange={e => { const n = [...cushions]; n[idx].qty = +e.target.value; setCushions(n); }} className="border rounded-lg p-2 text-sm bg-indigo-50 border-indigo-100" />
                      </div>
                    ))}
                    <button onClick={() => addRow('cushion')} className="text-indigo-600 text-sm font-semibold hover:underline">+ Agregar otro cojín</button>
                  </div>
                )}

                {activeTab === 'mueble' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl">
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Espuma</label>
                        <select value={furnitureFoamType} onChange={e => setFurnitureFoamType(e.target.value as FoamType)} className="w-full border rounded-lg p-2 text-sm">
                          <option value={FoamType.ECONOMY}>Básica</option>
                          <option value={FoamType.STANDARD}>Estándar</option>
                          <option value={FoamType.PREMIUM}>Premium</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Tela</label>
                        <select value={furnitureFabricGroup} onChange={e => setFurnitureFabricGroup(e.target.value as FabricGroup)} className="w-full border rounded-lg p-2 text-sm">
                          <option value={FabricGroup.A}>Estándar (A)</option>
                          <option value={FabricGroup.B}>Premium (B)</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-bold text-sm text-gray-600">Asientos</h4>
                      {seats.map((it, idx) => (
                        <div key={idx} className="grid grid-cols-4 gap-2">
                          <input type="number" placeholder="An" value={it.w || ''} onChange={e => { const n = [...seats]; n[idx].w = +e.target.value; setSeats(n); }} className="border rounded-lg p-2 text-xs" />
                          <input type="number" placeholder="Al" value={it.h || ''} onChange={e => { const n = [...seats]; n[idx].h = +e.target.value; setSeats(n); }} className="border rounded-lg p-2 text-xs" />
                          <input type="number" placeholder="Gr" value={it.t || ''} onChange={e => { const n = [...seats]; n[idx].t = +e.target.value; setSeats(n); }} className="border rounded-lg p-2 text-xs" />
                          <input type="number" placeholder="Cant" value={it.qty || ''} onChange={e => { const n = [...seats]; n[idx].qty = +e.target.value; setSeats(n); }} className="border rounded-lg p-2 text-xs bg-indigo-50" />
                        </div>
                      ))}
                      <button onClick={() => addRow('seat')} className="text-indigo-600 text-sm font-semibold">+ Agregar Asiento</button>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-bold text-sm text-gray-600">Espaldares</h4>
                      {backrests.map((it, idx) => (
                        <div key={idx} className="grid grid-cols-4 gap-2">
                          <input type="number" placeholder="An" value={it.w || ''} onChange={e => { const n = [...backrests]; n[idx].w = +e.target.value; setBackrests(n); }} className="border rounded-lg p-2 text-xs" />
                          <input type="number" placeholder="Al" value={it.h || ''} onChange={e => { const n = [...backrests]; n[idx].h = +e.target.value; setBackrests(n); }} className="border rounded-lg p-2 text-xs" />
                          <input type="number" placeholder="Gr" value={it.t || ''} onChange={e => { const n = [...backrests]; n[idx].t = +e.target.value; setBackrests(n); }} className="border rounded-lg p-2 text-xs" />
                          <input type="number" placeholder="Cant" value={it.qty || ''} onChange={e => { const n = [...backrests]; n[idx].qty = +e.target.value; setBackrests(n); }} className="border rounded-lg p-2 text-xs bg-indigo-50" />
                        </div>
                      ))}
                      <button onClick={() => addRow('backrest')} className="text-indigo-600 text-sm font-semibold">+ Agregar Espaldar</button>
                    </div>
                  </div>
                )}

                {activeTab === 'mattress' && (
                  <div className="space-y-4">
                    <h3 className="font-bold text-lg mb-4">Colchonetas Estándar</h3>
                    <div className="divide-y border rounded-xl overflow-hidden">
                      {mattresses.map((it, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{it.w}x{it.h}x{it.t} cm</p>
                            <p className="text-xs text-indigo-600 font-bold">${it.unit.toFixed(2)} c/u</p>
                          </div>
                          <input 
                            type="number" 
                            min="0" 
                            value={it.qty || ''} 
                            onChange={e => { const n = [...mattresses]; n[idx].qty = +e.target.value; setMattresses(n); }} 
                            placeholder="0"
                            className="w-20 border rounded-lg p-2 text-center text-sm bg-indigo-50 border-indigo-100" 
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar Section */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
              <h3 className="font-bold text-gray-900">Contacto</h3>
              <input type="text" placeholder="Nombre" value={customer.name} onChange={e => setCustomer({...customer, name: e.target.value})} className="w-full border rounded-lg p-2.5 text-sm" />
              <input type="tel" placeholder="WhatsApp" value={customer.phone} onChange={e => setCustomer({...customer, phone: e.target.value})} className="w-full border rounded-lg p-2.5 text-sm" />
            </div>

            <div className="bg-gray-900 text-white rounded-2xl shadow-xl p-6 space-y-4">
              <h3 className="font-bold text-lg">Resumen</h3>
              <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                {calculation.items.length === 0 ? (
                  <p className="text-gray-500 text-sm italic">Agrega productos para cotizar...</p>
                ) : (
                  calculation.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between text-xs border-b border-gray-800 pb-2">
                      <span className="flex-1 pr-2">{it.label} (x{it.qty})</span>
                      <span className="font-mono text-indigo-400">${it.sub.toFixed(2)}</span>
                    </div>
                  ))
                )}
              </div>
              
              <div className="pt-4 border-t border-gray-800">
                <div className="flex justify-between items-end mb-6">
                  <span className="text-sm text-gray-400">Total</span>
                  <span className="text-3xl font-bold text-white">${calculation.total.toFixed(2)}</span>
                </div>
                
                <button 
                  onClick={handleWhatsApp}
                  disabled={calculation.total === 0}
                  className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-900/20"
                >
                  Confirmar WhatsApp
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #374151; border-radius: 10px; }
      `}</style>
    </div>
  );
}
