import React, { useState, useMemo } from 'react';
import { FabricGroup, FoamType } from './types';
import { 
  FOAM_MULTIPLIERS, 
  CUSHION_BASE_FACTOR, 
  CUSHION_AREA_FACTOR,
  CUSHION_PREMIUM_SURCHARGE,
  FURNITURE_PREMIUM_FABRIC_ADD,
  FURNITURE_VOLUME_FACTOR,
  STANDARD_MATTRESS_PRICES,
  MATTRESS_WHOLESALE_FACTOR,
  BUSINESS_WHATSAPP
} from './constants';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('mueble');
  const [customer, setCustomer] = useState({ name: '', phone: '' });
  
  // Estados de productos - Iniciando con 1 fila por defecto para móvil
  const [cushions, setCushions] = useState(() => [{ w: 45, h: 45, qty: 0 }]);
  const [seats, setSeats] = useState(() => [{ w: 50, h: 50, t: 10, qty: 0 }]);
  const [backrests, setBackrests] = useState(() => [{ w: 50, h: 40, t: 8, qty: 0 }]);
  
  // Estados Colchonetas
  const [mattresses, setMattresses] = useState(() => STANDARD_MATTRESS_PRICES.map(m => ({ ...m, qty: 0 })));
  const [customMattresses, setCustomMattresses] = useState(() => [{ w: 0, h: 0, t: 0, qty: 0 }]);

  // Estados de configuración
  const [cushionsFabricGroup, setCushionsFabricGroup] = useState<FabricGroup>(FabricGroup.A);
  const [furnitureFoamType, setFurnitureFoamType] = useState<FoamType>(FoamType.STANDARD);
  const [furnitureFabricGroup, setFurnitureFabricGroup] = useState<FabricGroup>(FabricGroup.A);

  const addRow = (type: 'cushion' | 'seat' | 'backrest' | 'customMattress') => {
    if (type === 'cushion') setCushions([...cushions, { w: 45, h: 45, qty: 0 }]);
    if (type === 'seat') setSeats([...seats, { w: 50, h: 50, t: 10, qty: 0 }]);
    if (type === 'backrest') setBackrests([...backrests, { w: 50, h: 40, t: 8, qty: 0 }]);
    if (type === 'customMattress') setCustomMattresses([...customMattresses, { w: 0, h: 0, t: 0, qty: 0 }]);
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

    customMattresses.forEach(it => {
      if (it.qty >= 4 && it.w > 0 && it.h > 0 && it.t > 0) {
        let vol = it.w * it.h * it.t;
        let unit = vol * MATTRESS_WHOLESALE_FACTOR;
        let sub = unit * it.qty;
        items.push({ label: `Colchoneta P. Mayor ${it.w}x${it.h}x${it.t}`, qty: it.qty, sub });
        grandTotal += sub;
      }
    });

    return { items, total: grandTotal };
  }, [cushions, seats, backrests, mattresses, customMattresses, cushionsFabricGroup, furnitureFoamType, furnitureFabricGroup]);

  const sendWhatsApp = () => {
    if (!customer.name || !customer.phone) return alert("Por favor ingresa tu nombre y número de teléfono");
    let detailMsg = calculation.items.map(i => `• ${i.qty}x ${i.label} -> $${i.sub.toFixed(2)}`).join('\n');
    let msg = `🧾 *COTIZACIÓN - COJINES SERGIO*\n\n*CLIENTE:* ${customer.name.toUpperCase()}\n*TELÉFONO:* ${customer.phone}\n\n*DETALLE:*\n${detailMsg}\n\n💰 *TOTAL: $${calculation.total.toFixed(2)}*`;
    window.open(`https://wa.me/${BUSINESS_WHATSAPP}?text=${encodeURIComponent(msg)}`);
  };

  const QtyBtn = ({ v, set }: { v: number, set: (n: number) => void }) => (
    <div className="flex items-center gap-2 bg-white/70 p-1.5 rounded-2xl border border-slate-200">
      <button onClick={() => set(Math.max(0, v - 1))} className="w-10 h-10 flex items-center justify-center text-[#005f6b] font-bold text-2xl active:bg-slate-100 rounded-lg transition-colors">-</button>
      <span className="w-6 text-center text-sm font-black text-slate-700">{v}</span>
      <button onClick={() => set(v + 1)} className="w-10 h-10 flex items-center justify-center text-[#005f6b] font-bold text-2xl active:bg-slate-100 rounded-lg transition-colors">+</button>
    </div>
  );

  const AddBtn = ({ onClick, label }: { onClick: () => void, label: string }) => (
    <button onClick={onClick} className="w-full mt-4 py-4 border-2 border-dashed border-slate-200 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:border-[#005f6b] hover:text-[#005f6b] transition-all active:scale-[0.98] bg-white/30">
      + Agregar {label}
    </button>
  );

  const selectionClass = (qty: number) => 
    `flex transition-all duration-300 ${qty > 0 ? 'bg-[#E0F7F9] border-[#80d8e4] shadow-md' : 'border-transparent'}`;

  const inputStyle = "w-full md:w-16 h-16 md:h-14 bg-white border border-slate-200 rounded-2xl text-center font-bold text-lg md:text-sm focus:border-[#005f6b] focus:ring-2 focus:ring-[#005f6b]/10 outline-none transition-all";

  return (
    <div className="min-h-screen pb-40">
      <header className="px-8 pt-10 pb-16 flex flex-col items-center relative">
        <h1 className="text-[26px] font-extrabold text-white tracking-tight leading-none drop-shadow-lg">Cojines Sergio</h1>
        <p className="text-[10px] font-bold text-white/70 letter-spacing-widest mt-2 uppercase">Taller de Tapicería</p>
      </header>

      <main className="max-w-xl mx-auto px-4 md:px-6">
        
        <nav className="flex items-center bg-white/10 backdrop-blur-md p-1.5 rounded-[2.5rem] mb-12 overflow-x-auto no-scrollbar gap-1 border border-white/20 shadow-sm sticky top-4 z-40 mx-2">
          {['cojin', 'mueble', 'colchoneta'].map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 min-w-fit py-4 px-5 rounded-[2rem] text-[9px] font-extrabold letter-spacing-wide transition-all whitespace-nowrap ${activeTab === tab ? 'bg-white text-[#005f6b] shadow-lg' : 'text-white/60'}`}
            >
              {tab === 'cojin' ? 'COJINES' : tab === 'mueble' ? 'MUEBLES' : 'COLCHONETAS'}
            </button>
          ))}
        </nav>

        <section className="space-y-12">
          <div className="flex items-center gap-4 px-2">
            <h2 className="text-[10px] font-extrabold text-white/70 letter-spacing-widest uppercase">1. MEDIDAS Y CANTIDADES (CM)</h2>
          </div>

          <div className="glass-card rounded-[2.5rem] p-6 md:p-8 shadow-sm">
            {activeTab === 'cojin' && (
              <div className="space-y-6">
                <h3 className="text-[11px] font-extrabold text-[#005f6b] tracking-wider uppercase">Cojines Decorativos</h3>
                {cushions.map((it, i) => (
                  <div key={i} className={`${selectionClass(it.qty)} flex-col md:flex-row md:items-center gap-4 p-4 rounded-3xl border`}>
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1 ml-1 md:hidden">Ancho</p>
                        <input type="number" value={it.w || ''} placeholder="An" onChange={e=>{let n=[...cushions]; n[i].w=Number(e.target.value); setCushions(n)}} className={inputStyle} />
                      </div>
                      <div className="flex-1">
                        <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1 ml-1 md:hidden">Alto</p>
                        <input type="number" value={it.h || ''} placeholder="Al" onChange={e=>{let n=[...cushions]; n[i].h=Number(e.target.value); setCushions(n)}} className={inputStyle} />
                      </div>
                    </div>
                    <div className="flex justify-between items-center md:ml-4">
                      <span className="md:hidden text-[10px] font-black text-[#005f6b]/40 uppercase tracking-widest">CANTIDAD</span>
                      <QtyBtn v={it.qty} set={v=>{let n=[...cushions]; n[i].qty=v; setCushions(n)}} />
                    </div>
                  </div>
                ))}
                <AddBtn onClick={() => addRow('cushion')} label="Cojín" />
              </div>
            )}

            {activeTab === 'mueble' && (
              <div className="space-y-10">
                <div>
                  <h3 className="text-[11px] font-extrabold text-[#005f6b] tracking-wider mb-6 uppercase">Asientos</h3>
                  <div className="space-y-6">
                    {seats.map((it, i) => (
                      <div key={i} className={`${selectionClass(it.qty)} flex-col md:flex-row md:items-center gap-4 p-4 rounded-3xl border`}>
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <p className="text-[8px] font-black text-slate-300 uppercase mb-1 ml-1 md:hidden">Largo</p>
                            <input type="number" value={it.w || ''} placeholder="L" title="Largo" onChange={e=>{let n=[...seats]; n[i].w=Number(e.target.value); setSeats(n)}} className={inputStyle} />
                          </div>
                          <div className="flex-1">
                            <p className="text-[8px] font-black text-slate-300 uppercase mb-1 ml-1 md:hidden">Ancho</p>
                            <input type="number" value={it.h || ''} placeholder="An" title="Ancho" onChange={e=>{let n=[...seats]; n[i].h=Number(e.target.value); setSeats(n)}} className={inputStyle} />
                          </div>
                          <div className="flex-1">
                            <p className="text-[8px] font-black text-slate-300 uppercase mb-1 ml-1 md:hidden">Esp</p>
                            <input type="number" value={it.t || ''} placeholder="Es" title="Espesor" onChange={e=>{let n=[...seats]; n[i].t=Number(e.target.value); setSeats(n)}} className={inputStyle} />
                          </div>
                        </div>
                        <div className="flex justify-between items-center md:ml-4">
                          <span className="md:hidden text-[10px] font-black text-[#005f6b]/40 uppercase tracking-widest">CANTIDAD</span>
                          <QtyBtn v={it.qty} set={v=>{let n=[...seats]; n[i].qty=v; setSeats(n)}} />
                        </div>
                      </div>
                    ))}
                    <AddBtn onClick={() => addRow('seat')} label="Asiento" />
                  </div>
                </div>

                <div className="pt-8 border-t border-slate-100">
                  <h3 className="text-[11px] font-extrabold text-[#005f6b] tracking-wider mb-6 uppercase">Espaldares</h3>
                  <div className="space-y-6">
                    {backrests.map((it, i) => (
                      <div key={i} className={`${selectionClass(it.qty)} flex-col md:flex-row md:items-center gap-4 p-4 rounded-3xl border`}>
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <p className="text-[8px] font-black text-slate-300 uppercase mb-1 ml-1 md:hidden">Largo</p>
                            <input type="number" value={it.w || ''} placeholder="L" title="Largo" onChange={e=>{let n=[...backrests]; n[i].w=Number(e.target.value); setBackrests(n)}} className={inputStyle} />
                          </div>
                          <div className="flex-1">
                            <p className="text-[8px] font-black text-slate-300 uppercase mb-1 ml-1 md:hidden">Ancho</p>
                            <input type="number" value={it.h || ''} placeholder="An" title="Ancho" onChange={e=>{let n=[...backrests]; n[i].h=Number(e.target.value); setBackrests(n)}} className={inputStyle} />
                          </div>
                          <div className="flex-1">
                            <p className="text-[8px] font-black text-slate-300 uppercase mb-1 ml-1 md:hidden">Esp</p>
                            <input type="number" value={it.t || ''} placeholder="Es" title="Espesor" onChange={e=>{let n=[...backrests]; n[i].t=Number(e.target.value); setBackrests(n)}} className={inputStyle} />
                          </div>
                        </div>
                        <div className="flex justify-between items-center md:ml-4">
                          <span className="md:hidden text-[10px] font-black text-[#005f6b]/40 uppercase tracking-widest">CANTIDAD</span>
                          <QtyBtn v={it.qty} set={v=>{let n=[...backrests]; n[i].qty=v; setBackrests(n)}} />
                        </div>
                      </div>
                    ))}
                    <AddBtn onClick={() => addRow('backrest')} label="Espaldar" />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'colchoneta' && (
              <div className="space-y-10">
                <div>
                  <h3 className="text-[11px] font-extrabold text-[#005f6b] tracking-wider mb-1 uppercase">Predefinidas</h3>
                  <p className="text-[8px] font-bold text-[#005f6b]/60 letter-spacing-widest uppercase mb-6">Impermeable + Premium</p>
                  <div className="space-y-3">
                    {mattresses.map((it, i) => (
                      <div key={i} className={`flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 ${it.qty > 0 ? 'bg-[#E0F7F9] border-[#80d8e4] shadow-md' : 'bg-slate-50/50 border-slate-100'}`}>
                        <div className="flex flex-col">
                          <span className="text-[12px] font-bold text-slate-700">{it.w}x{it.h}x{it.t} cm</span>
                          <span className="text-[11px] font-extrabold text-[#005f6b]">${it.unit}</span>
                        </div>
                        <QtyBtn v={it.qty} set={v=>{let n=[...mattresses]; n[i].qty=v; setMattresses(n)}} />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-8 border-t border-slate-100">
                  <h3 className="text-[11px] font-extrabold text-[#005f6b] tracking-wider mb-6 uppercase">A Medida (Por Mayor)</h3>
                  <div className="space-y-6">
                    {customMattresses.map((it, i) => (
                      <div key={i} className={`${selectionClass(it.qty)} flex-col md:flex-row md:items-center gap-4 p-4 rounded-3xl border`}>
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <p className="text-[8px] font-black text-slate-300 uppercase mb-1 ml-1 md:hidden">Largo</p>
                            <input type="number" value={it.w || ''} placeholder="Largo" onChange={e=>{let n=[...customMattresses]; n[i].w=Number(e.target.value); setCustomMattresses(n)}} className={inputStyle} />
                          </div>
                          <div className="flex-1">
                            <p className="text-[8px] font-black text-slate-300 uppercase mb-1 ml-1 md:hidden">Ancho</p>
                            <input type="number" value={it.h || ''} placeholder="Ancho" onChange={e=>{let n=[...customMattresses]; n[i].h=Number(e.target.value); setCustomMattresses(n)}} className={inputStyle} />
                          </div>
                          <div className="flex-1">
                            <p className="text-[8px] font-black text-slate-300 uppercase mb-1 ml-1 md:hidden">Esp</p>
                            <input type="number" value={it.t || ''} placeholder="Espesor" onChange={e=>{let n=[...customMattresses]; n[i].t=Number(e.target.value); setCustomMattresses(n)}} className={inputStyle} />
                          </div>
                        </div>
                        <div className="flex justify-between items-center md:ml-4">
                          <span className="md:hidden text-[10px] font-black text-[#005f6b]/40 uppercase tracking-widest">CANTIDAD</span>
                          <QtyBtn v={it.qty} set={v=>{let n=[...customMattresses]; n[i].qty=v; setCustomMattresses(n)}} />
                        </div>
                      </div>
                    ))}
                    <AddBtn onClick={() => addRow('customMattress')} label="Colchoneta" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="mt-16 space-y-8">
          <h2 className="text-[10px] font-extrabold text-white/60 letter-spacing-widest uppercase px-2">2. TELA Y ACABADOS</h2>
          <div className="glass-card rounded-[2.5rem] p-6 md:p-8 shadow-sm">
            {activeTab === 'cojin' && (
              <div className="flex flex-col gap-4">
                <p className="text-[9px] font-bold text-slate-400 mb-2 uppercase tracking-widest text-center">Tipo de Tela</p>
                <div className="flex flex-col gap-3">
                  {[FabricGroup.A, FabricGroup.B].map(g => (
                    <button 
                      key={g}
                      onClick={() => setCushionsFabricGroup(g)}
                      className={`w-full py-6 rounded-2xl border-2 transition-all flex flex-col items-center justify-center ${
                        cushionsFabricGroup === g ? 'border-[#005f6b] bg-[#005f6b]/5 text-[#005f6b]' : 'border-slate-100 bg-white/50 text-slate-400'
                      }`}
                    >
                      <span className="text-[11px] font-black uppercase tracking-widest">TELA TAPIZ {g === FabricGroup.A ? 'ESTÁNDAR' : 'PREMIUM'}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'mueble' && (
              <div className="space-y-10">
                <div>
                  <p className="text-[9px] font-bold text-slate-400 mb-4 uppercase tracking-widest text-center">Calidad de Esponja</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[FoamType.ECONOMY, FoamType.STANDARD, FoamType.PREMIUM].map((type) => (
                      <button 
                        key={type}
                        onClick={() => setFurnitureFoamType(type)}
                        className={`py-5 md:py-4 rounded-xl border-2 transition-all text-[9px] font-black uppercase tracking-widest ${
                          furnitureFoamType === type ? 'border-[#005f6b] bg-[#005f6b]/5 text-[#005f6b]' : 'border-slate-100 bg-white/50 text-slate-400'
                        }`}
                      >
                        {type === FoamType.ECONOMY ? 'Básica' : type === FoamType.STANDARD ? 'Estándar' : 'Premium'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[9px] font-bold text-slate-400 mb-4 uppercase tracking-widest text-center">Tipo de Tela</p>
                  <div className="flex flex-col gap-3">
                    {[FabricGroup.A, FabricGroup.B].map(g => (
                      <button 
                        key={g}
                        onClick={() => setFurnitureFabricGroup(g)}
                        className={`w-full py-6 rounded-2xl border-2 transition-all flex flex-col items-center justify-center ${
                          furnitureFabricGroup === g ? 'border-[#005f6b] bg-[#005f6b]/5 text-[#005f6b]' : 'border-slate-100 bg-white/50 text-slate-400'
                        }`}
                      >
                        <span className="text-[11px] font-black uppercase tracking-widest">TELA TAPIZ {g === FabricGroup.A ? 'ESTÁNDAR' : 'PREMIUM'}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'colchoneta' && (
              <div className="space-y-6">
                <div className="p-6 bg-white/50 rounded-2xl border border-slate-100 flex flex-col gap-6">
                  {[
                    { title: "ESPONJA PREMIUM", desc: "Alta densidad para máxima firmeza y durabilidad.", icon: "M5 13l4 4L19 7" },
                    { title: "SINTÉTICO DE CALIDAD", desc: "Expandible impermeable, fácil limpieza y uso diario.", icon: "M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" }
                  ].map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-[#E0F7F9] flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-[#005f6b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={feat.icon} />
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest mb-1">{feat.title}</h4>
                        <p className="text-[10px] font-bold text-slate-500 leading-relaxed">{feat.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="mt-16 mb-20 space-y-8">
          <div className="bg-[#005f6b]/95 backdrop-blur-md rounded-[2.5rem] p-10 text-white shadow-xl shadow-[#002b31]/40 border border-white/20 mx-2">
            <p className="text-[9px] font-black text-[#80d8e4] letter-spacing-widest uppercase mb-4">Presupuesto Estimado</p>
            <div className="flex items-baseline">
              <span className="text-xl font-bold mr-1 opacity-50">$</span>
              <span className="text-6xl font-extrabold tracking-tighter leading-none">{calculation.total.toFixed(2).split('.')[0]}</span>
              <span className="text-2xl font-bold opacity-30 ml-1">.{calculation.total.toFixed(2).split('.')[1]}</span>
            </div>
            {calculation.items.length > 0 && (
              <div className="mt-8 space-y-2 pt-6 border-t border-white/10 max-h-60 overflow-y-auto no-scrollbar">
                {calculation.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between text-[10px] font-bold uppercase tracking-tight">
                    <span className="opacity-70 truncate mr-4">{it.qty}x {it.label}</span>
                    <span className="text-[#80d8e4] flex-shrink-0">${it.sub.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="px-4 space-y-6">
            <input type="text" placeholder="NOMBRE COMPLETO" value={customer.name} onChange={e=>setCustomer({...customer, name:e.target.value})} className="w-full bg-white/20 backdrop-blur-sm border-b-2 border-white/30 py-5 px-3 font-black text-sm tracking-widest placeholder:text-white/40 text-white outline-none focus:border-white focus:bg-white/30 transition-all uppercase rounded-t-2xl" />
            <input type="tel" placeholder="TELÉFONO DE CONTACTO" value={customer.phone} onChange={e=>setCustomer({...customer, phone:e.target.value})} className="w-full bg-white/20 backdrop-blur-sm border-b-2 border-white/30 py-5 px-3 font-black text-sm tracking-widest placeholder:text-white/40 text-white outline-none focus:border-white focus:bg-white/30 transition-all rounded-t-2xl" />
          </div>
        </section>
      </main>

      <div className="fixed bottom-0 left-0 right-0 p-6 md:p-8 bg-white/95 backdrop-blur-xl border-t border-slate-100 z-50">
        <button 
          onClick={sendWhatsApp} 
          disabled={!customer.name || !customer.phone || calculation.total === 0} 
          className="w-full max-w-lg mx-auto h-16 md:h-18 rounded-[2rem] bg-[#005f6b] text-white font-black text-[11px] letter-spacing-widest uppercase shadow-2xl shadow-[#005f6b]/30 active:scale-95 disabled:opacity-20 transition-all flex items-center justify-center gap-4"
        >
          ENVIAR POR WHATSAPP
        </button>
      </div>
    </div>
  );
}