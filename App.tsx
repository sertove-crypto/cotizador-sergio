
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
  
  // Persistencia de datos del catálogo maestro
  useEffect(() => {
    const saved = localStorage.getItem('sergio_fabrics_v3');
    if (saved) {
      try { setAllFabrics(JSON.parse(saved)); } catch (e) { console.error(e); }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('sergio_fabrics_v3', JSON.stringify(allFabrics));
  }, [allFabrics]);

  // Items iniciales
  const [cushionItems, setCushionItems] = useState<MultiItem[]>(() => 
    Array.from({ length: 3 }, () => ({ w: 40, h: 40, t: 0, qty: 0 }))
  );
  const [seats, setSeats] = useState<MultiItem[]>(() => 
    Array.from({ length: 5 }, () => ({ w: 50, h: 50, t: 10, qty: 0 }))
  );
  const [backrests, setBackrests] = useState<MultiItem[]>(() => 
    Array.from({ length: 5 }, () => ({ w: 50, h: 40, t: 8, qty: 0 }))
  );

  // VALORES POR DEFECTO AL INICIAR: Siempre Estándar
  const [fabricGroup, setFabricGroup] = useState<FabricGroup>(FabricGroup.A);
  const [fabricName, setFabricName] = useState(FABRIC_CATALOG[FabricGroup.A][0].name);
  const [foamType, setFoamType] = useState<FoamType>(FoamType.STANDARD);
  const [customer, setCustomer] = useState<CustomerData>({ name: '', phone: '' });

  // Sincronización de nombre de tela
  useEffect(() => {
    const groupList = allFabrics[fabricGroup];
    if (groupList.length > 0) {
      const exists = groupList.some(f => f.name === fabricName);
      if (!exists) setFabricName(groupList[0].name);
    }
  }, [fabricGroup, allFabrics, fabricName]);

  const calculation = useMemo(() => {
    const summaryItems: { label: string; qty: number; total: number }[] = [];
    let grandTotal = 0;

    cushionItems.forEach((item) => {
      if (item.qty > 0 && item.w > 0 && item.h > 0) {
        const area = item.w * item.h;
        let basePrice = CUSHION_BASE_FACTOR + (area * CUSHION_AREA_FACTOR);
        if (item.w >= 50 && item.h >= 50) basePrice = Math.max(basePrice, 10.00);
        const unitPrice = fabricGroup === FabricGroup.B ? basePrice + CUSHION_PREMIUM_SURCHARGE : basePrice;
        const lineTotal = Number((unitPrice * item.qty).toFixed(2));
        summaryItems.push({ label: `Cojín Dec. ${item.w}x${item.h}`, qty: item.qty, total: lineTotal });
        grandTotal += lineTotal;
      }
    });

    seats.forEach((item) => {
      if (item.qty > 0 && item.w > 0 && item.h > 0 && item.t > 0) {
        const vol = item.w * item.h * item.t;
        let unitPrice = (vol * FURNITURE_VOLUME_FACTOR) * FOAM_MULTIPLIERS[foamType];
        if (fabricGroup === FabricGroup.B) unitPrice += FURNITURE_PREMIUM_FABRIC_ADD;
        const lineTotal = Number((unitPrice * item.qty).toFixed(2));
        summaryItems.push({ label: `Asiento ${item.w}x${item.h}x${item.t}`, qty: item.qty, total: lineTotal });
        grandTotal += lineTotal;
      }
    });

    backrests.forEach((item) => {
      if (item.qty > 0 && item.w > 0 && item.h > 0 && item.t > 0) {
        const vol = item.w * item.h * item.t;
        let unitPrice = (vol * FURNITURE_VOLUME_FACTOR) * FOAM_MULTIPLIERS[foamType];
        if (fabricGroup === FabricGroup.B) unitPrice += FURNITURE_PREMIUM_FABRIC_ADD;
        const lineTotal = Number((unitPrice * item.qty).toFixed(2));
        summaryItems.push({ label: `Espaldar ${item.w}x${item.h}x${item.t}`, qty: item.qty, total: lineTotal });
        grandTotal += lineTotal;
      }
    });

    return { summaryItems, grandTotal: Number(grandTotal.toFixed(2)) };
  }, [cushionItems, seats, backrests, fabricGroup, foamType]);

  const handleSendWhatsApp = () => {
    if (!customer.name || !customer.phone) return;
    let det = "";
    calculation.summaryItems.forEach(item => det += `• ${item.qty}x ${item.label} ($${item.total.toFixed(2)})\n`);
    const gamaText = fabricGroup === FabricGroup.B ? 'Premium' : 'Estándar';
    const msg = `🧾 *COTIZACIÓN ESTIMADA*\n\n*PRODUCTOS:*\n${det}\n*TELA:* Gama ${gamaText}\n*ESPUMA:* ${activeTab === 'mueble' ? foamType : 'N/A'}\n\n💰 *TOTAL: $${calculation.grandTotal.toFixed(2)}*\n\n👤 *Cliente:* ${customer.name}\n📱 *WhatsApp:* ${customer.phone}`;
    window.open(`https://wa.me/${BUSINESS_WHATSAPP}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const totalParts = useMemo(() => {
    const [whole, decimal] = calculation.grandTotal.toFixed(2).split('.');
    return { whole, decimal };
  }, [calculation.grandTotal]);

  const QuantitySelector = ({ qty, onChange }: { qty: number, onChange: (val: number) => void }) => (
    <div className={`flex p-1 rounded-xl items-center shadow-inner overflow-hidden border transition-all ${qty > 0 ? 'bg-[#005F6B]/10 border-[#005F6B]/40 ring-1 ring-[#005F6B]/20' : 'bg-slate-200/50 border-slate-200'}`}>
      <button onClick={() => onChange(Math.max(0, qty - 1))} className="w-8 h-8 flex items-center justify-center font-black bg-white rounded-lg shadow-sm text-lg active:scale-90 text-[#005F6B]">-</button>
      <input type="number" value={qty} onChange={(e) => onChange(Math.max(0, parseInt(e.target.value) || 0))} className="w-9 bg-transparent text-center font-black text-xs outline-none border-none text-slate-800" />
      <button onClick={() => onChange(qty + 1)} className="w-8 h-8 flex items-center justify-center font-black bg-white rounded-lg shadow-sm text-lg active:scale-90 text-[#005F6B]">+</button>
    </div>
  );

  return (
    <div className="min-h-screen pb-44 bg-[#F8FAFB] font-sans animate-fade-in overflow-x-hidden">
      <header className="bg-white border-b border-slate-100 py-6 px-6 sticky top-0 z-50 shadow-sm">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-[#005F6B] leading-tight">Cojines Sergio</h1>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Taller de Tapicería</p>
          </div>
          <button onClick={() => setIsAdminOpen(true)} className="p-4 rounded-2xl bg-slate-50 text-slate-400 border border-slate-100 active:scale-95">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path></svg>
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-5 pt-10 space-y-12">
        <div className="bg-white p-2 rounded-[2.5rem] border border-slate-100 flex shadow-lg">
          <button onClick={() => setActiveTab('cojin')} className={`flex-1 py-5 rounded-[2.2rem] text-[10px] font-black uppercase tracking-[0.1em] transition-all ${activeTab === 'cojin' ? 'bg-[#005F6B] text-white shadow-xl scale-[1.03]' : 'text-slate-300'}`}>Cojines Decorativos</button>
          <button onClick={() => setActiveTab('mueble')} className={`flex-1 py-5 rounded-[2.2rem] text-[10px] font-black uppercase tracking-[0.1em] transition-all ${activeTab === 'mueble' ? 'bg-[#005F6B] text-white shadow-xl scale-[1.03]' : 'text-slate-300'}`}>Asientos y Espaldares</button>
        </div>

        <section className="space-y-6">
          <label className="text-[11px] font-black uppercase text-slate-400 tracking-[0.25em] ml-4 block">1. Medidas y Cantidades (cm)</label>
          {activeTab === 'cojin' ? (
            <div className="bg-white rounded-[3rem] p-6 shadow-xl border border-slate-50 space-y-4">
              <div className="grid grid-cols-[1fr_1fr_auto] gap-4 px-2 mb-1">
                <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest text-center">Ancho</span>
                <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest text-center">Alto</span>
                <span className="w-[100px] text-[10px] font-black uppercase text-slate-500 tracking-widest text-center">Cant.</span>
              </div>
              <div className="space-y-4">
                {cushionItems.map((item, idx) => (
                  <div key={idx} className={`flex items-center gap-3 p-3 rounded-[2rem] transition-all ${item.qty > 0 ? 'bg-[#005F6B]/5 ring-2 ring-[#005F6B]/20' : 'bg-slate-50'}`}>
                    <input type="number" value={item.w} onChange={(e) => {const n = [...cushionItems]; n[idx].w = Number(e.target.value); setCushionItems(n)}} className="flex-1 w-full p-4 bg-white rounded-2xl text-center text-lg font-black outline-none shadow-sm border border-slate-200" placeholder="An" />
                    <input type="number" value={item.h} onChange={(e) => {const n = [...cushionItems]; n[idx].h = Number(e.target.value); setCushionItems(n)}} className="flex-1 w-full p-4 bg-white rounded-2xl text-center text-lg font-black outline-none shadow-sm border border-slate-200" placeholder="Al" />
                    <QuantitySelector qty={item.qty} onChange={(v) => {const n = [...cushionItems]; n[idx].qty = v; setCushionItems(n)}} />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="bg-white rounded-[3rem] p-6 shadow-xl border border-slate-50">
                <span className="text-[11px] font-black text-[#005F6B] uppercase block mb-4 ml-3 tracking-[0.2em]">Asientos</span>
                <div className="space-y-4">
                  {seats.map((s, i) => (
                    <div key={i} className={`grid grid-cols-[1fr_1fr_1fr_auto] items-center gap-2 p-3 rounded-[1.8rem] transition-all ${s.qty > 0 ? 'bg-teal-50 ring-2 ring-teal-500/20 shadow-sm' : 'bg-slate-50'}`}>
                      <input type="number" value={s.w} onChange={(e)=>{const n=[...seats]; n[i].w=Number(e.target.value); setSeats(n)}} className="w-full p-3 bg-white rounded-xl text-center text-sm font-bold border border-slate-300 outline-none" placeholder="L" />
                      <input type="number" value={s.h} onChange={(e)=>{const n=[...seats]; n[i].h=Number(e.target.value); setSeats(n)}} className="w-full p-3 bg-white rounded-xl text-center text-sm font-bold border border-slate-300 outline-none" placeholder="An" />
                      <input type="number" value={s.t} onChange={(e)=>{const n=[...seats]; n[i].t=Number(e.target.value); setSeats(n)}} className="w-full p-3 bg-white rounded-xl text-center text-sm font-bold border border-slate-300 outline-none" placeholder="Es" />
                      <div className="border-l border-slate-300 pl-2"><QuantitySelector qty={s.qty} onChange={(v)=>{const n=[...seats]; n[i].qty=v; setSeats(n)}} /></div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-[3rem] p-6 shadow-xl border border-slate-50">
                <span className="text-[11px] font-black text-[#005F6B] uppercase block mb-4 ml-3 tracking-[0.2em]">Espaldares</span>
                <div className="space-y-4">
                  {backrests.map((b, i) => (
                    <div key={i} className={`grid grid-cols-[1fr_1fr_1fr_auto] items-center gap-2 p-3 rounded-[1.8rem] transition-all ${b.qty > 0 ? 'bg-teal-50 ring-2 ring-teal-500/20 shadow-sm' : 'bg-slate-50'}`}>
                      <input type="number" value={b.w} onChange={(e)=>{const n=[...backrests]; n[i].w=Number(e.target.value); setBackrests(n)}} className="w-full p-3 bg-white rounded-xl text-center text-sm font-bold border border-slate-300 outline-none" placeholder="L" />
                      <input type="number" value={b.h} onChange={(e)=>{const n=[...backrests]; n[i].h=Number(e.target.value); setBackrests(n)}} className="w-full p-3 bg-white rounded-xl text-center text-sm font-bold border border-slate-300 outline-none" placeholder="An" />
                      <input type="number" value={b.t} onChange={(e)=>{const n=[...backrests]; n[i].t=Number(e.target.value); setBackrests(n)}} className="w-full p-3 bg-white rounded-xl text-center text-sm font-bold border border-slate-300 outline-none" placeholder="Es" />
                      <div className="border-l border-slate-300 pl-2"><QuantitySelector qty={b.qty} onChange={(v)=>{const n=[...backrests]; n[i].qty=v; setBackrests(n)}} /></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="bg-white rounded-[3rem] p-10 shadow-xl border border-slate-50 space-y-10">
          <label className="text-[11px] font-black uppercase text-slate-400 tracking-[0.25em] ml-3 block">{activeTab === 'mueble' ? '2. ESCOGER ESPONJA' : '2. Calidad de Acabado'}</label>
          <div className="space-y-10">
            {activeTab === 'mueble' && (
              <div className="grid grid-cols-3 gap-3 bg-slate-100 p-2 rounded-[2rem]">
                {[FoamType.ECONOMY, FoamType.STANDARD, FoamType.PREMIUM].map(f => (
                  <button key={f} onClick={()=>setFoamType(f)} className={`py-5 rounded-2xl text-[10px] font-black uppercase transition-all ${foamType===f ? 'bg-white text-[#005F6B] shadow-md scale-105' : 'text-slate-400'}`}>
                    {f === FoamType.ECONOMY ? 'BÁSICA' : f === FoamType.STANDARD ? 'ESTÁNDAR' : 'PREMIUM'}
                  </button>
                ))}
              </div>
            )}
            <div className="flex justify-between items-center px-2">
              <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Gama de Tela</span>
              <div className="flex bg-slate-100 p-1.5 rounded-2xl shadow-inner">
                {(['A', 'B'] as FabricGroup[]).map(g => (
                  <button key={g} onClick={()=>setFabricGroup(g)} className={`px-7 py-3 rounded-xl text-[10px] font-black transition-all ${fabricGroup===g ? 'bg-white text-[#005F6B] shadow-md' : 'text-slate-400'}`}>{g==='A'?'ESTÁNDAR':'PREMIUM'}</button>
                ))}
              </div>
            </div>
            <div className="bg-[#005F6B]/5 p-6 rounded-3xl border border-[#005F6B]/10 text-center">
              <p className="text-[10px] font-black text-[#005F6B] uppercase tracking-widest leading-relaxed">
                Has seleccionado <span className="underline decoration-2">Gama {fabricGroup === FabricGroup.A ? 'Estándar' : 'Premium'}</span>.<br/>
                El precio se ajusta automáticamente según la calidad elegida.
              </p>
            </div>
          </div>
        </section>

        <section className="relative px-2">
          <div className="bg-[#0F172A] rounded-[4.5rem] p-12 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.4)] text-white overflow-hidden relative border border-white/5">
            <div className="relative z-10 space-y-12">
              <div className="space-y-2">
                <span className="text-[11px] font-black text-teal-400 uppercase tracking-[0.4em] opacity-80">Resumen</span>
                <p className="text-3xl font-black tracking-tight">{fabricGroup === FabricGroup.A ? 'Gama Estándar' : 'Gama Premium'}</p>
              </div>
              <div className="space-y-6 border-t border-white/10 pt-10">
                {calculation.summaryItems.length > 0 ? (
                  calculation.summaryItems.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center animate-fade-in" style={{animationDelay: `${idx*0.1}s`}}>
                      <div className="flex flex-col gap-1">
                        <span className="text-lg font-black text-white/95 leading-none">{item.label}</span>
                        <span className="text-[10px] text-white/30 uppercase font-black tracking-widest">{item.qty} piezas</span>
                      </div>
                      <span className="font-black text-xl text-teal-100">${item.total.toFixed(2)}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-white/20 font-black uppercase text-center py-10 tracking-[0.4em]">Sin productos</p>
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

        <section className="bg-white rounded-[3rem] p-10 shadow-xl border border-slate-50 space-y-8">
          <label className="text-[11px] font-black uppercase text-slate-400 tracking-[0.25em] ml-3 block">3. Información de Contacto</label>
          <div className="space-y-5">
            <input type="text" placeholder="Tu nombre" value={customer.name} onChange={e=>setCustomer({...customer, name:e.target.value})} className="w-full p-7 bg-slate-50 rounded-[2.2rem] font-black text-lg outline-none border-2 border-transparent focus:border-[#005F6B] transition-all" />
            <input type="tel" placeholder="Tu celular" value={customer.phone} onChange={e=>setCustomer({...customer, phone:e.target.value})} className="w-full p-7 bg-slate-50 rounded-[2.2rem] font-black text-lg outline-none border-2 border-transparent focus:border-[#005F6B] transition-all" />
          </div>
        </section>
      </main>

      <div className="fixed bottom-0 left-0 right-0 p-8 bg-white/95 backdrop-blur-3xl border-t border-slate-100 z-[60] flex justify-center shadow-[0_-20px_60px_rgba(0,0,0,0.06)]">
        <button 
          onClick={handleSendWhatsApp}
          disabled={!customer.name || !customer.phone || calculation.grandTotal === 0}
          className="w-full max-w-md py-8 rounded-[3rem] bg-[#25D366] text-white font-black text-lg uppercase tracking-[0.35em] shadow-2xl active:scale-95 disabled:grayscale disabled:opacity-20 transition-all flex items-center justify-center gap-4"
        >
          <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.246 2.248 3.484 5.232 3.484 8.412-.003 6.557-5.338 11.892-11.893 11.892-1.997-.001-3.951-.5-5.688-1.448l-6.309 1.656zm6.29-4.464c1.589.941 3.275 1.44 5.006 1.441 5.428 0 9.85-4.423 9.852-9.853 0-2.629-1.025-5.1-2.885-6.958a9.785 9.785 0 00-6.963-2.891c-5.43 0-9.853 4.426-9.854 9.856 0 1.732.453 3.422 1.312 4.931l-.995 3.634 3.727-.977zm11.273-7.795c-.3-.15-1.772-.875-2.046-.975-.274-.1-.474-.15-.674.15-.2.3-.774.975-.949 1.175-.175.2-.35.225-.65.075-.3-.15-1.263-.465-2.403-1.485-.888-.793-1.484-1.773-1.659-2.073-.175-.3-.019-.463.13-.613.135-.133.3-.35.45-.525.15-.175.2-.3.3-.5.1-.2.05-.375-.025-.525-.075-.15-.674-1.625-.924-2.225-.244-.593-.491-.512-.674-.521-.175-.008-.375-.01-.575-.01s-.525.075-.8.375c-.275.3-1.05 1.025-1.05 2.5s1.075 2.9 1.225 3.1c.15.2 2.112 3.224 5.118 4.522.715.309 1.273.493 1.708.631.718.228 1.369.196 1.883.118.573-.087 1.772-.725 2.022-1.425.25-.7.25-1.3.175-1.425-.075-.125-.275-.2-.575-.35z"/></svg>
          ENVIAR COTIZACIÓN
        </button>
      </div>
    </div>
  );
};

export default App;
