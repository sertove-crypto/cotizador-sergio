
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
  // --- Gestión de Catálogo ---
  const [allFabrics, setAllFabrics] = useState<Record<FabricGroup, Fabric[]>>(FABRIC_CATALOG);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingFabric, setEditingFabric] = useState<{group: FabricGroup, index: number} | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('sergio_fabrics_v3');
    if (saved) {
      try { setAllFabrics(JSON.parse(saved)); } catch (e) { console.error(e); }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('sergio_fabrics_v3', JSON.stringify(allFabrics));
  }, [allFabrics]);

  // --- Estados de la Interfaz ---
  const [activeTab, setActiveTab] = useState<'cojin' | 'mueble'>('cojin');
  
  // Cojín único
  const [cushionDim, setCushionDim] = useState({ w: 45, h: 45, qty: 1 });

  // Múltiples asientos y espaldares (5 de cada uno)
  const [seats, setSeats] = useState<MultiItem[]>(() => 
    Array.from({ length: 5 }, (_, i) => ({ w: 60, h: 60, t: 10, qty: i === 0 ? 1 : 0 }))
  );
  const [backrests, setBackrests] = useState<MultiItem[]>(() => 
    Array.from({ length: 5 }, () => ({ w: 60, h: 40, t: 8, qty: 0 }))
  );

  // Configuraciones de Calidad
  const [fabricGroup, setFabricGroup] = useState<FabricGroup>(FabricGroup.A);
  const [fabricName, setFabricName] = useState('');
  const [foamType, setFoamType] = useState<FoamType>(FoamType.STANDARD);
  const [customer, setCustomer] = useState<CustomerData>({ name: '', phone: '' });

  // Sincronización de tela al cambiar de gama
  useEffect(() => {
    const groupList = allFabrics[fabricGroup];
    if (groupList.length > 0) {
      const exists = groupList.some(f => f.name === fabricName);
      if (!exists) setFabricName(groupList[0].name);
    }
  }, [fabricGroup, allFabrics]);

  // --- Lógica de Cotización ---
  const calculation = useMemo(() => {
    const summaryItems: { label: string; qty: number; total: number }[] = [];
    let grandTotal = 0;

    if (activeTab === 'cojin') {
      const area = cushionDim.w * cushionDim.h;
      const base = CUSHION_BASE_FACTOR + (area * CUSHION_AREA_FACTOR);
      let unitPrice = fabricGroup === FabricGroup.B ? base + CUSHION_PREMIUM_SURCHARGE : base;
      unitPrice = Math.max(5, unitPrice); // Sin redondeo para precisión
      const subtotal = unitPrice * cushionDim.qty;
      
      summaryItems.push({
        label: `Cojín Decorativo`,
        qty: cushionDim.qty,
        total: subtotal
      });
      grandTotal = subtotal;
    } else {
      let totalSeatQty = 0;
      let totalSeatPrice = 0;
      let totalBackrestQty = 0;
      let totalBackrestPrice = 0;

      seats.forEach((item) => {
        if (item.qty > 0) {
          const volume = item.w * item.h * item.t;
          const base = volume * FURNITURE_VOLUME_FACTOR;
          let unitPrice = base * FOAM_MULTIPLIERS[foamType];
          if (fabricGroup === FabricGroup.B) unitPrice += FURNITURE_PREMIUM_FABRIC_ADD;
          totalSeatQty += item.qty;
          totalSeatPrice += unitPrice * item.qty;
        }
      });

      backrests.forEach((item) => {
        if (item.qty > 0) {
          const volume = item.w * item.h * item.t;
          const base = volume * FURNITURE_VOLUME_FACTOR;
          let unitPrice = base * FOAM_MULTIPLIERS[foamType];
          if (fabricGroup === FabricGroup.B) unitPrice += FURNITURE_PREMIUM_FABRIC_ADD;
          totalBackrestQty += item.qty;
          totalBackrestPrice += unitPrice * item.qty;
        }
      });

      if (totalSeatQty > 0) summaryItems.push({ label: 'Total Asientos', qty: totalSeatQty, total: totalSeatPrice });
      if (totalBackrestQty > 0) summaryItems.push({ label: 'Total Espaldares', qty: totalBackrestQty, total: totalBackrestPrice });
      
      grandTotal = totalSeatPrice + totalBackrestPrice;
    }

    return { summaryItems, grandTotal };
  }, [activeTab, cushionDim, seats, backrests, fabricGroup, foamType]);

  const handleSendWhatsApp = () => {
    if (!customer.name || !customer.phone) return;
    
    let detailedMsg = "";
    if (activeTab === 'cojin') {
      detailedMsg = `• ${cushionDim.qty}x Cojín Decorativo (${cushionDim.w}x${cushionDim.h} cm)\n`;
    } else {
      seats.forEach(s => { if(s.qty > 0) detailedMsg += `• ${s.qty}x Asiento (${s.w}x${s.h}x${s.t} cm)\n`; });
      backrests.forEach(b => { if(b.qty > 0) detailedMsg += `• ${b.qty}x Espaldar (${b.w}x${b.h}x${b.t} cm)\n`; });
    }

    const fabricType = fabricGroup === FabricGroup.A ? 'Estándar' : 'Premium';
    const message = `🧾 *NUEVA SOLICITUD DE COTIZACIÓN*\n\n*LÍNEA:* ${activeTab === 'cojin' ? 'Decoración' : 'Muebles'}\n\n*PRODUCTOS:*\n${detailedMsg}\n*DETALLES:* \n- Tela: ${fabricType} (${fabricName})\n${activeTab === 'mueble' ? `- Espuma: ${foamType}\n` : ''}\n💰 *TOTAL ESTIMADO: $${calculation.grandTotal.toFixed(2)}*\n\n----------------------------\n👤 *Cliente:* ${customer.name}\n📱 *WhatsApp:* ${customer.phone}\n----------------------------\n_Cotizado vía App_`;
    
    window.open(`https://wa.me/${BUSINESS_WHATSAPP}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const updateMulti = (setter: React.Dispatch<React.SetStateAction<MultiItem[]>>, index: number, field: keyof MultiItem, val: number) => {
    setter(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };
      return next;
    });
  };

  const QuantitySelector = ({ qty, onChange }: { qty: number, onChange: (val: number) => void }) => (
    <div className="flex bg-slate-100 p-1 rounded-xl items-center gap-2">
      <button onClick={() => onChange(Math.max(0, qty - 1))} className="w-8 h-8 flex items-center justify-center font-black bg-white rounded-lg shadow-sm text-sm active:scale-90">-</button>
      <span className="font-black text-xs w-3 text-center">{qty}</span>
      <button onClick={() => onChange(qty + 1)} className="w-8 h-8 flex items-center justify-center font-black bg-white rounded-lg shadow-sm text-sm active:scale-90">+</button>
    </div>
  );

  return (
    <div className="min-h-screen pb-40 bg-[#F8FAFB]">
      {/* INPUT OCULTO PARA SUBIR FOTOS */}
      <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={(e) => {
        const file = e.target.files?.[0];
        if (!file || !editingFabric) return;
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 600;
            const scale = MAX_WIDTH / img.width;
            canvas.width = MAX_WIDTH;
            canvas.height = img.height * scale;
            canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
            const newCatalog = { ...allFabrics };
            newCatalog[editingFabric.group][editingFabric.index].image = canvas.toDataURL('image/jpeg', 0.8);
            setAllFabrics(newCatalog);
            setEditingFabric(null);
          };
          img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
      }} />

      {/* HEADER */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-100 py-5 px-6 sticky top-0 z-50">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex-1 pr-4">
            <h1 className="text-lg font-black text-[#005F6B] leading-tight tracking-tight">Cojines y accesorios para el hogar</h1>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Cotizador Automático</p>
          </div>
          <button onClick={() => setIsAdminOpen(true)} className="p-3 rounded-2xl bg-slate-50 text-slate-400 border border-slate-100 active:scale-95">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path></svg>
          </button>
        </div>
      </header>

      {/* PANEL ADMIN (SOLO VISIBLE AL TOCAR ENGRANAJE) */}
      {isAdminOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="max-w-md mx-auto bg-white rounded-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom-10 duration-300">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-black text-slate-900">Configurar Catálogo</h2>
              <button onClick={() => setIsAdminOpen(false)} className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold">×</button>
            </div>
            {(['A', 'B'] as FabricGroup[]).map(group => (
              <div key={group} className="mb-10">
                <div className="flex justify-between border-b-2 border-slate-50 pb-2 mb-4">
                  <span className="text-[10px] font-black uppercase text-slate-400">Gama {group}</span>
                  <button onClick={() => {
                    const n = {...allFabrics}; 
                    n[group] = [...n[group], { name: 'Nueva Tela', image: 'https://images.unsplash.com/photo-1544441893-675973e31985?w=200' }]; 
                    setAllFabrics(n);
                  }} className="text-[10px] font-bold text-[#005F6B]">+ AÑADIR TELA</button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {allFabrics[group].map((f, i) => (
                    <div key={i} className="bg-slate-50 p-3 rounded-2xl relative group">
                      <img src={f.image} className="w-full aspect-square object-cover rounded-xl mb-3" />
                      <button onClick={() => { setEditingFabric({group, index: i}); fileInputRef.current?.click(); }} className="absolute top-4 right-4 bg-white/90 p-2 rounded-lg shadow-sm">📷</button>
                      <input value={f.name} onChange={(e) => { const n = {...allFabrics}; n[group][i].name = e.target.value; setAllFabrics(n); }} className="w-full text-[10px] uppercase font-bold text-center bg-transparent border-none outline-none" />
                      <button onClick={() => { if(confirm('¿Eliminar?')){const n={...allFabrics}; n[group].splice(i,1); setAllFabrics(n);} }} className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center shadow-lg">×</button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <main className="max-w-md mx-auto px-6 pt-6 space-y-10">
        {/* TABS PRINCIPALES */}
        <div className="bg-white p-1.5 rounded-[2.2rem] border border-slate-100 flex step-shadow">
          <button onClick={() => setActiveTab('cojin')} className={`flex-1 py-4 rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'cojin' ? 'bg-[#005F6B] text-white shadow-xl shadow-teal-900/20' : 'text-slate-400 opacity-60'}`}>Cojín Decorativo</button>
          <button onClick={() => setActiveTab('mueble')} className={`flex-1 py-4 rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'mueble' ? 'bg-[#005F6B] text-white shadow-xl shadow-teal-900/20' : 'text-slate-400 opacity-60'}`}>Asiento y Espaldar</button>
        </div>

        {/* PASO 1: MEDIDAS */}
        <section className="space-y-4">
          <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[9px]">1</span>
            Configurar Medidas (cm)
          </label>

          {activeTab === 'cojin' ? (
            <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl space-y-8">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <span className="text-[9px] font-black text-slate-300 uppercase ml-1">Ancho</span>
                  <input type="number" value={cushionDim.w} onChange={(e) => setCushionDim(p => ({...p, w: Number(e.target.value)}))} className="w-full px-5 py-5 bg-slate-50 rounded-2xl text-base font-black border-2 border-transparent focus:border-[#005F6B] outline-none" />
                </div>
                <div className="space-y-2">
                  <span className="text-[9px] font-black text-slate-300 uppercase ml-1">Alto</span>
                  <input type="number" value={cushionDim.h} onChange={(e) => setCushionDim(p => ({...p, h: Number(e.target.value)}))} className="w-full px-5 py-5 bg-slate-50 rounded-2xl text-base font-black border-2 border-transparent focus:border-[#005F6B] outline-none" />
                </div>
              </div>
              <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                <span className="text-[10px] font-black text-slate-400 uppercase">Cantidad</span>
                <QuantitySelector qty={cushionDim.qty} onChange={(val) => setCushionDim(p => ({...p, qty: val}))} />
              </div>
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in duration-300">
              {/* TABLA DE ASIENTOS */}
              <div className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-xl">
                <span className="text-[11px] font-black text-[#005F6B] uppercase block mb-6 px-2">Lista de Asientos</span>
                <div className="grid grid-cols-4 gap-2 mb-3 px-1 text-center">
                  {['Ancho', 'Alto', 'Espesor', 'Cant.'].map(h => <span key={h} className="text-[8px] font-black text-slate-400 uppercase">{h}</span>)}
                </div>
                <div className="space-y-3">
                  {seats.map((s, i) => (
                    <div key={`s-${i}`} className={`flex items-center gap-2 p-2 rounded-2xl ${s.qty > 0 ? 'bg-teal-50/50 ring-1 ring-teal-100' : 'bg-slate-50'}`}>
                      <input type="number" value={s.w} onChange={(e) => updateMulti(setSeats, i, 'w', Number(e.target.value))} className="w-full bg-white rounded-lg py-2 text-center text-xs font-bold shadow-sm focus:ring-1 focus:ring-[#005F6B] outline-none" />
                      <input type="number" value={s.h} onChange={(e) => updateMulti(setSeats, i, 'h', Number(e.target.value))} className="w-full bg-white rounded-lg py-2 text-center text-xs font-bold shadow-sm focus:ring-1 focus:ring-[#005F6B] outline-none" />
                      <input type="number" value={s.t} onChange={(e) => updateMulti(setSeats, i, 't', Number(e.target.value))} className="w-full bg-white rounded-lg py-2 text-center text-xs font-bold shadow-sm focus:ring-1 focus:ring-[#005F6B] outline-none" />
                      <QuantitySelector qty={s.qty} onChange={(val) => updateMulti(setSeats, i, 'qty', val)} />
                    </div>
                  ))}
                </div>
              </div>

              {/* TABLA DE ESPALDARES */}
              <div className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-xl">
                <span className="text-[11px] font-black text-[#005F6B] uppercase block mb-6 px-2">Lista de Espaldares</span>
                <div className="grid grid-cols-4 gap-2 mb-3 px-1 text-center">
                  {['Ancho', 'Alto', 'Espesor', 'Cant.'].map(h => <span key={h} className="text-[8px] font-black text-slate-400 uppercase">{h}</span>)}
                </div>
                <div className="space-y-3">
                  {backrests.map((b, i) => (
                    <div key={`b-${i}`} className={`flex items-center gap-2 p-2 rounded-2xl ${b.qty > 0 ? 'bg-teal-50/50 ring-1 ring-teal-100' : 'bg-slate-50'}`}>
                      <input type="number" value={b.w} onChange={(e) => updateMulti(setBackrests, i, 'w', Number(e.target.value))} className="w-full bg-white rounded-lg py-2 text-center text-xs font-bold shadow-sm focus:ring-1 focus:ring-[#005F6B] outline-none" />
                      <input type="number" value={b.h} onChange={(e) => updateMulti(setBackrests, i, 'h', Number(e.target.value))} className="w-full bg-white rounded-lg py-2 text-center text-xs font-bold shadow-sm focus:ring-1 focus:ring-[#005F6B] outline-none" />
                      <input type="number" value={b.t} onChange={(e) => updateMulti(setBackrests, i, 't', Number(e.target.value))} className="w-full bg-white rounded-lg py-2 text-center text-xs font-bold shadow-sm focus:ring-1 focus:ring-[#005F6B] outline-none" />
                      <QuantitySelector qty={b.qty} onChange={(val) => updateMulti(setBackrests, i, 'qty', val)} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* PASO 2: TELA Y ESPUMA */}
        <section className="bg-white rounded-[2.5rem] p-9 border border-slate-100 shadow-xl space-y-8">
          <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[9px]">2</span>
            Materiales y Acabados
          </label>
          <div className="space-y-10">
            {activeTab === 'mueble' && (
              <div className="space-y-4">
                <span className="text-[9px] font-black text-slate-400 uppercase block ml-1">Calidad de Espuma</span>
                <div className="grid grid-cols-3 gap-2 p-1 bg-slate-50 rounded-2xl">
                  {[FoamType.ECONOMY, FoamType.STANDARD, FoamType.PREMIUM].map(f => (
                    <button key={f} onClick={() => setFoamType(f)} className={`py-4 rounded-xl text-[9px] font-black transition-all ${foamType === f ? 'bg-white text-[#005F6B] shadow-sm' : 'text-slate-400'}`}>{f.toUpperCase()}</button>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-5">
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-black text-slate-400 uppercase ml-1">Gama de Tela</span>
                <div className="flex bg-slate-100 p-1.5 rounded-[1.2rem]">
                  {(['A', 'B'] as FabricGroup[]).map(g => (
                    <button key={g} onClick={() => setFabricGroup(g)} className={`px-6 py-2 rounded-xl text-[9px] font-black transition-all ${fabricGroup === g ? 'bg-white text-[#005F6B] shadow-sm' : 'text-slate-400'}`}>{g === FabricGroup.A ? 'ESTÁNDAR' : 'PREMIUM'}</button>
                  ))}
                </div>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2 no-scrollbar">
                {allFabrics[fabricGroup].map((fabric) => (
                  <div key={fabric.name} onClick={() => setFabricName(fabric.name)} className="flex-shrink-0 w-28 cursor-pointer active:scale-95">
                    <div className={`aspect-square rounded-[1.8rem] overflow-hidden border-4 transition-all ${fabricName === fabric.name ? 'border-[#005F6B] scale-105' : 'border-transparent opacity-40'}`}>
                      <img src={fabric.image} className="w-full h-full object-cover" />
                    </div>
                    <span className="text-[10px] font-black uppercase text-center block mt-3 text-slate-600">{fabric.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* RESUMEN FINAL */}
        <section className="relative">
          <div className="relative glass-dark rounded-[3.5rem] p-10 shadow-2xl border border-white/10 overflow-hidden">
            <div className="relative z-10 space-y-6">
              <div className="space-y-1">
                <span className="text-[10px] font-black text-teal-400 uppercase tracking-widest">Resumen de Cotización</span>
                <p className="text-2xl font-black text-white">{fabricName || '---'}</p>
              </div>

              <div className="space-y-3 border-t border-white/5 pt-6">
                {calculation.summaryItems.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs text-white">
                    <div className="flex flex-col">
                      <span className="font-black">{item.label}</span>
                      <span className="text-[10px] text-white/40">{item.qty} piezas en total</span>
                    </div>
                    <span className="font-black">${item.total.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-end border-t border-white/10 pt-8">
                <span className="text-[10px] font-black text-white/30 uppercase tracking-widest pb-2">Total Estimado</span>
                <div className="flex items-baseline text-white">
                  <span className="text-2xl font-black text-teal-400 mr-1">$</span>
                  <span className="text-6xl font-black tracking-tighter tabular-nums">
                    {Math.floor(calculation.grandTotal)}
                  </span>
                  <span className="text-2xl font-black opacity-40">
                    .{(calculation.grandTotal % 1).toFixed(2).split('.')[1]}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CONTACTO */}
        <section className="bg-white rounded-[2.5rem] p-10 shadow-xl space-y-5">
          <label className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[9px]">3</span>
            Tus Datos
          </label>
          <div className="space-y-4">
            <input type="text" placeholder="Nombre completo" value={customer.name} onChange={(e) => setCustomer({...customer, name: e.target.value})} className="w-full p-5 bg-slate-50 rounded-2xl text-sm font-black focus:border-[#005F6B] outline-none transition-all" />
            <input type="tel" placeholder="Celular" value={customer.phone} onChange={(e) => setCustomer({...customer, phone: e.target.value})} className="w-full p-5 bg-slate-50 rounded-2xl text-sm font-black focus:border-[#005F6B] outline-none transition-all" />
          </div>
        </section>
      </main>

      {/* BOTÓN WHATSAPP */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-xl border-t border-slate-50 z-[60] flex justify-center">
        <button 
          onClick={handleSendWhatsApp}
          disabled={!customer.name || !customer.phone || calculation.grandTotal === 0}
          className="w-full max-w-md py-6 rounded-[2.5rem] bg-[#25D366] text-white font-black text-sm uppercase tracking-widest shadow-2xl active:scale-95 disabled:grayscale disabled:opacity-50 transition-all"
        >
          ENVIAR POR WHATSAPP
        </button>
      </div>
    </div>
  );
};

export default App;
