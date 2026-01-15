
import React, { useState, useMemo, useEffect } from 'react';
import { FabricGroup, FoamType, CustomerData, Fabric } from './types';
import { 
  FABRIC_CATALOG,
  FOAM_MULTIPLIERS, 
  CUSHION_BASE_FACTOR,
  CUSHION_AREA_FACTOR,
  CUSHION_PREMIUM_SURCHARGE,
  FURNITURE_PREMIUM_FABRIC_ADD,
  FURNITURE_VOLUME_FACTOR,
  STANDARD_MATTRESS_PRICES,
  BUSINESS_WHATSAPP
} from './constants';

interface MultiItem {
  w: number;
  h: number;
  t: number;
  qty: number;
  fixedPrice?: number;
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'cojin' | 'mueble' | 'colchoneta'>('cojin');
  
  const [cushionItems, setCushionItems] = useState<MultiItem[]>(() => 
    Array.from({ length: 3 }, () => ({ w: 40, h: 40, t: 0, qty: 0 }))
  );
  const [seats, setSeats] = useState<MultiItem[]>(() => 
    Array.from({ length: 5 }, () => ({ w: 50, h: 50, t: 10, qty: 0 }))
  );
  const [backrests, setBackrests] = useState<MultiItem[]>(() => 
    Array.from({ length: 5 }, () => ({ w: 50, h: 40, t: 8, qty: 0 }))
  );
  const [stdMattresses, setStdMattresses] = useState<MultiItem[]>(() => 
    STANDARD_MATTRESS_PRICES.map(m => ({ ...m, qty: 0, fixedPrice: m.price }))
  );
  const [customMattresses, setCustomMattresses] = useState<MultiItem[]>(() => 
    Array.from({ length: 3 }, () => ({ w: 0, h: 0, t: 0, qty: 0 }))
  );

  const [cushionFabricGroup, setCushionFabricGroup] = useState<FabricGroup>(FabricGroup.A);
  const [muebleFabricGroup, setMuebleFabricGroup] = useState<FabricGroup>(FabricGroup.A);
  const [foamType, setFoamType] = useState<FoamType>(FoamType.STANDARD);
  const [customer, setCustomer] = useState<CustomerData>({ name: '', phone: '' });

