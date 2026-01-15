
import React, { useState, useMemo } from 'react';
import { FabricGroup, FoamType, CustomerData } from './types';
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

interface MultiItem {
  w: number;
  h: number;
  t: number;
  qty: number;
  fixedPrice?: number;
  label?: string;
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'cojin' | 'mueble' | 'colchoneta'>('cojin');
  const [customer, setCustomer] = useState<CustomerData>({ name: '', phone: '' });
  
  // Estados separados para cada categoría
  const [cushionItems, setCushionItems] = useState<MultiItem[]>(() => 
    Array.from({ length: 3 }, () => ({ w: 40, h: 40, t: 0, qty: 0 }))
  );
  
  const [seats, setSeats] = useState<MultiItem[]>(() => 
    Array.from({ length: 4 }, () => ({ w: 50, h: 50, t: 10, qty: 0 }))
  );
  
  const [backrests, setBackrests] = useState<MultiItem[]>(() => 
    Array.from({ length: 4 }, () => ({ w: 50, h: 40, t: 8, qty: 0 }))
  );
  
  const [stdMattresses, setStdMattresses] = useState<MultiItem[]>(() => 
    STANDARD_MATTRESS_PRICES.map(m => ({ ...m, qty: 0, fixedPrice: m.price }))
  );

  const [cushionFabricGroup, setCushionFabricGroup] = useState<FabricGroup>(FabricGroup.A);
  const [muebleFabricGroup, setMuebleFabricGroup] = useState<FabricGroup>(FabricGroup.A);
  const [foamType, setFoamType] = useState<FoamType>(FoamType.STANDARD);

  const calculation = useMemo(() => {
    const summaryItems: { label: string; qty: number; total: number; group?: FabricGroup; isMattress?: boolean }[] = [];
    let grandTotal = 0;

    // Cálculo Cojines
    cushionItems.forEach((item) => {
      if (item.qty > 0 && item.w > 0 && item.h > 0) {
        const area = item.w * item.h;
        let basePrice = CUSHION_BASE_FACTOR + (area * CUSHION_AREA_FACTOR);
        if (item.w >= 50 && item.h >= 50) basePrice = Math.max(basePrice, 10.00);
        const unitPrice = cushionFabricGroup === FabricGroup.B ? basePrice + CUSHION_PREMIUM_SURCHARGE : basePrice;
        const lineTotal = Number((unitPrice * item.qty).toFixed(2));
        summaryItems.push({ label: `Cojín ${item.w}x${item.h}`, qty: item.qty, total: lineTotal, group: cushionFabricGroup });
        grandTotal += lineTotal;
      }
    });

    // Cálculo Asientos y Espaldares
    const calcFurniture = (items: MultiItem[], prefix: string) => {
      items.forEach((item) => {
        if (item.qty > 0 && item.w > 0 && item.h > 0 && item.t > 0) {
          const vol = item.w * item.h * item.t;
          let unitPrice = (vol * FURNITURE_VOLUME_FACTOR) * FOAM_MULTIPLIERS[foamType];
          if (muebleFabricGroup === FabricGroup.B) unitPrice += FURNITURE_PREMIUM_FABRIC_ADD;
          const lineTotal = Number((unitPrice * item.qty).toFixed(2));
          summaryItems.push({ label: `${prefix} ${item.w}x${item.h}x${item.t}`, qty: item.qty, total: lineTotal, group: muebleFabricGroup });
          grandTotal += lineTotal;
        }
      });
    };
    calcFurniture(seats, "Asiento");
    calcFurniture(backrests, "Espaldar");

    // Cálculo Colchonetas
    stdMattresses.forEach((item) => {
      if (item.qty > 0 && item.fixedPrice) {
        const lineTotal = Number((item.fixedPrice * item.qty).toFixed(2));
        summaryItems.push({ label: `Colchoneta ${item.w}x${item.h}x${item.t}`, qty: item.qty, total: lineTotal, isMattress: true });
        grandTotal += lineTotal;
      }
    });

    return { summaryItems, grandTotal: Number(grandTotal.toFixed(2)) };
  }, [cushionItems, seats, backrests, stdMattresses, cushionFabricGroup, muebleFabricGroup, foamType]);

