import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ProductType, FabricGroup, FoamType, CustomerData, Fabric } from './types';
import { 
  FABRIC_CATALOG,
  FOAM_MULTIPLIERS, 
  CUSHION_BASE_FACTOR,
  CUSHION_AREA_FACTOR,
  CUSHION_PREMIUM_SURCHARGE,
  FURNITURE_PREMIUM_FABRIC_ADD,
  FURNITURE_VOLUME_FACTOR,
  BUSINESS_WHATSAPP
} from './constants';

interface MultiItem {
  w: number;
  h: number;
  t: number;
  qty: number;
}

const App: React.FC = () => {
  const [allFabrics, setAllFabrics] = useState<Record<FabricGroup, Fabric[]>>(FABRIC_CATALOG);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'cojin' | 'mueble'>('cojin');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingFabric, setEditingFabric] = useState<{group: FabricGroup, index: number} | null>(null);

  // Cargar telas guardadas
  useEffect(() => {
    const saved = localStorage.getItem('sergio_fabrics_v3');
    if (saved) {
      try { setAllFabrics(JSON.parse(saved)); } catch (e) { console.error(e); }
    }
  }, []);

  // Guardar telas al cambiar
  useEffect(() => {
    localStorage.setItem('sergio_fabrics_v3', JSON.stringify(allFabrics));
  }, [allFabrics]);

  // Estados de medidas
  const [cushionDim, setCushionDim] = useState({ w: 45, h: 45, qty: 1 });
  const [seats, setSeats] = useState<MultiItem[]>(() => 
    Array.from({ length: 5 }, (_, i) => ({ w: 60, h: 60, t: 10, qty: i === 0 ? 1 : 0 }))
  );
  const [backrests, setBackrests] = useState<MultiItem[]>(() => 
    Array.from({ length: 5 }, () => ({ w: 60, h: 40, t: 8, qty: 0 }))
  );

  const [fabricGroup, setFabricGroup] = useState<FabricGroup>(FabricGroup.A);
  const [fabricName, setFabricName] = useState('');
  const [foamType, setFoamType] = useState<FoamType>(FoamType.STANDARD);
  const [customer, setCustomer] = useState<CustomerData>({ name: '', phone: '' });

  useEffect(() => {
    const groupList = allFabrics[fabricGroup];
    if (groupList.length > 0) {
      const exists = groupList.some(f => f.name === fabricName);
      if (!exists) setFabricName(groupList[0].name);
    }
  }, [fabricGroup, allFabrics]);

  // CÁLCULO EXACTO Y RESUMEN AGRUPADO
  const calculation = useMemo(() => {
    const summaryItems: { label: string; qty: number; total: number }[] = [];
    let grandTotal = 0;

    if (activeTab === 'cojin') {
      const area = cushionDim.w * cushionDim.h;
      const base = CUSHION_BASE_FACTOR + (area * CUSHION_AREA_FACTOR);
      let unitPrice = fabricGroup === FabricGroup.B ? base + CUSHION_PREMIUM_SURCHARGE : base;
      unitPrice = Math.max(5, unitPrice); 
      const subtotal = unitPrice * cushionDim.qty;
      
      summaryItems.push({ label: `Cojín Decorativo`, qty: cushionDim.qty, total: subtotal });
      grandTotal = subtotal;
    } else {
      let tSQty = 0, tSPrice = 0, tBQty = 0, tBPrice = 0;

      seats.forEach((item) => {
        if (item.qty > 0) {
          const vol = item.w * item.h * item.t;
          let uPrice = (vol * FURNITURE_VOLUME_FACTOR) * FOAM_MULTIPLIERS[foamType];
          if (fabricGroup === FabricGroup.B) uPrice += FURNITURE_PREMIUM_FABRIC_ADD;
          tSQty += item.qty;
          tSPrice += uPrice * item.qty;
        }
      });

      backrests.forEach((item) => {
        if (item.qty > 0) {
          const vol = item.w * item.h * item.t;
          let uPrice = (vol * FURNITURE_VOLUME_FACTOR) * FOAM_MULTIPLIERS[foamType];
          if (fabricGroup === FabricGroup.B) uPrice += FURNITURE_PREMIUM_FABRIC_ADD;
          tBQty += item.qty;
          tBPrice += uPrice * item.qty;
        }
      });

      if (tSQty > 0) summaryItems.push({ label: 'Total Asientos', qty: tSQty, total: tSPrice });
      if (tBQty > 0) summaryItems.push({ label: 'Total Espaldares', qty: tBQty, total: tBPrice });
      grandTotal = tSPrice + tBPrice;
    }

    return { summaryItems, grandTotal };
  }, [activeTab, cushionDim, seats, backrests, fabricGroup, foamType]);

  const handleSendWhatsApp = () => {
    if (!customer.name || !customer.phone) return;
    let det = "";
    if (activeTab === 'cojin') {
      det = `• ${cushionDim.qty}x Cojín Decorativo (${cushionDim.w}x${cushionDim.h} cm)\n`;
    } else {
      seats.forEach(s => { if(s.qty > 0) det += `• ${s.qty}x Asiento (${s.w}x${s.h}x${s.t} cm)\n`; });
      backrests.forEach(b => { if(b.qty > 0) det += `• ${b.qty}x Espaldar (${b.w}x${b.h}x${b.t} cm)\n`; });
    }
    const msg = `🧾 *COTIZACIÓN ESTIMADA*\n\n*PRODUCTOS:*\n${det}\n*TELA:* ${fabricGroup === FabricGroup.B ? 'Premium' : 'Estándar'} (${fabricName})\n${activeTab === 'mueble' ? `*ESPUMA:* ${foamType}\n` : ''}\n💰 *TOTAL: $${calculation.grandTotal.toFixed(2)}*\n\n👤 *Cliente:* ${customer.name}\n📱 *WhatsApp:* ${customer.phone}`;
    window.open(`https://wa.me/${BUSINESS_WHATSAPP}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const QuantitySelector = ({ qty, onChange }: { qty: number, onChange: (val: number) => void }) => (
    <div className="flex bg-slate-100 p-1 rounded-xl items-center gap-2">
      <button onClick={() => onChange(Math.max(0, qty - 1))} className="w-8 h-8 flex items-center justify-center font-black bg-white rounded-lg shadow-sm text-sm">-</button>
      <span className="font-black text-xs w-3 text-center">{qty}</span>
      <button onClick={() => onChange(qty + 1)} className="w-8 h-8 flex items-center justify-center font-black bg-white rounded-lg shadow-sm text-sm">+</button>
    </div>
  );

  return (
    <div className="min-h-screen pb-40 bg-[#F8FAFB] font-sans">
      <header className="bg-white border-b border-slate-100 py-5 px-6 sticky top-0 z-50">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-black text-[#005F6B] leading-tight">Cojines y accesorios</h1>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cotizador Real</p>
          </div>
          <button onClick={() => setIsAdminOpen(true)} className="p-3 rounded-2xl bg-slate-50 text-slate-400 border border-slate-100">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path></svg>
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-6 pt-6 space-y-8">
        {/* TABS */}
        <div className="bg-white p-1.5 rounded-[2.2rem] border border-slate-100 flex shadow-sm">
          <button onClick={() => setActiveTab('cojin')} className={`flex-1 py-4 rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'cojin' ? 'bg-[#005F6B] text-white shadow-lg' : 'text-slate-400'}`}>Decorativo</button>
          <button onClick={() => setActiveTab('mueble')} className={`flex-1 py-4 rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'mueble' ? 'bg-[#005F6B] text-white shadow-lg' : 'text-slate-400'}`}>Asiento/Espaldar</button>
        </div>

        {/* MEDIDAS */}
        <section className="space-y-4">
          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">1. Medidas (cm)</label>
          {activeTab === 'cojin' ? (
            <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-50 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <input type="number" value={cushionDim.w} onChange={(e) => setCushionDim(p=>({...p, w:Number(e.target.value)}))} className="w-full p-5 bg-slate-50 rounded-2xl text-center font-black outline-none border-2 border-transparent focus:border-[#005F6B]" placeholder="Ancho" />
                <input type="number" value={cushionDim.h} onChange={(e) => setCushionDim(p=>({...p, h:Number(e.target.value)}))} className="w-full p-5 bg-slate-50 rounded-2xl text-center font-black outline-none border-2 border-transparent focus:border-[#005F6B]" placeholder="Alto" />
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                <span className="text-[10px] font-black text-slate-400 uppercase">Cantidad</span>
                <QuantitySelector qty={cushionDim.qty} onChange={(v)=>setCushionDim(p=>({...p, qty:v}))} />
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-white rounded-[2.5rem] p-6 shadow-xl border border-slate-50">
                <span className="text-[11px] font-black text-[#005F6B] uppercase block mb-4 ml-2">Asientos</span>
                <div className="space-y-3">
                  {seats.map((s, i) => (
                    <div key={i} className={`flex items-center gap-2 p-2 rounded-2xl ${s.qty > 0 ? 'bg-teal-50' : 'bg-slate-50'}`}>
                      <input type="number" value={s.w} onChange={(e)=>{const n=[...seats]; n[i].w=Number(e.target.value); setSeats(n)}} className="w-full p-2 bg-white rounded-lg text-center text-xs font-bold border-none outline-none" />
                      <input type="number" value={s.h} onChange={(e)=>{const n=[...seats]; n[i].h=Number(e.target.value); setSeats(n)}} className="w-full p-2 bg-white rounded-lg text-center text-xs font-bold border-none outline-none" />
                      <input type="number" value={s.t} onChange={(e)=>{const n=[...seats]; n[i].t=Number(e.target.value); setSeats(n)}} className="w-full p-2 bg-white rounded-lg text-center text-xs font-bold border-none outline-none" />
                      <QuantitySelector qty={s.qty} onChange={(v)=>{const n=[...seats]; n[i].qty=v; setSeats(n)}} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-[2.5rem] p-6 shadow-xl border border-slate-50">
                <span className="text-[11px] font-black text-[#005F6B] uppercase block mb-4 ml-2">Espaldares</span>
                <div className="space-y-3">
                  {backrests.map((b, i) => (
                    <div key={i} className={`flex items-center gap-2 p-2 rounded-2xl ${b.qty > 0 ? 'bg-teal-50' : 'bg-slate-50'}`}>
                      <input type="number" value={b.w} onChange={(e)=>{const n=[...backrests]; n[i].w=Number(e.target.value); setBackrests(n)}} className="w-full p-2 bg-white rounded-lg text-center text-xs font-bold border-none outline-none" />
                      <input type="number" value={b.h} onChange={(e)=>{const n=[...backrests]; n[i].h=Number(e.target.value); setBackrests(n)}} className="w-full p-2 bg-white rounded-lg text-center text-xs font-bold border-none outline-none" />
                      <input type="number" value={b.t} onChange={(e)=>{const n=[...backrests]; n[i].t=Number(e.target.value); setBackrests(n)}} className="w-full p-2 bg-white rounded-lg text-center text-xs font-bold border-none outline-none" />
                      <QuantitySelector qty={b.qty} onChange={(v)=>{const n=[...backrests]; n[i].qty=v; setBackrests(n)}} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* MATERIALES */}
        <section className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-50 space-y-6">
          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">2. Materiales</label>
          <div className="space-y-6">
            {activeTab === 'mueble' && (
              <div className="grid grid-cols-3 gap-2 bg-slate-50 p-1 rounded-2xl">
                {[FoamType.ECONOMY, FoamType.STANDARD, FoamType.PREMIUM].map(f => (
                  <button key={f} onClick={()=>setFoamType(f)} className={`py-3 rounded-xl text-[9px] font-black uppercase ${foamType===f ? 'bg-white text-[#005F6B] shadow-sm' : 'text-slate-400'}`}>{f}</button>
                ))}
              </div>
            )}
            <div className="flex justify-between items-center px-2">
              <span className="text-[10px] font-black text-slate-400 uppercase">Gama de Tela</span>
              <div className="flex bg-slate-100 p-1 rounded-xl">
                {['A', 'B'].map(g => (
                  <button key={g} onClick={()=>setFabricGroup(g as FabricGroup)} className={`px-4 py-1.5 rounded-lg text-[10px] font-black ${fabricGroup===g ? 'bg-white text-[#005F6B] shadow-sm' : 'text-slate-400'}`}>{g==='A'?'BÁSICA':'PREMIUM'}</button>
                ))}
              </div>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-2 px-2 no-scrollbar">
              {allFabrics[fabricGroup].map(f => (
                <div key={f.name} onClick={()=>setFabricName(f.name)} className="flex-shrink-0 w-24 cursor-pointer text-center">
                  <div className={`aspect-square rounded-2xl overflow-hidden border-4 transition-all ${fabricName===f.name ? 'border-[#005F6B] scale-105 shadow-md' : 'border-transparent opacity-40'}`}>
                    <img src={f.image} className="w-full h-full object-cover" />
                  </div>
                  <span className="text-[9px] font-bold uppercase mt-2 block truncate">{f.name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* TARJETA DE RESUMEN OSCURA */}
        <section className="relative">
          <div className="bg-[#0F172A] rounded-[3.5rem] p-10 shadow-2xl text-white overflow-hidden">
            <div className="relative z-10 space-y-8">
              <div className="space-y-1">
                <span className="text-[10px] font-black text-teal-400 uppercase tracking-widest">Resumen de Inversión</span>
                <p className="text-2xl font-black">{fabricName || 'Selecciona Tela'}</p>
              </div>
              <div className="space-y-4 border-t border-white/5 pt-6">
                {calculation.summaryItems.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold">{item.label}</span>
                      <span className="text-[10px] text-white/30 uppercase">{item.qty} unidades</span>
                    </div>
                    <span className="font-black text-sm">${item.total.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-end border-t border-white/10 pt-8">
                <span className="text-[10px] font-black text-white/30 uppercase pb-3">Total</span>
                <div className="flex items-baseline">
                  <span className="text-3xl font-black text-teal-400 mr-1">$</span>
                  <span className="text-7xl font-black tracking-tighter leading-none">{Math.floor(calculation.grandTotal)}</span>
                  <span className="text-3xl font-black opacity-40 ml-1">.{(calculation.grandTotal % 1).toFixed(2).split('.')[1]}</span>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-teal-500/10 blur-[100px] rounded-full"></div>
          </div>
        </section>

        {/* CONTACTO */}
        <section className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-50 space-y-4">
          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">3. Tus Datos</label>
          <input type="text" placeholder="¿Cómo te llamas?" value={customer.name} onChange={e=>setCustomer({...customer, name:e.target.value})} className="w-full p-5 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-[#005F6B]" />
          <input type="tel" placeholder="Tu WhatsApp" value={customer.phone} onChange={e=>setCustomer({...customer, phone:e.target.value})} className="w-full p-5 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-[#005F6B]" />
        </section>
      </main>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/90 backdrop-blur-xl border-t border-slate-50 z-[60] flex justify-center">
        <button 
          onClick={handleSendWhatsApp}
          disabled={!customer.name || !customer.phone || calculation.grandTotal === 0}
          className="w-full max-w-md py-6 rounded-[2.5rem] bg-[#25D366] text-white font-black text-sm uppercase tracking-[0.2em] shadow-2xl active:scale-95 disabled:grayscale disabled:opacity-50 transition-all"
        >
          ENVIAR COTIZACIÓN
        </button>
      </div>
    </div>
  );
};

export default App;