  const calculation = useMemo(() => {
    const summaryItems: { label: string; qty: number; total: number; group?: FabricGroup; isMattress?: boolean }[] = [];
    let grandTotal = 0;

    cushionItems.forEach((item) => {
      if (item.qty > 0 && item.w > 0 && item.h > 0) {
        const area = item.w * item.h;
        let basePrice = CUSHION_BASE_FACTOR + (area * CUSHION_AREA_FACTOR);
        if (item.w >= 50 && item.h >= 50) basePrice = Math.max(basePrice, 10.00);
        const unitPrice = cushionFabricGroup === FabricGroup.B ? basePrice + CUSHION_PREMIUM_SURCHARGE : basePrice;
        const lineTotal = Number((unitPrice * item.qty).toFixed(2));
        summaryItems.push({ label: `Cojín Dec. ${item.w}x${item.h}`, qty: item.qty, total: lineTotal, group: cushionFabricGroup });
        grandTotal += lineTotal;
      }
    });

    seats.forEach((item) => {
      if (item.qty > 0 && item.w > 0 && item.h > 0 && item.t > 0) {
        const vol = item.w * item.h * item.t;
        let unitPrice = (vol * FURNITURE_VOLUME_FACTOR) * FOAM_MULTIPLIERS[foamType];
        if (muebleFabricGroup === FabricGroup.B) unitPrice += FURNITURE_PREMIUM_FABRIC_ADD;
        const lineTotal = Number((unitPrice * item.qty).toFixed(2));
        summaryItems.push({ label: `Asiento ${item.w}x${item.h}x${item.t}`, qty: item.qty, total: lineTotal, group: muebleFabricGroup });
        grandTotal += lineTotal;
      }
    });

    backrests.forEach((item) => {
      if (item.qty > 0 && item.w > 0 && item.h > 0 && item.t > 0) {
        const vol = item.w * item.h * item.t;
        let unitPrice = (vol * FURNITURE_VOLUME_FACTOR) * FOAM_MULTIPLIERS[foamType];
        if (muebleFabricGroup === FabricGroup.B) unitPrice += FURNITURE_PREMIUM_FABRIC_ADD;
        const lineTotal = Number((unitPrice * item.qty).toFixed(2));
        summaryItems.push({ label: `Espaldar ${item.w}x${item.h}x${item.t}`, qty: item.qty, total: lineTotal, group: muebleFabricGroup });
        grandTotal += lineTotal;
      }
    });

    stdMattresses.forEach((item) => {
      if (item.qty > 0 && item.fixedPrice) {
        const unitPrice = item.fixedPrice;
        const lineTotal = Number((unitPrice * item.qty).toFixed(2));
        summaryItems.push({ label: `Colchoneta Est. ${item.w}x${item.h}x${item.t}`, qty: item.qty, total: lineTotal, isMattress: true });
        grandTotal += lineTotal;
      }
    });

    customMattresses.forEach((item) => {
      if (item.qty >= 4 && item.w > 0 && item.h > 0 && item.t > 0) {
        const vol = item.w * item.h * item.t;
        const unitPrice = vol * 0.0006; 
        const lineTotal = Number((unitPrice * item.qty).toFixed(2));
        summaryItems.push({ label: `Colchoneta Mayor ${item.w}x${item.h}x${item.t}`, qty: item.qty, total: lineTotal, isMattress: true });
        grandTotal += lineTotal;
      }
    });

    return { summaryItems, grandTotal: Number(grandTotal.toFixed(2)) };
  }, [cushionItems, seats, backrests, stdMattresses, customMattresses, cushionFabricGroup, muebleFabricGroup, foamType]);

