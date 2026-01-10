
import React, { useState, useMemo, useEffect } from 'react';
import { ProductType, FabricGroup, FoamType, QuoteData, CustomerData } from './types';
import { 
  FABRIC_CATALOG,
  FOAM_MULTIPLIERS, 
  CUSHION_BASE_FACTOR,
  CUSHION_AREA_FACTOR,
  CUSHION_PREMIUM_SURCHARGE,
  FURNITURE_VOLUME_FACTOR,
  FURNITURE_PREMIUM_FABRIC_ADD,
  BUSINESS_WHATSAPP
} from './constants';

const App: React.FC = () => {
  // --- Estados ---
  const [productType, setProductType] = useState<ProductType>(ProductType.CUSHION);
  const [width, setWidth] = useState(45);
  const [height, setHeight] = useState(45);
  const [thickness, setThickness] = useState(10);
  const [fabricGroup, setFabricGroup] = useState<FabricGroup>(FabricGroup.A);
  const [fabricName, setFabricName] = useState('');
  const [foamType, setFoamType] = useState<FoamType>(FoamType.STANDARD);
  const [quantity, setQuantity] = useState(1);
  const [customer, setCustomer] = useState<CustomerData>({ name: '', phone: '' });

  // --- Sincronizar tela al cambiar grupo ---
  useEffect(() => {
    setFabricName(FABRIC_CATALOG[fabricGroup][0]);
  }, [fabricGroup]);

  // --- Lógica de Cotización ---
  const quote = useMemo((): QuoteData => {
    let unitPrice = 0;
    let sizeLabel = "";

    if (productType === ProductType.CUSHION) {
      const area = width * height;
      const basePrice = CUSHION_BASE_FACTOR + (area * CUSHION_AREA_FACTOR);
      unitPrice = fabricGroup === FabricGroup.B ? basePrice + CUSHION_PREMIUM_SURCHARGE : basePrice;
      unitPrice = Math.max(5, Math.round(unitPrice));
      sizeLabel = `${width} x ${height} cm`;
    } else {
      const volume = width * height * thickness;
      const basePrice = volume * FURNITURE_VOLUME_FACTOR;
      unitPrice = basePrice * FOAM_MULTIPLIERS[foamType];
      if (fabricGroup === FabricGroup.B) unitPrice += FURNITURE_PREMIUM_FABRIC_ADD;
      unitPrice = Math.round(unitPrice * 100) / 100;
      sizeLabel = `${width}x${height}x${thickness} cm`;
    }

    const total = productType === ProductType.CUSHION 
      ? Math.round(unitPrice * quantity)
      : Math.round(unitPrice * quantity * 100) / 100;

    return {
      type: productType,
      width,
      height,
      thickness: productType === ProductType.CUSHION ? 0 : thickness,
      cushionSizeLabel: sizeLabel,
      fabricGroup,
      fabricName,
      foamType,
      quantity,
      unitPrice,
      total
    };
  }, [productType, width, height, thickness, fabricGroup, fabricName, foamType, quantity]);

  // --- Acciones ---
  const handleSendWhatsApp = () => {
    if (!customer.name || !customer.phone) return;

    const fabricTag = quote.fabricGroup === FabricGroup.A ? 'Estándar' : 'Premium';
    const totalTxt = quote.type === ProductType.CUSHION ? quote.total.toFixed(0) : quote.total.toFixed(2);

    const message = `🧾 NUEVA COTIZACIÓN – COJINES SERGIO

Producto: ${quote.type}
Medidas: ${quote.cushionSizeLabel}
Tela: ${fabricTag} – ${quote.fabricName}
${quote.type !== ProductType.CUSHION ? `Espuma: ${quote.foamType}\n` : ''}Cantidad: ${quote.quantity}
Total: $${totalTxt}

----------------------------
Cliente: ${customer.name}
WhatsApp: ${customer.phone}
----------------------------
Cotizado desde la App – 2026`;

    window.open(`https://wa.me/${BUSINESS_WHATSAPP}?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-100 py-5 px-6 sticky top-0 z-50">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex flex-col">
            <h1 className="text-xl font-black text-[#005F6B] tracking-tight leading-none">Cojines Sergio</h1>
            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-[0.3em] mt-1">Calidad Profesional</span>
          </div>
          <div className="bg-teal-50 p-2.5 rounded-2xl border border-teal-100">
            <svg className="w-5 h-5 text-[#005F6B]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-6 pt-6 pb-32 space-y-8">
        
        {/* PASO 1: Categoría */}
        <section className="space-y-4">
          <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[9px]">1</span>
            ¿Qué deseas cotizar?
          </label>
          <div className="grid grid-cols-3 bg-white p-1.5 rounded-2xl border border-slate-100 step-shadow">
            {[ProductType.CUSHION, ProductType.SEAT, ProductType.BACKREST].map(t => (
              <button
                key={t}
                onClick={() => setProductType(t)}
                className={`py-3 rounded-xl text-[10px] font-bold transition-all uppercase tracking-tighter active:scale-95 flex items-center justify-center text-center leading-tight min-h-[54px] ${
                  productType === t ? 'bg-[#005F6B] text-white shadow-lg shadow-teal-900/20' : 'text-slate-400'
                }`}
              >
                {t === ProductType.CUSHION ? (
                  <span>COJÍN<br/>DECORATIVO</span>
                ) : (
                  <span>{t}</span>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* PASO 2: Medidas y Materiales */}
        <section className="space-y-4">
          <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[9px]">2</span>
            Configura tu producto
          </label>
          
          <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl shadow-slate-200/50 space-y-8">
            
            {/* Medidas */}
            <div className={`grid ${productType === ProductType.CUSHION ? 'grid-cols-2' : 'grid-cols-3'} gap-4`}>
              {[
                { l: 'Ancho', v: width, s: setWidth },
                { l: 'Alto', v: height, s: setHeight },
                ...(productType !== ProductType.CUSHION ? [{ l: 'Fondo', v: thickness, s: setThickness }] : [])
              ].map(dim => (
                <div key={dim.l} className="space-y-2">
                  <span className="text-[9px] font-black text-slate-400 uppercase ml-1">{dim.l} (cm)</span>
                  <div className="relative group">
                    <input
                      type="number"
                      inputMode="numeric"
                      value={dim.v}
                      onChange={(e) => dim.s(Number(e.target.value))}
                      className="w-full pl-3 pr-8 py-4 bg-slate-50 rounded-2xl text-sm font-black text-slate-900 focus:bg-white border-2 border-transparent focus:border-[#005F6B] transition-all outline-none"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col">
                      <button onClick={() => dim.s(dim.v + 1)} className="p-1 text-slate-300 hover:text-[#005F6B]"><svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"/></svg></button>
                      <button onClick={() => dim.s(Math.max(1, dim.v - 1))} className="p-1 text-slate-300 hover:text-[#005F6B]"><svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Espuma */}
            {productType !== ProductType.CUSHION && (
              <div className="space-y-3">
                <span className="text-[10px] font-black text-slate-400 uppercase ml-1">Calidad de Espuma</span>
                <div className="grid grid-cols-3 gap-2">
                  {[FoamType.ECONOMY, FoamType.STANDARD, FoamType.PREMIUM].map(f => (
                    <button
                      key={f}
                      onClick={() => setFoamType(f)}
                      className={`py-3 rounded-xl text-[9px] font-bold uppercase transition-all ${
                        foamType === f ? 'bg-[#005F6B] text-white shadow-md' : 'bg-slate-50 text-slate-400'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Telas */}
            <div className="space-y-6 pt-6 border-t border-slate-50">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase">Calidad de Tela</span>
                <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100">
                  {[FabricGroup.A, FabricGroup.B].map(g => (
                    <button
                      key={g}
                      onClick={() => setFabricGroup(g)}
                      className={`px-4 py-2 rounded-lg text-[10px] font-black transition-all ${
                        fabricGroup === g ? 'bg-white text-[#005F6B] shadow-sm' : 'text-slate-400'
                      }`}
                    >
                      {g === FabricGroup.A ? 'ESTÁNDAR' : 'PREMIUM'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[9px] font-black text-slate-400 uppercase ml-1">Colección Disponible</span>
                <div className="relative">
                  <select
                    value={fabricName}
                    onChange={(e) => setFabricName(e.target.value)}
                    className="w-full p-4.5 bg-slate-50 rounded-2xl text-sm font-black text-slate-900 border-2 border-transparent focus:border-[#005F6B] appearance-none outline-none transition-all"
                  >
                    {FABRIC_CATALOG[fabricGroup].map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* RESUMEN DE PEDIDO (TARJETA OSCURA) */}
        <section className="relative px-1">
          <div className="absolute -inset-2 bg-gradient-to-tr from-[#005F6B] to-emerald-500 rounded-[3rem] blur-2xl opacity-10 pointer-events-none"></div>
          <div className="relative glass-dark rounded-[2.8rem] p-9 shadow-2xl border border-white/10 overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="flex justify-between items-start mb-10 relative z-20">
              <div className="space-y-1.5 pr-2">
                <span className="text-[10px] font-black text-teal-400 uppercase tracking-[0.4em]">Cantidad</span>
                <p className="text-lg font-bold text-white tracking-tight leading-none">
                  {fabricName} ({fabricGroup === FabricGroup.A ? 'Estándar' : 'Premium'})
                </p>
                <p className="text-[10px] text-white/40 font-medium">{quote.cushionSizeLabel}</p>
              </div>
              
              {/* Controles de cantidad mejorados */}
              <div className="flex bg-white/10 p-1.5 rounded-2xl items-center gap-1 border border-white/20 relative z-30">
                 <button 
                  type="button"
                  onClick={(e) => { e.preventDefault(); setQuantity(Math.max(1, quantity - 1)); }} 
                  className="w-12 h-12 flex items-center justify-center text-white font-black text-2xl hover:bg-white/10 active:scale-90 transition-all rounded-xl cursor-pointer"
                  style={{ touchAction: 'manipulation' }}
                 >
                   –
                 </button>
                 <span className="text-xl font-black text-white min-w-[2.5rem] text-center select-none">{quantity}</span>
                 <button 
                  type="button"
                  onClick={(e) => { e.preventDefault(); setQuantity(quantity + 1); }} 
                  className="w-12 h-12 flex items-center justify-center text-white font-black text-2xl hover:bg-white/10 active:scale-90 transition-all rounded-xl cursor-pointer"
                  style={{ touchAction: 'manipulation' }}
                 >
                   +
                 </button>
              </div>
            </div>

            <div className="flex justify-between items-end border-t border-white/10 pt-8 relative z-20">
              <div className="space-y-1">
                <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Total a pagar</span>
              </div>
              <div className="flex items-baseline gap-1 text-white">
                <span className="text-2xl font-black text-teal-400 drop-shadow-md">$</span>
                <span className="text-6xl font-black tracking-tighter drop-shadow-2xl">
                  {quote.type === ProductType.CUSHION ? quote.total.toFixed(0) : quote.total.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* PASO 3: Datos de Cliente */}
        <section className="space-y-4">
          <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[9px]">3</span>
            Tu información
          </label>
          <div className="bg-white rounded-[2rem] p-7 border border-slate-100 shadow-xl shadow-slate-200/40 space-y-4">
            <input
              type="text"
              placeholder="Nombre completo"
              value={customer.name}
              onChange={(e) => setCustomer({...customer, name: e.target.value})}
              className="w-full p-4.5 bg-slate-50 rounded-2xl text-sm font-black focus:bg-white border-2 border-[#005F6B]/0 focus:border-[#005F6B] outline-none transition-all placeholder:text-slate-300"
            />
            <input
              type="tel"
              placeholder="Número de celular"
              value={customer.phone}
              onChange={(e) => setCustomer({...customer, phone: e.target.value})}
              className="w-full p-4.5 bg-slate-50 rounded-2xl text-sm font-black focus:bg-white border-2 border-[#005F6B]/0 focus:border-[#005F6B] outline-none transition-all placeholder:text-slate-300"
            />
          </div>
        </section>
      </main>

      {/* Botón WhatsApp Fijo */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-xl border-t border-slate-50 z-[60]">
        <div className="max-w-md mx-auto">
          <button
            onClick={handleSendWhatsApp}
            disabled={!customer.name || !customer.phone}
            className={`w-full py-5 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all transform active:scale-[0.96] shadow-2xl ${
              customer.name && customer.phone 
              ? 'bg-[#25D366] text-white shadow-green-500/30' 
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.414 0 .004 5.411.002 12.048a11.811 11.811 0 001.592 5.952L0 24l6.101-1.6c1.854 1.011 3.96 1.543 6.1 1.543h.005c6.634 0 12.043-5.411 12.045-12.048a11.79 11.79 0 00-3.417-8.473z"/>
            </svg>
            Solicitar vía WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;