  const handleSendWhatsApp = () => {
    if (!customer.name || !customer.phone) return;
    let det = "";
    calculation.summaryItems.forEach(item => {
      const g = item.isMattress ? 'Impermeable' : (item.group === FabricGroup.B ? 'Premium' : 'Estándar');
      det += `• ${item.qty}x ${item.label} (${g}) - $${item.total.toFixed(2)}\n`;
    });
    const msg = `🧾 *COTIZACIÓN COJINES SERGIO*\n\n*DETALLE:*\n${det}\n💰 *TOTAL ESTIMADO: $${calculation.grandTotal.toFixed(2)}*\n\n👤 *Cliente:* ${customer.name}\n📱 *Tel:* ${customer.phone}`;
    window.open(`https://wa.me/${BUSINESS_WHATSAPP}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const QuantitySelector = ({ qty, onChange }: { qty: number, onChange: (val: number) => void }) => (
    <div className={`flex items-center gap-1 p-1 rounded-xl border ${qty > 0 ? 'bg-emerald-50 border-emerald-400' : 'bg-slate-100 border-slate-200'}`}>
      <button onClick={() => onChange(Math.max(0, qty - 1))} className="w-8 h-8 flex items-center justify-center font-bold bg-white rounded-lg shadow-sm text-emerald-600 active:bg-emerald-100">-</button>
      <span className="w-8 text-center font-bold text-xs">{qty}</span>
      <button onClick={() => onChange(qty + 1)} className="w-8 h-8 flex items-center justify-center font-bold bg-white rounded-lg shadow-sm text-emerald-600 active:bg-emerald-100">+</button>
    </div>
  );

  const [whole, decimal] = calculation.grandTotal.toFixed(2).split('.');

  return (
    <div className="min-h-screen pb-40 bg-[#F8FAFB] text-slate-800">
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-100 py-6 px-6 sticky top-0 z-50">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <h1 className="text-xl font-black text-emerald-900 tracking-tight">Cojines Sergio</h1>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 rounded-full border border-emerald-100">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            <span className="text-[10px] font-black text-emerald-700">ONLINE</span>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-5 pt-8 space-y-10">
        <nav className="bg-white p-1.5 rounded-3xl border border-slate-100 flex shadow-md gap-1">
          {(['cojin', 'mueble', 'colchoneta'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase transition-all ${activeTab === tab ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400'}`}>
              {tab === 'cojin' ? 'Cojines' : tab === 'mueble' ? 'Muebles' : 'Colchones'}
            </button>
          ))}
        </nav>

        <section className="space-y-4">
          <h2 className="text-[11px] font-black uppercase text-slate-400 tracking-[0.2em] ml-2">1. Medidas</h2>
          <div className="bg-white rounded-[2.5rem] p-5 shadow-xl border border-slate-50 space-y-3">
            {activeTab === 'cojin' && cushionItems.map((item, i) => (
              <div key={i} className={`flex items-center gap-2 p-3 rounded-2xl ${item.qty > 0 ? 'bg-emerald-50/50 border border-emerald-100' : 'bg-slate-50 border border-transparent'}`}>
                <input type="number" placeholder="An" value={item.w || ''} onChange={e=>{const n=[...cushionItems]; n[i].w=Number(e.target.value); setCushionItems(n)}} className="w-16 p-3 bg-white rounded-xl text-center font-bold border border-slate-200 outline-none focus:border-emerald-500" />
                <input type="number" placeholder="Al" value={item.h || ''} onChange={e=>{const n=[...cushionItems]; n[i].h=Number(e.target.value); setCushionItems(n)}} className="w-16 p-3 bg-white rounded-xl text-center font-bold border border-slate-200 outline-none focus:border-emerald-500" />
                <div className="flex-1" />
                <QuantitySelector qty={item.qty} onChange={v=>{const n=[...cushionItems]; n[i].qty=v; setCushionItems(n)}} />
              </div>
            ))}

            {activeTab === 'mueble' && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Asientos</span>
                  {seats.map((item, i) => (
                    <div key={`s-${i}`} className={`flex items-center gap-1.5 p-2 rounded-xl ${item.qty > 0 ? 'bg-emerald-50/50' : 'bg-slate-50'}`}>
                      <input type="number" placeholder="L" value={item.w || ''} onChange={e=>{const n=[...seats]; n[i].w=Number(e.target.value); setSeats(n)}} className="w-12 p-2 bg-white rounded-lg text-center text-xs font-bold border border-slate-200 outline-none" />
                      <input type="number" placeholder="An" value={item.h || ''} onChange={e=>{const n=[...seats]; n[i].h=Number(e.target.value); setSeats(n)}} className="w-12 p-2 bg-white rounded-lg text-center text-xs font-bold border border-slate-200 outline-none" />
                      <input type="number" placeholder="Es" value={item.t || ''} onChange={e=>{const n=[...seats]; n[i].t=Number(e.target.value); setSeats(n)}} className="w-12 p-2 bg-white rounded-lg text-center text-xs font-bold border border-slate-200 outline-none" />
                      <div className="flex-1" />
                      <QuantitySelector qty={item.qty} onChange={v=>{const n=[...seats]; n[i].qty=v; setSeats(n)}} />
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Espaldares</span>
                  {backrests.map((item, i) => (
                    <div key={`b-${i}`} className={`flex items-center gap-1.5 p-2 rounded-xl ${item.qty > 0 ? 'bg-emerald-50/50' : 'bg-slate-50'}`}>
                      <input type="number" placeholder="L" value={item.w || ''} onChange={e=>{const n=[...backrests]; n[i].w=Number(e.target.value); setBackrests(n)}} className="w-12 p-2 bg-white rounded-lg text-center text-xs font-bold border border-slate-200 outline-none" />
                      <input type="number" placeholder="An" value={item.h || ''} onChange={e=>{const n=[...backrests]; n[i].h=Number(e.target.value); setBackrests(n)}} className="w-12 p-2 bg-white rounded-lg text-center text-xs font-bold border border-slate-200 outline-none" />
                      <input type="number" placeholder="Es" value={item.t || ''} onChange={e=>{const n=[...backrests]; n[i].t=Number(e.target.value); setBackrests(n)}} className="w-12 p-2 bg-white rounded-lg text-center text-xs font-bold border border-slate-200 outline-none" />
                      <div className="flex-1" />
                      <QuantitySelector qty={item.qty} onChange={v=>{const n=[...backrests]; n[i].qty=v; setBackrests(n)}} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'colchoneta' && stdMattresses.map((m, i) => (
              <div key={i} className={`flex items-center justify-between p-3 rounded-2xl ${m.qty > 0 ? 'bg-emerald-50/50' : 'bg-slate-50'}`}>
                <div className="flex flex-col">
                  <span className="text-xs font-black text-slate-700">{m.w}x{m.h}x{m.t} cm</span>
                  <span className="text-[9px] font-bold text-emerald-600 uppercase">Premium</span>
                </div>
                <QuantitySelector qty={m.qty} onChange={v=>{const n=[...stdMattresses]; n[i].qty=v; setStdMattresses(n)}} />
              </div>
            ))}
          </div>
        </section>

        <section className="bg-emerald-950 rounded-[3rem] p-10 shadow-2xl text-white relative overflow-hidden">
          <div className="relative z-10">
            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em]">Resumen de Pago</span>
            <div className="flex items-baseline mt-4">
              <span className="text-3xl font-bold text-emerald-500 mr-2">$</span>
              <span className="text-7xl font-black tracking-tighter leading-none">{whole}</span>
              <span className="text-2xl font-bold opacity-30 ml-1">.{decimal}</span>
            </div>
            {calculation.summaryItems.length > 0 && (
              <div className="mt-8 pt-8 border-t border-white/10 space-y-3">
                {calculation.summaryItems.map((it, idx) => (
                  <div key={idx} className="flex justify-between text-[11px] font-bold opacity-70 uppercase tracking-wider">
                    <span className="max-w-[70%] truncate">{it.qty}x {it.label}</span>
                    <span>${it.total.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full"></div>
        </section>

        <section className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-50 space-y-6">
          <h2 className="text-[11px] font-black uppercase text-slate-400 tracking-[0.2em]">2. Información del Cliente</h2>
          <div className="space-y-4">
            <input type="text" placeholder="Nombre completo" value={customer.name} onChange={e=>setCustomer({...customer, name:e.target.value})} className="w-full p-5 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-emerald-500 outline-none transition-all" />
            <input type="tel" placeholder="Número de WhatsApp" value={customer.phone} onChange={e=>setCustomer({...customer, phone:e.target.value})} className="w-full p-5 bg-slate-50 rounded-2xl font-bold border-2 border-transparent focus:border-emerald-500 outline-none transition-all" />
          </div>
        </section>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 p-6 bg-white/90 backdrop-blur-xl border-t border-slate-100 z-[60]">
        <button 
          onClick={handleSendWhatsApp}
          disabled={!customer.name || !customer.phone || calculation.grandTotal === 0}
          className="w-full max-w-md mx-auto py-6 rounded-3xl bg-emerald-600 text-white font-black text-sm uppercase tracking-[0.2em] shadow-xl active:scale-95 disabled:opacity-20 transition-all flex items-center justify-center gap-3"
        >
          Confirmar Pedido
        </button>
      </footer>
    </div>
  );
};

export default App;