  const handleSendWhatsApp = () => {
    if (!customer.name || !customer.phone) return;
    let det = "";
    calculation.summaryItems.forEach(item => {
      const g = item.isMattress ? 'Sintético Impermeable' : (item.group === FabricGroup.B ? 'Premium' : 'Estándar');
      det += `• ${item.qty}x ${item.label} [Gama ${g}] ($${item.total.toFixed(2)})\n`;
    });
    
    const hasFurniture = seats.some(s=>s.qty>0) || backrests.some(b=>b.qty>0);
    
    let foamInfo = "";
    if (hasFurniture) foamInfo += `\n*ESPONJA MUEBLES:* ${foamType}`;
    
    const msg = `🧾 *COTIZACIÓN V1.6*\n\n*PRODUCTOS:*\n${det}${foamInfo}\n\n💰 *TOTAL: $${calculation.grandTotal.toFixed(2)}*\n\n👤 *Cliente:* ${customer.name}\n📱 *WhatsApp:* ${customer.phone}`;
    window.open(`https://wa.me/${BUSINESS_WHATSAPP}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const QuantitySelector = ({ qty, onChange }: { qty: number, onChange: (val: number) => void }) => (
    <div className={`flex p-1 rounded-xl items-center shadow-inner overflow-hidden border transition-all ${qty > 0 ? 'bg-emerald-50 border-emerald-400/50 ring-1 ring-emerald-400/20' : 'bg-slate-200/50 border-slate-200'}`}>
      <button onClick={() => onChange(Math.max(0, qty - 1))} className="w-8 h-8 flex items-center justify-center font-black bg-white rounded-lg shadow-sm text-lg active:scale-90 text-emerald-600">-</button>
      <input type="number" value={qty} onChange={(e) => onChange(Math.max(0, parseInt(e.target.value) || 0))} className="w-9 bg-transparent text-center font-black text-xs outline-none border-none text-slate-800" />
      <button onClick={() => onChange(qty + 1)} className="w-8 h-8 flex items-center justify-center font-black bg-white rounded-lg shadow-sm text-lg active:scale-90 text-emerald-600">+</button>
    </div>
  );

  const totalParts = useMemo(() => {
    const [whole, decimal] = calculation.grandTotal.toFixed(2).split('.');
    return { whole, decimal };
  }, [calculation.grandTotal]);

  return (
    <div className="min-h-screen pb-44 bg-[#F8FAFB] font-sans animate-fade-in overflow-x-hidden">
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-100 py-6 px-6 sticky top-0 z-50 shadow-sm">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-emerald-800 leading-tight">Cojines Sergio</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">v1.6 - Online</p>
            </div>
          </div>
          <div className="w-10 h-10 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-center text-emerald-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-5 pt-10 space-y-12">
        <div className="bg-white p-2 rounded-[2.5rem] border border-slate-100 flex shadow-lg overflow-x-auto no-scrollbar gap-1">
          <button onClick={() => setActiveTab('cojin')} className={`flex-shrink-0 flex-1 px-4 py-5 rounded-[2.2rem] text-[11px] font-black uppercase tracking-[0.02em] transition-all ${activeTab === 'cojin' ? 'bg-emerald-600 text-white shadow-xl scale-[1.03]' : 'text-slate-300'}`}>COJINES</button>
          <button onClick={() => setActiveTab('mueble')} className={`flex-shrink-0 flex-1 px-4 py-5 rounded-[2.2rem] text-[11px] font-black uppercase tracking-[0.02em] transition-all ${activeTab === 'mueble' ? 'bg-emerald-600 text-white shadow-xl scale-[1.03]' : 'text-slate-300'}`}>MUEBLES</button>
          <button onClick={() => setActiveTab('colchoneta')} className={`flex-shrink-0 flex-1 px-4 py-5 rounded-[2.2rem] text-[11px] font-black uppercase tracking-[0.02em] transition-all ${activeTab === 'colchoneta' ? 'bg-emerald-600 text-white shadow-xl scale-[1.03]' : 'text-slate-300'}`}>COLCHONETAS</button>
        </div>

        <section className="space-y-6">
          <label className="text-[11px] font-black uppercase text-slate-400 tracking-[0.25em] ml-4 block">1. Medidas y Cantidades (cm)</label>
          
          <div className="bg-white rounded-[3rem] p-6 shadow-xl border border-slate-50 space-y-4">
            {activeTab === 'cojin' && cushionItems.map((item, idx) => (
              <div key={idx} className={`flex items-center gap-3 p-3 rounded-[2rem] transition-all ${item.qty > 0 ? 'bg-emerald-50 ring-2 ring-emerald-500/20' : 'bg-slate-50'}`}>
                <input type="number" value={item.w} onChange={(e) => {const n = [...cushionItems]; n[idx].w = Number(e.target.value); setCushionItems(n)}} className="flex-1 w-full p-4 bg-white rounded-2xl text-center text-lg font-black outline-none border border-slate-200" placeholder="An" />
                <input type="number" value={item.h} onChange={(e) => {const n = [...cushionItems]; n[idx].h = Number(e.target.value); setCushionItems(n)}} className="flex-1 w-full p-4 bg-white rounded-2xl text-center text-lg font-black outline-none border border-slate-200" placeholder="Al" />
                <QuantitySelector qty={item.qty} onChange={(v) => {const n = [...cushionItems]; n[idx].qty = v; setCushionItems(n)}} />
              </div>
            ))}
            
            {activeTab === 'mueble' && [...seats, ...backrests].map((item, idx) => (
              <div key={idx} className={`grid grid-cols-[1fr_1fr_1fr_auto] items-center gap-2 p-3 rounded-[1.8rem] transition-all ${item.qty > 0 ? 'bg-emerald-50 ring-2 ring-emerald-500/20' : 'bg-slate-50'}`}>
                <input type="number" value={item.w} className="w-full p-3 bg-white rounded-xl text-center text-sm font-bold border border-slate-200 outline-none" placeholder="L" />
                <input type="number" value={item.h} className="w-full p-3 bg-white rounded-xl text-center text-sm font-bold border border-slate-200 outline-none" placeholder="An" />
                <input type="number" value={item.t} className="w-full p-3 bg-white rounded-xl text-center text-sm font-bold border border-slate-200 outline-none" placeholder="Es" />
                <QuantitySelector qty={item.qty} onChange={(v) => {
                  if(idx < 5) { const n = [...seats]; n[idx].qty = v; setSeats(n); }
                  else { const n = [...backrests]; n[idx-5].qty = v; setBackrests(n); }
                }} />
              </div>
            ))}

            {activeTab === 'colchoneta' && stdMattresses.map((m, i) => (
              <div key={i} className={`flex items-center justify-between p-4 rounded-3xl transition-all ${m.qty > 0 ? 'bg-emerald-50 border-emerald-500/30' : 'bg-slate-50'} border`}>
                <span className="text-sm font-black text-slate-800">{m.w}x{m.h}x{m.t}cm</span>
                <QuantitySelector qty={m.qty} onChange={(v)=>{const n=[...stdMattresses]; n[i].qty=v; setStdMattresses(n)}} />
              </div>
            ))}
          </div>
        </section>

        <section className="relative px-2">
          <div className="bg-emerald-950 rounded-[4.5rem] p-12 shadow-2xl text-white overflow-hidden relative border border-white/5">
            <div className="relative z-10 space-y-12">
              <div className="space-y-2">
                <span className="text-[11px] font-black text-emerald-400 uppercase tracking-[0.4em]">Cotización v1.6</span>
                <p className="text-3xl font-black tracking-tight uppercase leading-none">Resumen Total</p>
              </div>
              <div className="flex justify-between items-end border-t border-white/10 pt-12">
                <span className="text-[11px] font-black text-white/30 uppercase pb-6 tracking-[0.3em]">USD Total</span>
                <div className="flex items-baseline text-white">
                  <span className="text-4xl font-black text-emerald-400 mr-2">$</span>
                  <span className="text-[6.5rem] font-black tracking-tighter leading-[0.8]">{totalParts.whole}</span>
                  <span className="text-4xl font-black opacity-30 ml-2">.{totalParts.decimal}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-[3rem] p-10 shadow-xl border border-slate-50 space-y-8">
          <label className="text-[11px] font-black uppercase text-slate-400 tracking-[0.25em] ml-3 block">3. Información</label>
          <div className="space-y-5">
            <input type="text" placeholder="Tu nombre" value={customer.name} onChange={e=>setCustomer({...customer, name:e.target.value})} className="w-full p-7 bg-slate-50 rounded-[2.2rem] font-black text-lg outline-none border-2 border-transparent focus:border-emerald-600 transition-all" />
            <input type="tel" placeholder="Tu celular" value={customer.phone} onChange={e=>setCustomer({...customer, phone:e.target.value})} className="w-full p-7 bg-slate-50 rounded-[2.2rem] font-black text-lg outline-none border-2 border-transparent focus:border-emerald-600 transition-all" />
          </div>
        </section>
      </main>

      <div className="fixed bottom-0 left-0 right-0 p-8 bg-white/95 backdrop-blur-3xl border-t border-slate-100 z-[60] flex justify-center shadow-2xl">
        <button 
          onClick={handleSendWhatsApp}
          disabled={!customer.name || !customer.phone || calculation.grandTotal === 0}
          className="w-full max-w-md py-8 rounded-[3rem] bg-[#25D366] text-white font-black text-lg uppercase tracking-[0.35em] shadow-2xl active:scale-95 disabled:grayscale disabled:opacity-20 transition-all flex items-center justify-center gap-4 animate-pulse-emerald"
        >
          ENVIAR POR WHATSAPP
        </button>
      </div>
      <style>{`
        @keyframes pulse-emerald {
          0%, 100% { transform: scale(1); filter: brightness(1); }
          50% { transform: scale(1.02); filter: brightness(1.1); box-shadow: 0 0 30px rgba(37, 211, 102, 0.4); }
        }
        .animate-pulse-emerald { animation: pulse-emerald 3s infinite ease-in-out; }
      `}</style>
    </div>
  );
};

export default App;
