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
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);

  // Estados de productos
  const [cushions, setCushions] = useState(() => [{ w: 45, h: 45, qty: 0 }]);
  const [seats, setSeats] = useState(() => [{ w: 50, h: 50, t: 10, qty: 0 }]);
  const [backrests, setBackrests] = useState(() => [{ w: 50, h: 40, t: 8, qty: 0 }]);
  const [mattresses, setMattresses] = useState(() => STANDARD_MATTRESS_PRICES.map(m => ({ ...m, qty: 0 })));

  // Estados de configuración
  const [cushionsFabricGroup, setCushionsFabricGroup] = useState<FabricGroup>(FabricGroup.A);
  const [furnitureFoamType, setFurnitureFoamType] = useState<FoamType>(FoamType.STANDARD);
  const [furnitureFabricGroup, setFurnitureFabricGroup] = useState<FabricGroup>(FabricGroup.A);

  const performReset = () => {
    // Forzamos el reset de todos los arreglos a sus valores iniciales con qty: 0
    setCushions([{ w: 45, h: 45, qty: 0 }]);
    setSeats([{ w: 50, h: 50, t: 10, qty: 0 }]);
    setBackrests([{ w: 50, h: 40, t: 8, qty: 0 }]);
    setMattresses(STANDARD_MATTRESS_PRICES.map(m => ({ ...m, qty: 0 })));
    setCushionsFabricGroup(FabricGroup.A);
    setFurnitureFoamType(FoamType.STANDARD);
    setFurnitureFabricGroup(FabricGroup.A);
    setIsConfirmingReset(false);
  };

  const handleResetClick = () => {
    if (!isConfirmingReset) {
      setIsConfirmingReset(true);
      setTimeout(() => setIsConfirmingReset(false), 4000); // Cancela confirmación tras 4s
    } else {
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

    seats.forEach(it => {
      if (it.qty > 0 && it.w > 0 && it.h > 0 && it.t > 0) {
        let vol = it.w * it.h * it.t;
        let base = (vol * FURNITURE_VOLUME_FACTOR) * FOAM_MULTIPLIERS[furnitureFoamType];
        let unit = base + (furnitureFabricGroup === FabricGroup.B ? FURNITURE_PREMIUM_FABRIC_ADD : 0);
        items.push({ label: `Asiento ${it.w}x${it.h}x${it.t} (${furnitureFoamType}/${furnitureFabricGroup === FabricGroup.A ? 'Estándar' : 'Premium'})`, qty: it.qty, sub: unit * it.qty });
        grandTotal += unit * it.qty;
      }
    });

    backrests.forEach(it => {
      if (it.qty > 0 && it.w > 0 && it.h > 0 && it.t > 0) {
        let vol = it.w * it.h * it.t;
        let base = (vol * FURNITURE_VOLUME_FACTOR) * FOAM_MULTIPLIERS[furnitureFoamType];
        let unit = base + (furnitureFabricGroup === FabricGroup.B ? FURNITURE_PREMIUM_FABRIC_ADD : 0);
        items.push({ label: `Espaldar ${it.w}x${it.h}x${it.t} (${furnitureFoamType}/${furnitureFabricGroup === FabricGroup.A ? 'Estándar' : 'Premium'})`, qty: it.qty, sub: unit * it.qty });
        grandTotal += unit * it.qty;
      }
    });

    mattresses.forEach(it => {
      if (it.qty > 0) {
        const sub = it.unit * it.qty;
        items.push({ label: `Colchoneta ${it.w}x${it.h}x${it.t}`, qty: it.qty, sub });
        grandTotal += sub;
      }
    });

    return { items, total: grandTotal };
  }, [cushions, seats, backrests, mattresses, cushionsFabricGroup, furnitureFoamType, furnitureFabricGroup]);

  const sendWhatsApp = () => {
    let msg = `🧾 *COTIZACIÓN - COJINES SERGIO*\n\n*DETALLE:*\n${calculation.items.map(i => `• ${i.qty}x ${i.label} -> $${i.sub.toFixed(2)}`).join('\n')}\n\n💰 *TOTAL: $${calculation.total.toFixed(2)}*`;
    window.open(`https://wa.me/${BUSINESS_WHATSAPP}?text=${encodeURIComponent(msg)}`);
  };

  return (
    <div className="min-h-screen pb-40">
      <header className="px-8 pt-10 pb-12 flex flex-col items-center">
        <h1 className="text-[28px] font-extrabold text-white drop-shadow-xl text-center">Cojines Sergio</h1>
        <p className="text-[10px] font-bold text-white/70 tracking-widest uppercase mt-1">Taller de Tapicería</p>
      </header>

      <main className="max-w-xl mx-auto px-4">
        {/* Navegación por Pestañas */}
        <nav className="flex bg-white/10 backdrop-blur-md p-1 rounded-[2.5rem] mb-6 border border-white/20 sticky top-4 z-40 shadow-xl">
          {['cojin', 'mueble', 'colchoneta'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-4 rounded-[2rem] text-[9px] font-black transition-all uppercase ${activeTab === tab ? 'bg-white text-[#005f6b] shadow-md scale-100' : 'text-white/60'}`}>
              {tab === 'mueble' ? 'ASIENTOS/ESP' : tab === 'cojin' ? 'COJINES' : tab}
            </button>
          ))}
        </nav>

        {/* Botón de Limpiar */}
        <div className="flex justify-end mb-6 px-1">
          <button 
            type="button"
            onClick={handleResetClick}
            className={`flex items-center gap-2 py-3 px-6 rounded-full border transition-all shadow-lg ${isConfirmingReset ? 'bg-red-500 text-white border-red-400 animate-pulse' : 'bg-red-500/10 text-red-200 border-red-500/20'}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            <span className="text-[10px] font-black uppercase tracking-widest">
              {isConfirmingReset ? '¿CONFIRMAR BORRADO?' : 'Limpiar Cotización'}
            </span>
          </button>
        </div>

        <section className="glass-card rounded-[2.5rem] p-6 shadow-2xl mb-10">
          
          {/* COJINES */}
          {activeTab === 'cojin' && (
            <div className="space-y-6">
              <div className="bg-slate-50 p-4 rounded-[2rem] border border-slate-100 mb-4">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-2 text-center">Seleccionar Tipo de Tela</p>
                <div className="flex gap-2">
                  <button onClick={() => setCushionsFabricGroup(FabricGroup.A)} className={`flex-1 py-3 rounded-2xl text-[10px] font-black transition-all ${cushionsFabricGroup === FabricGroup.A ? 'bg-[#005f6b] text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200'}`}>ESTÁNDAR</button>
                  <button onClick={() => setCushionsFabricGroup(FabricGroup.B)} className={`flex-1 py-3 rounded-2xl text-[10px] font-black transition-all ${cushionsFabricGroup === FabricGroup.B ? 'bg-[#005f6b] text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200'}`}>PREMIUM</button>
                </div>
              </div>

              <h3 className="text-[11px] font-black text-[#005f6b] uppercase tracking-widest px-1">Medidas de Cojines</h3>
              {cushions.map((it, i) => (
                <div key={i} className={`p-4 rounded-3xl border transition-all ${it.qty > 0 ? 'bg-[#E0F7F9] border-[#80d8e4]' : 'bg-white border-slate-100'}`}>
                  <div className="flex gap-2">
                    <div className="flex-1"><p className="text-[8px] font-bold text-slate-400 mb-1">Ancho</p><input type="number" value={it.w || ''} placeholder="45" onChange={e=>{let n=[...cushions]; n[i].w=+e.target.value; setCushions(n)}} className="w-full h-12 bg-white border border-slate-200 rounded-xl text-center font-bold outline-none" /></div>
                    <div className="flex-1"><p className="text-[8px] font-bold text-slate-400 mb-1">Alto</p><input type="number" value={it.h || ''} placeholder="45" onChange={e=>{let n=[...cushions]; n[i].h=+e.target.value; setCushions(n)}} className="w-full h-12 bg-white border border-slate-200 rounded-xl text-center font-bold outline-none" /></div>
                    <div className="w-20"><p className="text-[8px] font-bold text-slate-400 mb-1">Cant</p><input type="number" value={it.qty === 0 ? '' : it.qty} placeholder="0" onChange={e=>{let n=[...cushions]; n[i].qty=+e.target.value; setCushions(n)}} className="w-full h-12 bg-white border border-[#005f6b] rounded-xl text-center font-black text-[#005f6b] text-lg outline-none shadow-sm" /></div>
                  </div>
                </div>
              ))}
              <button onClick={() => addRow('cushion')} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:border-[#005f6b] transition-all">+ Agregar Fila de Cojín</button>
            </div>
          )}

          {/* MUEBLES: ASIENTOS Y ESPALDARES */}
          {activeTab === 'mueble' && (
            <div className="space-y-10">
              {/* Selectores de Calidad Muebles */}
              <div className="grid grid-cols-1 gap-4 mb-4">
                <div className="bg-slate-50 p-4 rounded-[2rem] border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-2 text-center">Calidad de Esponja</p>
                  <div className="flex gap-1.5">
                    {[FoamType.ECONOMY, FoamType.STANDARD, FoamType.PREMIUM].map((type) => (
                      <button key={type} onClick={() => setFurnitureFoamType(type)} className={`flex-1 py-3 rounded-xl text-[8px] font-black transition-all ${furnitureFoamType === type ? 'bg-[#005f6b] text-white shadow-md' : 'bg-white text-slate-400 border border-slate-200'}`}>
                        {type.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="bg-slate-50 p-4 rounded-[2rem] border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-2 text-center">Calidad de Tela</p>
                  <div className="flex gap-2">
                    <button onClick={() => setFurnitureFabricGroup(FabricGroup.A)} className={`flex-1 py-3 rounded-xl text-[9px] font-black transition-all ${furnitureFabricGroup === FabricGroup.A ? 'bg-[#005f6b] text-white shadow-md' : 'bg-white text-slate-400 border border-slate-200'}`}>ESTÁNDAR</button>
                    <button onClick={() => setFurnitureFabricGroup(FabricGroup.B)} className={`flex-1 py-3 rounded-xl text-[9px] font-black transition-all ${furnitureFabricGroup === FabricGroup.B ? 'bg-[#005f6b] text-white shadow-md' : 'bg-white text-slate-400 border border-slate-200'}`}>PREMIUM</button>
                  </div>
                </div>
              </div>

              {/* Asientos */}
              <div className="space-y-6">
                <h3 className="text-[11px] font-black text-[#005f6b] uppercase tracking-widest px-1">Asientos</h3>
                {seats.map((it, i) => (
                  <div key={i} className={`p-4 rounded-3xl border transition-all ${it.qty > 0 ? 'bg-[#E0F7F9] border-[#80d8e4]' : 'bg-white border-slate-100'}`}>
                    <div className="grid grid-cols-4 gap-2">
                      <div><p className="text-[8px] font-bold text-slate-400 mb-1 text-center">L</p><input type="number" value={it.w || ''} onChange={e=>{let n=[...seats]; n[i].w=+e.target.value; setSeats(n)}} className="w-full h-12 bg-white border border-slate-100 rounded-xl text-center font-bold outline-none" /></div>
                      <div><p className="text-[8px] font-bold text-slate-400 mb-1 text-center">An</p><input type="number" value={it.h || ''} onChange={e=>{let n=[...seats]; n[i].h=+e.target.value; setSeats(n)}} className="w-full h-12 bg-white border border-slate-100 rounded-xl text-center font-bold outline-none" /></div>
                      <div><p className="text-[8px] font-bold text-slate-400 mb-1 text-center">Es</p><input type="number" value={it.t || ''} onChange={e=>{let n=[...seats]; n[i].t=+e.target.value; setSeats(n)}} className="w-full h-12 bg-white border border-slate-100 rounded-xl text-center font-bold outline-none" /></div>
                      <div><p className="text-[8px] font-bold text-slate-400 mb-1 text-center">Cant</p><input type="number" value={it.qty === 0 ? '' : it.qty} placeholder="0" onChange={e=>{let n=[...seats]; n[i].qty=+e.target.value; setSeats(n)}} className="w-full h-12 bg-white border border-[#005f6b] rounded-xl text-center font-black text-[#005f6b] outline-none" /></div>
                    </div>
                  </div>
                ))}
                <button onClick={() => addRow('seat')} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:border-[#005f6b] transition-all">+ Agregar Asiento</button>
              </div>

              {/* Espaldares */}
              <div className="space-y-6 pt-6 border-t border-slate-100">
                <h3 className="text-[11px] font-black text-[#005f6b] uppercase tracking-widest px-1">Espaldares</h3>
                {backrests.map((it, i) => (
                  <div key={i} className={`p-4 rounded-3xl border transition-all ${it.qty > 0 ? 'bg-[#E0F7F9] border-[#80d8e4]' : 'bg-white border-slate-100'}`}>
                    <div className="grid grid-cols-4 gap-2">
                      <div><p className="text-[8px] font-bold text-slate-400 mb-1 text-center">L</p><input type="number" value={it.w || ''} onChange={e=>{let n=[...backrests]; n[i].w=+e.target.value; setBackrests(n)}} className="w-full h-12 bg-white border border-slate-100 rounded-xl text-center font-bold outline-none" /></div>
                      <div><p className="text-[8px] font-bold text-slate-400 mb-1 text-center">An</p><input type="number" value={it.h || ''} onChange={e=>{let n=[...backrests]; n[i].h=+e.target.value; setBackrests(n)}} className="w-full h-12 bg-white border border-slate-100 rounded-xl text-center font-bold outline-none" /></div>
                      <div><p className="text-[8px] font-bold text-slate-400 mb-1 text-center">Es</p><input type="number" value={it.t || ''} onChange={e=>{let n=[...backrests]; n[i].t=+e.target.value; setBackrests(n)}} className="w-full h-12 bg-white border border-slate-100 rounded-xl text-center font-bold outline-none" /></div>
                      <div><p className="text-[8px] font-bold text-slate-400 mb-1 text-center">Cant</p><input type="number" value={it.qty === 0 ? '' : it.qty} placeholder="0" onChange={e=>{let n=[...backrests]; n[i].qty=+e.target.value; setBackrests(n)}} className="w-full h-12 bg-white border border-[#005f6b] rounded-xl text-center font-black text-[#005f6b] outline-none" /></div>
                    </div>
                  </div>
                ))}
                <button onClick={() => addRow('backrest')} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:border-[#005f6b] transition-all">+ Agregar Espaldar</button>
              </div>
            </div>
          )}

          {/* COLCHONETAS */}
          {activeTab === 'colchoneta' && (
            <div className="space-y-4">
              <h3 className="text-[11px] font-black text-[#005f6b] uppercase tracking-widest px-1">Medidas Estándar</h3>
              {mattresses.map((it, i) => (
                <div key={i} className={`flex items-center justify-between p-4 rounded-3xl border transition-all ${it.qty > 0 ? 'bg-[#E0F7F9] border-[#80d8e4]' : 'bg-white border-slate-100'}`}>
                  <div>
                    <span className="block text-[13px] font-extrabold text-slate-700">{it.w}x{it.h}x{it.t} cm</span>
                    <span className="text-[11px] font-bold text-[#005f6b] opacity-80">${it.unit.toFixed(2)} c/u</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <p className="text-[8px] font-bold text-slate-400 mb-1">Cant</p>
                    <input type="number" value={it.qty === 0 ? '' : it.qty} placeholder="0" onChange={e=>{let n=[...mattresses]; n[i].qty=+e.target.value; setMattresses(n)}} className="w-20 h-12 bg-white border border-slate-200 rounded-xl text-center font-black text-[#005f6b] outline-none shadow-sm" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* RESUMEN DE COTIZACIÓN */}
        <section className="bg-[#005f6b] rounded-[2.5rem] p-8 text-white shadow-2xl mx-1 mb-12">
          <p className="text-[10px] font-black text-[#80d8e4] tracking-widest uppercase mb-6 border-b border-white/10 pb-2">Detalle Presupuestado</p>
          {calculation.items.length > 0 ? (
            <ul className="space-y-3 mb-8">
              {calculation.items.map((item, idx) => (
                <li key={idx} className="flex justify-between items-start gap-4 animate-fadeIn">
                  <span className="text-[11px] font-bold flex-1"><span className="text-[#80d8e4] mr-1">{item.qty}x</span> {item.label}</span>
                  <span className="text-[11px] font-black">${item.sub.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[11px] font-medium opacity-50 italic mb-8">No hay productos seleccionados.</p>
          )}

          <div>
            <p className="text-[10px] font-black text-[#80d8e4] tracking-widest uppercase mb-2">Total Estimado</p>
            <div className="flex items-baseline">
              <span className="text-2xl font-bold opacity-60 mr-1">$</span>
              <span className="text-6xl font-extrabold tracking-tighter leading-none">{calculation.total.toFixed(2).split('.')[0]}</span>
              <span className="text-2xl font-bold opacity-40 ml-1">.{calculation.total.toFixed(2).split('.')[1]}</span>
            </div>
          </div>
        </section>
      </main>

      {/* Botón Flotante WhatsApp */}
      <div className="fixed bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-[#004d57] to-transparent z-50">
        <button 
          onClick={sendWhatsApp} 
          disabled={calculation.total === 0} 
          className="w-full max-w-lg mx-auto h-20 rounded-[2rem] bg-white text-[#005f6b] font-black text-[12px] tracking-widest uppercase shadow-2xl disabled:opacity-30 active:scale-95 transition-all flex items-center justify-center gap-3"
        >
          ENVIAR A WHATSAPP
        </button>
      </div>
    </div>
  );
}