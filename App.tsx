
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
  const [allFabrics, setAllFabrics] = useState<Record<FabricGroup, Fabric[]>>(FABRIC_CATALOG);
  const [activeTab, setActiveTab] = useState<'cojin' | 'mueble' | 'colchoneta'>('cojin');
  
  useEffect(() => {
    const saved = localStorage.getItem('sergio_fabrics_v3');
    if (saved) {
      try { setAllFabrics(JSON.parse(saved)); } catch (e) { console.error(e); }
    }
  }, []);

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
    const hasMattress = stdMattresses.some(m=>m.qty>0) || customMattresses.some(m=>m.qty>=4);
    
    let foamInfo = "";
    if (hasFurniture) foamInfo += `\n*ESPONJA MUEBLES:* ${foamType}`;
    if (hasMattress) foamInfo += `\n*ESPONJA COLCHONETAS:* Premium`;
    
    const msg = `🧾 *COTIZACIÓN ESTIMADA*\n\n*PRODUCTOS:*\n${det}${foamInfo}\n\n💰 *TOTAL: $${calculation.grandTotal.toFixed(2)}*\n\n👤 *Cliente:* ${customer.name}\n📱 *WhatsApp:* ${customer.phone}`;
    window.open(`https://wa.me/${BUSINESS_WHATSAPP}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const QuantitySelector = ({ qty, onChange }: { qty: number, onChange: (val: number) => void }) => (
    <div className={`flex p-1 rounded-xl items-center shadow-inner overflow-hidden border transition-all ${qty > 0 ? 'bg-[#005F6B]/10 border-[#005F6B]/40 ring-1 ring-[#005F6B]/20' : 'bg-slate-200/50 border-slate-200'}`}>
      <button onClick={() => onChange(Math.max(0, qty - 1))} className="w-8 h-8 flex items-center justify-center font-black bg-white rounded-lg shadow-sm text-lg active:scale-90 text-[#005F6B]">-</button>
      <input type="number" value={qty} onChange={(e) => onChange(Math.max(0, parseInt(e.target.value) || 0))} className="w-9 bg-transparent text-center font-black text-xs outline-none border-none text-slate-800" />
      <button onClick={() => onChange(qty + 1)} className="w-8 h-8 flex items-center justify-center font-black bg-white rounded-lg shadow-sm text-lg active:scale-90 text-[#005F6B]">+</button>
    </div>
  );

  const totalParts = useMemo(() => {
    const [whole, decimal] = calculation.grandTotal.toFixed(2).split('.');
    return { whole, decimal };
  }, [calculation.grandTotal]);

  return (
    <div className="min-h-screen pb-44 bg-[#F8FAFB] font-sans animate-fade-in overflow-x-hidden">
      <header className="bg-white border-b border-slate-100 py-6 px-6 sticky top-0 z-50 shadow-sm">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-[#005F6B] leading-tight">Cojines Sergio</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="w-2 h-2 bg-teal-500 rounded-full animate-pulse"></span>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">v1.3 - Conexión Activa</p>
            </div>
          </div>
          <div className="w-10 h-10 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center text-[#005F6B]">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-5 pt-10 space-y-12">
        <div className="bg-white p-2 rounded-[2.5rem] border border-slate-100 flex shadow-lg overflow-x-auto no-scrollbar gap-1">
          <button onClick={() => setActiveTab('cojin')} className={`flex-shrink-0 flex-1 px-4 py-5 rounded-[2.2rem] text-[12px] font-black uppercase tracking-[0.02em] leading-tight transition-all ${activeTab === 'cojin' ? 'bg-[#005F6B] text-white shadow-xl scale-[1.03]' : 'text-slate-300'}`}>COJINES<br/>DECORATIVOS</button>
          <button onClick={() => setActiveTab('mueble')} className={`flex-shrink-0 flex-1 px-4 py-5 rounded-[2.2rem] text-[12px] font-black uppercase tracking-[0.02em] leading-tight transition-all ${activeTab === 'mueble' ? 'bg-[#005F6B] text-white shadow-xl scale-[1.03]' : 'text-slate-300'}`}>ASIENTOS Y<br/>ESPALDARES</button>
          <button onClick={() => setActiveTab('colchoneta')} className={`flex-shrink-0 flex-1 px-4 py-5 rounded-[2.2rem] text-[12px] font-black uppercase tracking-[0.02em] leading-tight transition-all ${activeTab === 'colchoneta' ? 'bg-[#005F6B] text-white shadow-xl scale-[1.03]' : 'text-slate-300'}`}>COLCHONETAS</button>
        </div>

        {/* ... resto del código sin cambios ... */}
        
        <section className="relative px-2">
          <div className="bg-[#020617] rounded-[4.5rem] p-12 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.5)] text-white overflow-hidden relative border border-white/5">
            <div className="relative z-10 space-y-12">
              <div className="space-y-2">
                <span className="text-[11px] font-black text-teal-400 uppercase tracking-[0.4em] opacity-80">Resumen v1.3</span>
                <p className="text-3xl font-black tracking-tight uppercase leading-none">
                  {activeTab === 'cojin' ? 'COJINES DECORATIVOS' : activeTab === 'mueble' ? 'ASIENTOS Y ESPALDARES' : 'COLCHONETAS'}
                </p>
                <span className="text-[10px] text-white/40 uppercase font-bold tracking-widest">
                  Cotización en tiempo real
                </span>
              </div>
              
              <div className="space-y-6 border-t border-white/10 pt-10">
                {calculation.summaryItems.length > 0 ? (
                  calculation.summaryItems.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center animate-fade-in" style={{animationDelay: `${idx*0.1}s`}}>
                      <div className="flex flex-col gap-1">
                        <span className="text-lg font-black text-white/95 leading-none">{item.label}</span>
                        <span className="text-[10px] text-white/30 uppercase font-black tracking-widest">
                          {item.qty} pzas • {item.isMattress ? 'Sintético Impermeable' : `Gama ${item.group === FabricGroup.B ? 'Premium' : 'Estándar'}`}
                        </span>
                      </div>
                      <span className="font-black text-xl text-teal-100">${item.total.toFixed(2)}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-white/20 font-black uppercase text-center py-10 tracking-[0.4em]">Sin selecciones</p>
                )}
              </div>

              <div className="flex justify-between items-end border-t border-white/10 pt-12">
                <span className="text-[11px] font-black text-white/30 uppercase pb-6 tracking-[0.3em]">Total USD</span>
                <div className="flex items-baseline text-white">
                  <span className="text-4xl font-black text-teal-400 mr-2">$</span>
                  <div className="flex items-baseline">
                    <span className="text-[6.5rem] font-black tracking-tighter leading-[0.8]">{totalParts.whole}</span>
                    <span className="text-4xl font-black opacity-30 ml-2">.{totalParts.decimal}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-40 -left-40 w-[30rem] h-[30rem] bg-teal-500/10 blur-[150px] rounded-full"></div>
          </div>
        </section>
        
        {/* ... Resto del código ... */}
      </main>
      
      {/* Footer y Botón WhatsApp ... */}
    </div>
  );
};

export default App;
