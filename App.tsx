
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
  BUSINESS_WHATSAPP
} from './constants';

export default function App() {
  const [activeTab, setActiveTab] = useState('cojin');
  const [customer, setCustomer] = useState({ name: '', phone: '' });
  
  const [cushionItems, setCushionItems] = useState(() => 
    Array.from({ length: 3 }, () => ({ w: 40, h: 40, qty: 0 }))
  );
  
  const [seats, setSeats] = useState(() => 
    Array.from({ length: 4 }, () => ({ w: 50, h: 50, t: 10, qty: 0 }))
  );
  
  const [backrests, setBackrests] = useState(() => 
    Array.from({ length: 4 }, () => ({ w: 50, h: 40, t: 8, qty: 0 }))
  );
  
  const [stdMattresses, setStdMattresses] = useState(() => 
    STANDARD_MATTRESS_PRICES.map(m => ({ ...m, qty: 0 }))
  );

  const calculation = useMemo(() => {
    let items = [];
    let total = 0;

    cushionItems.forEach(it => {
      if (it.qty > 0 && it.w > 0 && it.h > 0) {
        let price = CUSHION_BASE_FACTOR + (it.w * it.h * CUSHION_AREA_FACTOR);
        let sub = Number((price * it.qty).toFixed(2));
        items.push({ label: `Cojín ${it.w}x${it.h}`, qty: it.qty, sub });
        total += sub;
      }
    });

    const calcFurn = (list, name) => {
      list.forEach(it => {
        if (it.qty > 0 && it.w > 0 && it.h > 0 && it.t > 0) {
          let price = (it.w * it.h * it.t * FURNITURE_VOLUME_FACTOR);
          let sub = Number((price * it.qty).toFixed(2));
          items.push({ label: `${name} ${it.w}x${it.h}x${it.t}`, qty: it.qty, sub });
          total += sub;
        }
      });
    };
    calcFurn(seats, "Asiento");
    calcFurn(backrests, "Espaldar");

    stdMattresses.forEach(it => {
      if (it.qty > 0) {
        let sub = Number((it.price * it.qty).toFixed(2));
        items.push({ label: `Colchoneta ${it.w}x${it.h}`, qty: it.qty, sub });
        total += sub;
      }
    });

    return { items, total: Number(total.toFixed(2)) };
  }, [cushionItems, seats, backrests, stdMattresses]);

  const sendWA = () => {
    let detail = calculation.items.map(i => `• ${i.qty}x ${i.label} ($${i.sub})`).join('\n');
    let msg = `🧾 *COTIZACIÓN SERGIO*\n\n${detail}\n\n💰 *TOTAL: $${calculation.total.toFixed(2)}*\n\n👤 *Cliente:* ${customer.name}`;
    window.open(`https://wa.me/${BUSINESS_WHATSAPP}?text=${encodeURIComponent(msg)}`);
  };

  const Qty = ({ v, set }) => (
    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
      <button onClick={() => set(Math.max(0, v - 1))} className="w-8 h-8 bg-white rounded-lg font-bold shadow-sm">-</button>
      <span className="w-6 text-center text-xs font-bold">{v}</span>
      <button onClick={() => set(v + 1)} className="w-8 h-8 bg-white rounded-lg font-bold shadow-sm">+</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFB] pb-32 animate-fade-in">
      <header className="bg-white p-6 border-b border-slate-100 sticky top-0 z-50 flex justify-between items-center shadow-sm">
        <h1 className="font-black text-emerald-900 text-lg">Cojines Sergio</h1>
        <div className="px-3 py-1 bg-emerald-50 rounded-full border border-emerald-100 text-[10px] font-bold text-emerald-600">v1.9</div>
      </header>

      <main className="max-w-md mx-auto p-5 space-y-8">
        <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-slate-100 gap-1">
          {['cojin', 'mueble', 'colchoneta'].map(t => (
            <button key={t} onClick={() => setActiveTab(t)} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === t ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400'}`}>
              {t === 'cojin' ? 'Cojines' : t === 'mueble' ? 'Muebles' : 'Colchones'}
            </button>
          ))}
        </div>

        <section className="bg-white rounded-[2rem] p-5 shadow-xl border border-slate-50 space-y-3">
          {activeTab === 'cojin' && cushionItems.map((it, i) => (
            <div key={i} className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl">
              <input type="number" placeholder="An" value={it.w || ''} onChange={e=>{let n=[...cushionItems]; n[i].w=Number(e.target.value); setCushionItems(n)}} className="w-14 p-2 rounded-lg border text-center text-sm font-bold" />
              <input type="number" placeholder="Al" value={it.h || ''} onChange={e=>{let n=[...cushionItems]; n[i].h=Number(e.target.value); setCushionItems(n)}} className="w-14 p-2 rounded-lg border text-center text-sm font-bold" />
              <div className="flex-1" />
              <Qty v={it.qty} set={v=>{let n=[...cushionItems]; n[i].qty=v; setCushionItems(n)}} />
            </div>
          ))}

          {activeTab === 'mueble' && [...seats, ...backrests].map((it, i) => (
            <div key={i} className="flex items-center gap-1.5 p-2 bg-slate-50 rounded-xl">
              <input type="number" placeholder="L" value={it.w || ''} onChange={e=>{if(i<4){let n=[...seats];n[i].w=Number(e.target.value);setSeats(n)}else{let n=[...backrests];n[i-4].w=Number(e.target.value);setBackrests(n)}}} className="w-11 p-2 rounded-lg border text-center text-[10px] font-bold" />
              <input type="number" placeholder="An" value={it.h || ''} onChange={e=>{if(i<4){let n=[...seats];n[i].h=Number(e.target.value);setSeats(n)}else{let n=[...backrests];n[i-4].h=Number(e.target.value);setBackrests(n)}}} className="w-11 p-2 rounded-lg border text-center text-[10px] font-bold" />
              <input type="number" placeholder="Es" value={it.t || ''} onChange={e=>{if(i<4){let n=[...seats];n[i].t=Number(e.target.value);setSeats(n)}else{let n=[...backrests];n[i-4].t=Number(e.target.value);setBackrests(n)}}} className="w-11 p-2 rounded-lg border text-center text-[10px] font-bold" />
              <div className="flex-1 text-[8px] font-bold opacity-30">{i<4?'ASI':'ESP'}</div>
              <Qty v={it.qty} set={v=>{if(i<4){let n=[...seats];n[i].qty=v;setSeats(n)}else{let n=[...backrests];n[i-4].qty=v;setBackrests(n)}}} />
            </div>
          ))}

          {activeTab === 'colchoneta' && stdMattresses.map((it, i) => (
            <div key={i} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
              <span className="text-xs font-bold text-slate-600">{it.w}x{it.h}x{it.t} cm</span>
              <Qty v={it.qty} set={v=>{let n=[...stdMattresses]; n[i].qty=v; setStdMattresses(n)}} />
            </div>
          ))}
        </section>

        <section className="bg-emerald-950 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Total Estimado</p>
            <div className="flex items-baseline mt-2">
              <span className="text-2xl font-bold text-emerald-500 mr-1">$</span>
              <span className="text-6xl font-black tracking-tighter">{calculation.total.toFixed(2).split('.')[0]}</span>
              <span className="text-xl opacity-30">.{calculation.total.toFixed(2).split('.')[1]}</span>
            </div>
          </div>
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-emerald-500/10 blur-3xl rounded-full"></div>
        </section>

        <section className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 space-y-4">
          <input type="text" placeholder="Tu Nombre" value={customer.name} onChange={e=>setCustomer({...customer, name:e.target.value})} className="w-full p-4 bg-slate-50 rounded-xl font-bold border-2 border-transparent focus:border-emerald-500 outline-none transition-all" />
        </section>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-md border-t border-slate-100 z-50">
        <button 
          onClick={sendWA}
          disabled={!customer.name || calculation.total === 0}
          className="w-full py-5 rounded-2xl bg-emerald-600 text-white font-black text-xs uppercase tracking-widest shadow-lg disabled:opacity-20 active:scale-95 transition-all"
        >
          Enviar WhatsApp
        </button>
      </footer>
    </div>
  );
}
