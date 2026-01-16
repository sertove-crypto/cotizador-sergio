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
  
  // Estados de productos
  const [cushions, setCushions] = useState(() => Array.from({ length: 3 }, () => ({ w: 45, h: 45, qty: 0 })));
  const [seats, setSeats] = useState(() => Array.from({ length: 3 }, () => ({ w: 50, h: 50, t: 10, qty: 0 })));
  const [backrests, setBackrests] = useState(() => Array.from({ length: 3 }, () => ({ w: 50, h: 40, t: 8, qty: 0 })));
  
  // Estados Colchonetas
  const [mattresses, setMattresses] = useState(() => STANDARD_MATTRESS_PRICES.map(m => ({ ...m, qty: 0 })));
  const [customMattresses, setCustomMattresses] = useState(() => Array.from({ length: 3 }, () => ({ w: 0, h: 0, t: 0, qty: 0 })));

  // Estados de configuración
  const [cushionsFabricGroup, setCushionsFabricGroup] = useState<FabricGroup>(FabricGroup.A);
  
  // Estados para Muebles (Asientos y Espaldares)
  const [furnitureFoamType, setFurnitureFoamType] = useState<FoamType>(FoamType.PREMIUM);
  const [furnitureFabricGroup, setFurnitureFabricGroup] = useState<FabricGroup>(FabricGroup.A);

  const calculation = useMemo(() => {
    let items: any[] = [];
    let grandTotal = 0;

    // Cojines Decorativos
    cushions.forEach(it => {
      if (it.qty > 0 && it.w > 0 && it.h > 0) {
        let area = it.w * it.h;
        let base = CUSHION_BASE_FACTOR + (area * CUSHION_AREA_FACTOR);
        
        // Ajuste: Si llega a 50x50cm (o más), el precio base es mínimo $10
        if (it.w >= 50 && it.h >= 50) {
          base = Math.max(base, 10.00);
        }

        let unit = cushionsFabricGroup === FabricGroup.B ? base + CUSHION_PREMIUM_SURCHARGE : base;
        
        items.push({ 
          label: `Cojín ${it.w}x${it.h} (${cushionsFabricGroup === FabricGroup.A ? 'Tapiz Estándar' : 'Tapiz Premium'})`, 
          qty: it.qty, 
          sub: unit * it.qty 
        });
        grandTotal += unit * it.qty;
      }
    });

    // Muebles (Asientos y Espaldares)
    const processFurniture = (list: any[], name: string) => {
      list.forEach(it => {
        if (it.qty > 0 && it.w > 0 && it.h > 0 && it.t > 0) {
          let vol = it.w * it.h * it.t;
          let base = (vol * FURNITURE_VOLUME_FACTOR) * FOAM_MULTIPLIERS[furnitureFoamType];
          let unit = base + (furnitureFabricGroup === FabricGroup.B ? FURNITURE_PREMIUM_FABRIC_ADD : 0);
          
          items.push({ 
            label: `${name} ${it.w}x${it.h}x${it.t} (Esp. ${furnitureFoamType} / ${furnitureFabricGroup === FabricGroup.A ? 'Tela Estándar' : 'Tela Premium'})`, 
            qty: it.qty, 
            sub: unit * it.qty 
          });
          grandTotal += unit * it.qty;
        }
      });
    };
    processFurniture(seats, "Asiento");
    processFurniture(backrests, "Espaldar");

    // Colchonetas Estándar
    mattresses.forEach(it => {
      if (it.qty > 0) {
        const sub = it.unit * it.qty;
        items.push({ label: `Colchoneta ${it.w}x${it.h}x${it.t}`, qty: it.qty, sub });
        grandTotal += sub;
      }
    });

    // Colchonetas Personalizadas
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
    <div className="flex items-center gap-2 bg-[#f1f5f9] p-1 rounded-xl border border-slate-200 ml-4">
      <button onClick={() => set(Math.max(0, v - 1))} className="w-8 h-8 flex items-center justify-center text-[#005f6b] font-bold text-xl">-</button>
      <span className="w-4 text-center text-[13px] font-bold text-slate-700">{v}</span>
      <button onClick={() => set(v + 1)} className="w-8 h-8 flex items-center justify-center text-[#005f6b] font-bold text-xl">+</button>
    </div>
  );

  return (
    <div className="min-h-screen pb-40">
      <header className="px-8 pt-10 pb-16 flex flex-col items-center relative">
        <h1 className="text-[26px] font-extrabold text-[#005f6b] tracking-tight leading-none">Cojines Sergio</h1>
        <p className="text-[10px] font-bold text-[#64748b] letter-spacing-widest mt-2 uppercase">Taller de Tapicería</p>
      </header>

      <main className="max-w-xl mx-auto px-6">
        
        <nav className="flex items-center bg-[#f1f5f9]/50 p-1.5 rounded-[2.5rem] mb-14 overflow-x-auto no-scrollbar gap-1">
          {['cojin', 'mueble', 'colchoneta'].map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 min-w-fit py-4 px-4 rounded-[2rem] text-[9px] font-extrabold letter-spacing-wide transition-all whitespace-nowrap ${activeTab === tab ? 'bg-[#005f6b] text-white shadow-lg shadow-[#005f6b]/20' : 'text-slate-400'}`}
            >
              {tab === 'cojin' ? 'COJINES DECORATIVOS' : tab === 'mueble' ? 'ASIENTOS Y ESPALDARES' : 'COLCHONETAS'}
            </button>
          ))}
        </nav>

        <section className="space-y-12">
          <div className="flex items-center gap-4">
            <h2 className="text-[10px] font-extrabold text-slate-400 letter-spacing-widest uppercase">1. MEDIDAS Y CANTIDADES (CM)</h2>
          </div>

          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-50/50">
            {activeTab === 'cojin' && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-[11px] font-extrabold text-[#005f6b] tracking-wider mb-1 uppercase">Cojines Decorativos</h3>
                  <p className="text-[8px] font-bold text-slate-300 letter-spacing-widest uppercase">Ancho x Alto</p>
                </div>
                {cushions.map((it, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <input type="number" value={it.w || ''} placeholder="An" onChange={e=>{let n=[...cushions]; n[i].w=Number(e.target.value); setCushions(n)}} className="w-16 h-14 bg-white border border-slate-200 rounded-2xl text-center font-bold text-sm focus:border-[#005f6b] outline-none" />
                    <input type="number" value={it.h || ''} placeholder="Al" onChange={e=>{let n=[...cushions]; n[i].h=Number(e.target.value); setCushions(n)}} className="w-16 h-14 bg-white border border-slate-200 rounded-2xl text-center font-bold text-sm focus:border-[#005f6b] outline-none" />
                    <div className="flex-1" />
                    <QtyBtn v={it.qty} set={v=>{let n=[...cushions]; n[i].qty=v; setCushions(n)}} />
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'mueble' && (
              <div className="space-y-10">
                <div>
                  <h3 className="text-[11px] font-extrabold text-[#005f6b] tracking-wider mb-1 uppercase">Asientos</h3>
                  <p className="text-[8px] font-bold text-slate-300 letter-spacing-widest uppercase">Largo x Ancho x Espesor</p>
                  <div className="mt-6 space-y-4">
                    {seats.map((it, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input type="number" value={it.w || ''} placeholder="L" title="Largo" onChange={e=>{let n=[...seats]; n[i].w=Number(e.target.value); setSeats(n)}} className="w-14 h-14 bg-white border border-slate-200 rounded-2xl text-center font-bold text-sm focus:border-[#005f6b] outline-none" />
                        <input type="number" value={it.h || ''} placeholder="An" title="Ancho" onChange={e=>{let n=[...seats]; n[i].h=Number(e.target.value); setSeats(n)}} className="w-14 h-14 bg-white border border-slate-200 rounded-2xl text-center font-bold text-sm focus:border-[#005f6b] outline-none" />
                        <input type="number" value={it.t || ''} placeholder="Es" title="Espesor" onChange={e=>{let n=[...seats]; n[i].t=Number(e.target.value); setSeats(n)}} className="w-14 h-14 bg-white border border-slate-200 rounded-2xl text-center font-bold text-sm focus:border-[#005f6b] outline-none" />
                        <div className="flex-1" />
                        <QtyBtn v={it.qty} set={v=>{let n=[...seats]; n[i].qty=v; setSeats(n)}} />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="pt-6 border-t border-slate-50">
                  <h3 className="text-[11px] font-extrabold text-[#005f6b] tracking-wider mb-1 uppercase">Espaldares</h3>
                  <p className="text-[8px] font-bold text-slate-300 letter-spacing-widest uppercase">Largo x Ancho x Espesor</p>
                  <div className="mt-6 space-y-4">
                    {backrests.map((it, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input type="number" value={it.w || ''} placeholder="L" title="Largo" onChange={e=>{let n=[...backrests]; n[i].w=Number(e.target.value); setBackrests(n)}} className="w-14 h-14 bg-white border border-slate-200 rounded-2xl text-center font-bold text-sm focus:border-[#005f6b] outline-none" />
                        <input type="number" value={it.h || ''} placeholder="An" title="Ancho" onChange={e=>{let n=[...backrests]; n[i].h=Number(e.target.value); setBackrests(n)}} className="w-14 h-14 bg-white border border-slate-200 rounded-2xl text-center font-bold text-sm focus:border-[#005f6b] outline-none" />
                        <input type="number" value={it.t || ''} placeholder="Es" title="Espesor" onChange={e=>{let n=[...backrests]; n[i].t=Number(e.target.value); setBackrests(n)}} className="w-14 h-14 bg-white border border-slate-200 rounded-2xl text-center font-bold text-sm focus:border-[#005f6b] outline-none" />
                        <div className="flex-1" />
                        <QtyBtn v={it.qty} set={v=>{let n=[...backrests]; n[i].qty=v; setBackrests(n)}} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'colchoneta' && (
              <div className="space-y-10">
                <div>
                  <h3 className="text-[11px] font-extrabold text-[#005f6b] tracking-wider mb-1 uppercase">Colchonetas por Unidad</h3>
                  <p className="text-[8px] font-bold text-emerald-600 letter-spacing-widest uppercase">Acabado Impermeable + Espuma Premium</p>
                  <div className="mt-6 space-y-3">
                    {mattresses.map((it, i) => (
                      <div key={i} className={`flex items-center justify-between p-4 rounded-2xl border ${it.qty > 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50/50 border-slate-100'}`}>
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
                  <h3 className="text-[11px] font-extrabold text-[#005f6b] tracking-wider mb-1 uppercase">A Medida (Por Mayor)</h3>
                  <p className="text-[8px] font-bold text-slate-400 letter-spacing-widest uppercase mb-6">Mínimo 4 unidades | $0.0005 x cm³</p>
                  <div className="space-y-4">
                    {customMattresses.map((it, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input type="number" value={it.w || ''} placeholder="Largo" onChange={e=>{let n=[...customMattresses]; n[i].w=Number(e.target.value); setCustomMattresses(n)}} className="w-20 h-14 bg-white border border-slate-200 rounded-2xl text-center font-bold text-xs focus:border-[#005f6b] outline-none" />
                        <input type="number" value={it.h || ''} placeholder="Ancho" onChange={e=>{let n=[...customMattresses]; n[i].h=Number(e.target.value); setCustomMattresses(n)}} className="w-20 h-14 bg-white border border-slate-200 rounded-2xl text-center font-bold text-xs focus:border-[#005f6b] outline-none" />
                        <input type="number" value={it.t || ''} placeholder="Espesor" onChange={e=>{let n=[...customMattresses]; n[i].t=Number(e.target.value); setCustomMattresses(n)}} className="w-20 h-14 bg-white border border-slate-200 rounded-2xl text-center font-bold text-xs focus:border-[#005f6b] outline-none" />
                        <div className="flex-1" />
                        <QtyBtn v={it.qty} set={v=>{let n=[...customMattresses]; n[i].qty=v; setCustomMattresses(n)}} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Sección 2: Telas y Acabados */}
        <section className="mt-16 space-y-8">
          <h2 className="text-[10px] font-extrabold text-slate-400 letter-spacing-widest uppercase">2. TELA Y ACABADOS</h2>
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-50/50">
            
            {activeTab === 'cojin' && (
              /* Bloque para Cojines: Selección simplificada */
              <div className="flex flex-col gap-4">
                <p className="text-[9px] font-bold text-slate-400 mb-2 uppercase tracking-widest text-center">Selecciona el tipo de tela</p>
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => setCushionsFabricGroup(FabricGroup.A)}
                    className={`w-full py-6 rounded-2xl border-2 transition-all flex flex-col items-center justify-center ${
                      cushionsFabricGroup === FabricGroup.A 
                      ? 'border-[#005f6b] bg-[#005f6b]/5 text-[#005f6b]' 
                      : 'border-slate-100 bg-white text-slate-400'
                    }`}
                  >
                    <span className="text-[11px] font-black uppercase tracking-widest">TELA TAPIZ ESTANDAR</span>
                  </button>
                  <button 
                    onClick={() => setCushionsFabricGroup(FabricGroup.B)}
                    className={`w-full py-6 rounded-2xl border-2 transition-all flex flex-col items-center justify-center ${
                      cushionsFabricGroup === FabricGroup.B 
                      ? 'border-[#005f6b] bg-[#005f6b]/5 text-[#005f6b]' 
                      : 'border-slate-100 bg-white text-slate-400'
                    }`}
                  >
                    <span className="text-[11px] font-black uppercase tracking-widest">TELA TAPIZ PREMIUM</span>
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'mueble' && (
              /* Bloque para Muebles (Asientos y Espaldares): Selección de Calidad */
              <div className="space-y-10">
                <div>
                  <p className="text-[9px] font-bold text-slate-400 mb-4 uppercase tracking-widest text-center">Calidad de Esponja</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[FoamType.ECONOMY, FoamType.STANDARD, FoamType.PREMIUM].map((type) => (
                      <button 
                        key={type}
                        onClick={() => setFurnitureFoamType(type)}
                        className={`py-4 rounded-xl border-2 transition-all text-[9px] font-black uppercase tracking-widest ${
                          furnitureFoamType === type 
                          ? 'border-[#005f6b] bg-[#005f6b]/5 text-[#005f6b]' 
                          : 'border-slate-100 bg-white text-slate-400'
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
                    <button 
                      onClick={() => setFurnitureFabricGroup(FabricGroup.A)}
                      className={`w-full py-6 rounded-2xl border-2 transition-all flex flex-col items-center justify-center ${
                        furnitureFabricGroup === FabricGroup.A 
                        ? 'border-[#005f6b] bg-[#005f6b]/5 text-[#005f6b]' 
                        : 'border-slate-100 bg-white text-slate-400'
                      }`}
                    >
                      <span className="text-[11px] font-black uppercase tracking-widest">TELA TAPIZ ESTANDAR</span>
                    </button>
                    <button 
                      onClick={() => setFurnitureFabricGroup(FabricGroup.B)}
                      className={`w-full py-6 rounded-2xl border-2 transition-all flex flex-col items-center justify-center ${
                        furnitureFabricGroup === FabricGroup.B 
                        ? 'border-[#005f6b] bg-[#005f6b]/5 text-[#005f6b]' 
                        : 'border-slate-100 bg-white text-slate-400'
                      }`}
                    >
                      <span className="text-[11px] font-black uppercase tracking-widest">TELA TAPIZ PREMIUM</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'colchoneta' && (
              /* Bloque para Colchonetas: Detalle de Calidad Fija */
              <div className="space-y-6">
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest mb-1">ESPONJA PREMIUM</h4>
                      <p className="text-[10px] font-bold text-slate-500 leading-relaxed">
                        Utilizamos esponja de alta densidad para asegurar la firmeza y durabilidad necesaria en colchonetas
                      </p>
                    </div>
                  </div>
                  
                  <div className="h-px bg-slate-200 w-full" />

                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#005f6b]/10 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-[#005f6b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest mb-1">MATERIAL SINTETICO DE ALTA CALIDAD</h4>
                      <p className="text-[10px] font-bold text-slate-500 leading-relaxed">
                        Expandible impermeable ideal para el uso diario y fácil limpieza
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="mt-16 mb-20 space-y-8">
          <div className="bg-[#005f6b] rounded-[2.5rem] p-10 text-white shadow-xl shadow-[#005f6b]/20">
            <p className="text-[9px] font-black text-[#80d8e4] letter-spacing-widest uppercase mb-4">Presupuesto Estimado</p>
            <div className="flex items-baseline">
              <span className="text-xl font-bold mr-1 opacity-50">$</span>
              <span className="text-6xl font-extrabold tracking-tighter leading-none">{Math.floor(calculation.total)}</span>
              <span className="text-2xl font-bold opacity-30 ml-1">.{(calculation.total % 1).toFixed(2).split('.')[1]}</span>
            </div>
            {calculation.items.length > 0 && (
              <div className="mt-8 space-y-2 pt-6 border-t border-white/10">
                {calculation.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between text-[10px] font-bold uppercase tracking-tight">
                    <span className="opacity-70">{it.qty}x {it.label}</span>
                    <span className="text-[#80d8e4]">${it.sub.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="px-2 space-y-6">
            <div>
              <input type="text" placeholder="NOMBRE PARA EL PRESUPUESTO" value={customer.name} onChange={e=>setCustomer({...customer, name:e.target.value})} className="w-full bg-transparent border-b-2 border-slate-200 py-4 font-bold text-sm tracking-widest placeholder:text-slate-300 outline-none focus:border-[#005f6b] transition-all uppercase" />
            </div>
            <div>
              <input type="tel" placeholder="NÚMERO DE TELÉFONO" value={customer.phone} onChange={e=>setCustomer({...customer, phone:e.target.value})} className="w-full bg-transparent border-b-2 border-slate-200 py-4 font-bold text-sm tracking-widest placeholder:text-slate-300 outline-none focus:border-[#005f6b] transition-all" />
            </div>
          </div>
        </section>
      </main>

      <div className="fixed bottom-0 left-0 right-0 p-8 bg-white/80 backdrop-blur-xl border-t border-slate-100 z-50">
        <button 
          onClick={sendWhatsApp} 
          disabled={!customer.name || !customer.phone || calculation.total === 0} 
          className="w-full max-w-md mx-auto h-16 rounded-[2rem] bg-[#005f6b] text-white font-extrabold text-[11px] letter-spacing-widest uppercase shadow-2xl shadow-[#005f6b]/30 active:scale-95 disabled:opacity-20 transition-all flex items-center justify-center gap-4"
        >
          ENVIAR COTIZACIÓN POR WHATSAPP
        </button>
      </div>
    </div>
  );
}
