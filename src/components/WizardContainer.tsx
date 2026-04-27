'use client';

import { useState } from 'react';
import { saveLeadAction } from '@/app/actions';

interface IAAuto {
  id: string;
  puesto: number;
  match_percent: number;
  etiqueta_principal: string;
  justificacion: string;
  marca: string;
  modelo: string;
  version: string;
  precio_usd: number;
  origen: string;
  url_imagen?: string;
  motor?: string;
  traccion?: string;
  bauleraLitros?: number;
  garantia?: string;
  versiones: any[];
}

export default function WizardContainer() {
  const [step, setStep] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [top10, setTop10] = useState<IAAuto[]>([]);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    nombre: '',
    celular: '',
    email: '',
    presupuestoMin: 20000,
    presupuestoMax: 55000,
    atributos: [] as string[],
    tipos: [] as string[],
    notasAdicionales: '',
    filtros: {
      todos: true,
      soloChinos: false,
      soloJaponeses: false,
      soloCoreanos: false,
      soloEV: false,
      soloHEV: false,
      soloCombustion: false
    }
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleRangeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const val = Number(value);
    setFormData(prev => {
      if (name === 'presupuestoMin' && val > prev.presupuestoMax - 2000) return prev;
      if (name === 'presupuestoMax' && val < prev.presupuestoMin + 2000) return prev;
      return { ...prev, [name]: val };
    });
  };

  const toggleAtributo = (at: string) => {
    setFormData(prev => {
      const exists = prev.atributos.includes(at);
      if (!exists && prev.atributos.length >= 3) return prev;
      return { ...prev, atributos: exists ? prev.atributos.filter(a => a !== at) : [...prev.atributos, at] };
    });
  };

  const toggleTipo = (tipo: string) => {
    setFormData(prev => ({
      ...prev,
      tipos: prev.tipos.includes(tipo) ? prev.tipos.filter(t => t !== tipo) : [...prev.tipos, tipo]
    }));
  };

  const handleFilterToggle = (key: keyof typeof formData.filtros) => {
    setFormData(prev => {
      const newFiltros = { ...prev.filtros };
      if (key === 'todos') {
        return { ...prev, filtros: { todos: true, soloChinos: false, soloJaponeses: false, soloCoreanos: false, soloEV: false, soloHEV: false, soloCombustion: false } };
      }
      const targetValue = !newFiltros[key];
      newFiltros[key] = targetValue;
      if (targetValue && ['soloChinos', 'soloJaponeses', 'soloCoreanos'].includes(key)) {
        if (key !== 'soloChinos') newFiltros.soloChinos = false;
        if (key !== 'soloJaponeses') newFiltros.soloJaponeses = false;
        if (key !== 'soloCoreanos') newFiltros.soloCoreanos = false;
      }
      if (targetValue && ['soloEV', 'soloHEV', 'soloCombustion'].includes(key)) {
        if (key !== 'soloEV') newFiltros.soloEV = false;
        if (key !== 'soloHEV') newFiltros.soloHEV = false;
        if (key !== 'soloCombustion') newFiltros.soloCombustion = false;
      }
      const anyActive = Object.entries(newFiltros).some(([k, v]) => k !== 'todos' && v === true);
      newFiltros.todos = !anyActive;
      return { ...prev, filtros: newFiltros };
    });
  };

  const toggleCompare = (id: string) => {
    setCompareIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : prev.length < 3 ? [...prev, id] : prev);
  };

  const handleExecuteAnalysis = async () => {
    setIsAnalyzing(true);
    const result = await saveLeadAction(formData);
    if (result.success) {
      try {
        const response = await fetch('/api/analyze', {
          method: 'POST',
          body: JSON.stringify({ leadId: result.leadId }),
          headers: { 'Content-Type': 'application/json' }
        });
        const analysis = await response.json();
        if (analysis.success) { setTop10(analysis.top10); setStep(2); }
        else { alert(analysis.error || "Error en el análisis"); }
      } catch (e) { alert("Error de red"); }
      finally { setIsAnalyzing(false); }
    }
  };

  if (isAnalyzing) return (
    <div className="max-w-7xl mx-auto p-12 text-center py-60">
      <div className="w-12 h-12 border-2 border-[#00BFFF] border-t-transparent rounded-full animate-spin mx-auto mb-8"></div>
      <h2 className="font-montserrat font-black text-2xl uppercase tracking-[10px] text-[#0A1F33]">Calculando Estrategia</h2>
      <p className="mt-4 text-slate-400 font-medium uppercase text-[9px] tracking-[4px]">Gemini 1.5 Flash + SQL Engine</p>
    </div>
  );

  return (
    <div className={`min-h-screen font-inter text-[#3A3A3C] transition-colors duration-700 ${step === 2 ? 'bg-[#F4F7F9]' : 'bg-white'}`}>
      
      {/* HEADER FIJO OPCIONAL */}
      <div className="max-w-[1600px] mx-auto p-8 flex justify-between items-center">
        <h1 className="text-4xl uppercase tracking-tighter font-montserrat font-black text-[#0A1F33]">
          DATA<span className="font-light text-slate-400">CAR</span>
        </h1>
        {step === 2 && (
          <button onClick={() => setStep(1)} className="text-[10px] font-black uppercase tracking-widest text-[#00BFFF] border-b-2 border-[#00BFFF]/20 pb-1 hover:border-[#00BFFF] transition-all">
            ← Nueva Búsqueda
          </button>
        )}
      </div>

      {/* PASO 1: CONFIGURADOR PREMIUM */}
      {step === 1 && (
        <div className="max-w-4xl mx-auto p-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <div className="bg-white border border-slate-100 p-12 shadow-2xl space-y-16">
            
            <section className="space-y-8">
              <div className="flex items-center gap-4">
                <span className="bg-[#0A1F33] text-white w-8 h-8 flex items-center justify-center font-black text-xs">01</span>
                <h2 className="font-montserrat font-black text-xs uppercase tracking-widest text-[#0A1F33]">Datos del Inversor</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="group space-y-2">
                  <label className="text-[9px] font-black uppercase text-slate-400 group-focus-within:text-[#00BFFF] transition-colors ml-1">Nombre y Apellido</label>
                  <input name="nombre" value={formData.nombre} onChange={handleInputChange} placeholder="Ej. Alex Ferguson" className="w-full p-4 border-b-2 border-slate-100 outline-none focus:border-[#0A1F33] text-sm font-medium transition-all" />
                </div>
                <div className="group space-y-2">
                  <label className="text-[9px] font-black uppercase text-slate-400 group-focus-within:text-[#00BFFF] transition-colors ml-1">WhatsApp de Contacto</label>
                  <input name="celular" value={formData.celular} onChange={handleInputChange} placeholder="Ej. 0981 123 456" className="w-full p-4 border-b-2 border-slate-100 outline-none focus:border-[#0A1F33] text-sm font-medium transition-all" />
                </div>
              </div>
            </section>

            <section className="space-y-8">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <span className="bg-[#0A1F33] text-white w-8 h-8 flex items-center justify-center font-black text-xs">02</span>
                  <h2 className="font-montserrat font-black text-xs uppercase tracking-widest text-[#0A1F33]">Margen de Inversión (USD)</h2>
                </div>
                <div className="text-xl font-montserrat font-black text-[#0A1F33] tracking-tighter">
                  ${formData.presupuestoMin.toLocaleString()} — ${formData.presupuestoMax.toLocaleString()}
                </div>
              </div>
              <div className="px-2 space-y-10">
                <input type="range" name="presupuestoMin" min="5000" max="150000" step="1000" value={formData.presupuestoMin} onChange={handleRangeChange} className="w-full h-1 bg-slate-100 accent-[#0A1F33] cursor-pointer" />
                <input type="range" name="presupuestoMax" min="5000" max="150000" step="1000" value={formData.presupuestoMax} onChange={handleRangeChange} className="w-full h-1 bg-slate-100 accent-[#00BFFF] cursor-pointer" />
              </div>
            </section>

            <section className="space-y-8">
               <div className="flex items-center gap-4">
                <span className="bg-[#0A1F33] text-white w-8 h-8 flex items-center justify-center font-black text-xs">03</span>
                <h2 className="font-montserrat font-black text-xs uppercase tracking-widest text-[#0A1F33]">Filtros de Segmento y Origen</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {['SUV', 'Pickup', 'Sedán', 'Hatchback', 'Furgón'].map(t => (
                  <button key={t} onClick={() => toggleTipo(t)} className={`p-4 text-[10px] font-black uppercase tracking-widest border-2 transition-all ${formData.tipos.includes(t) ? 'bg-[#0A1F33] border-[#0A1F33] text-white' : 'bg-transparent border-slate-50 text-slate-300 hover:border-slate-200'}`}>
                    {t}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Todos', key: 'todos' },
                  { label: 'Chinos', key: 'soloChinos' },
                  { label: 'Japoneses', key: 'soloJaponeses' },
                  { label: 'Coreanos', key: 'soloCoreanos' },
                  { label: 'Eléctricos', key: 'soloEV' },
                  { label: 'Híbridos', key: 'soloHEV' },
                  { label: 'Combustión', key: 'soloCombustion' }
                ].map(f => (
                  <button key={f.key} onClick={() => handleFilterToggle(f.key as any)} className={`flex flex-col items-start p-4 border-2 transition-all ${formData.filtros[f.key as keyof typeof formData.filtros] ? 'border-[#00BFFF] bg-[#00BFFF]/5' : 'border-slate-50 opacity-40'}`}>
                    <span className={`text-[9px] font-black uppercase tracking-tighter ${formData.filtros[f.key as keyof typeof formData.filtros] ? 'text-[#00BFFF]' : 'text-slate-400'}`}>{f.label}</span>
                    <div className={`w-4 h-1 mt-2 ${formData.filtros[f.key as keyof typeof formData.filtros] ? 'bg-[#00BFFF]' : 'bg-slate-200'}`}></div>
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-8">
              <h2 className="font-montserrat font-black text-[11px] uppercase tracking-widest text-[#0A1F33]">Notas y Requerimientos Especiales</h2>
              <textarea name="notasAdicionales" value={formData.notasAdicionales} onChange={handleInputChange} placeholder="Ej. Busco espacio para 3 sillas de niños y bajo consumo en ciudad..." className="w-full p-6 border-2 border-slate-50 outline-none focus:border-[#0A1F33] text-sm min-h-[150px] bg-slate-50/20 font-medium transition-all" />
            </section>

            <div className="pt-10 border-t border-slate-100 flex justify-end">
              <button disabled={!formData.nombre || !formData.celular} onClick={handleExecuteAnalysis} className="bg-[#0A1F33] text-white px-16 py-6 font-montserrat font-black text-xs uppercase tracking-[5px] hover:bg-[#00BFFF] hover:text-[#0A1F33] transition-all disabled:opacity-10 shadow-2xl">
                Lanzar Análisis →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PASO 2: EL DOSSIER QUE "RESPIRA" */}
      {step === 2 && (
        <div className="max-w-[1700px] mx-auto p-8 pb-32 animate-in fade-in zoom-in-95 duration-1000">
          
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5 gap-10">
            {top10.map((auto) => {
              const isComparing = compareIds.includes(auto.id);
              const isExpanded = expandedId === auto.id;

              return (
                <div key={auto.id} className={`group bg-white flex flex-col transition-all duration-500 relative ${isComparing ? 'ring-4 ring-[#00BFFF] shadow-2xl' : 'hover:shadow-2xl border border-slate-100'}`}>
                  
                  {/* Badge de Puesto de Lujo */}
                  <div className="absolute -top-4 -left-4 w-12 h-12 bg-[#0A1F33] text-white flex items-center justify-center font-montserrat font-black text-lg z-10 shadow-xl">
                    {auto.puesto}
                  </div>

                  {/* IMAGEN: Contenedor con Aire */}
                  <div className="relative h-56 bg-[#F8FAFC] overflow-hidden">
                    {auto.url_imagen ? (
                      <img src={auto.url_imagen} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-90 group-hover:opacity-100" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[9px] font-black uppercase text-slate-300">Imagen en Proceso</div>
                    )}
                    
                    {/* Overlay de Selección para Comparar */}
                    <button onClick={() => toggleCompare(auto.id)} className={`absolute top-4 right-4 px-4 py-2 text-[8px] font-black tracking-widest transition-all ${isComparing ? 'bg-[#00BFFF] text-white' : 'bg-white/90 text-[#0A1F33] hover:bg-[#0A1F33] hover:text-white'}`}>
                      {isComparing ? 'QUITAR' : '+ COMPARAR'}
                    </button>
                  </div>

                  {/* CONTENIDO: Aquí aplicamos el Aire (p-10) */}
                  <div className="p-10 flex-1 flex flex-col gap-8">
                    
                    {/* Header del Auto */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <h4 className="font-montserrat font-black text-lg text-[#0A1F33] leading-tight uppercase tracking-tighter">
                          {auto.marca} <br />
                          <span className="text-[#00BFFF]">{auto.modelo}</span>
                        </h4>
                        <div className="bg-slate-50 px-3 py-1 border border-slate-100 text-[8px] font-black text-slate-400 uppercase tracking-widest">
                          {auto.origen}
                        </div>
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-4">
                        {auto.version}
                      </p>
                    </div>

                    {/* Datos Clave: Grilla Limpia */}
                    <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                      <div className="space-y-1">
                        <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Match IA</p>
                        <p className="text-sm font-montserrat font-black text-[#0A1F33]">{auto.match_percent}%</p>
                      </div>
                      <div className="space-y-1 text-right">
                        <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Inversión</p>
                        <p className="text-sm font-montserrat font-black text-[#0A1F33]">${auto.precio_usd.toLocaleString()}</p>
                      </div>
                      <div className="col-span-2 space-y-1">
                        <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Atributo Destacado</p>
                        <p className="text-[10px] font-black text-[#00BFFF] uppercase tracking-tighter">{auto.etiqueta_principal}</p>
                      </div>
                    </div>

                    {/* Botón Expansor de Datos Duros */}
                    <button 
                      onClick={() => setExpandedId(isExpanded ? null : auto.id)} 
                      className="group/btn flex items-center justify-center gap-3 py-4 border-y border-slate-50 hover:bg-slate-50 transition-all"
                    >
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 group-hover/btn:text-[#0A1F33]">
                        {isExpanded ? 'Cerrar Detalles' : 'Ver Equipamiento'}
                      </span>
                      <div className={`w-1.5 h-1.5 rounded-full ${isExpanded ? 'bg-[#00BFFF]' : 'bg-slate-200'}`}></div>
                    </button>

                    {/* Contenedor Expandible (Versiones y Equipo) */}
                    {isExpanded && (
                      <div className="animate-in slide-in-from-top-4 duration-500 space-y-8 pt-2">
                        <div className="space-y-4">
                           <p className="text-[9px] font-black text-[#0A1F33] uppercase border-l-2 border-[#00BFFF] pl-2">Especificaciones</p>
                           <div className="space-y-3 text-[10px] font-medium text-slate-500">
                              <div className="flex justify-between border-b border-slate-50 pb-2"><span>Motorización</span><span className="font-bold text-[#0A1F33]">{auto.motor || 'Consultar'}</span></div>
                              <div className="flex justify-between border-b border-slate-50 pb-2"><span>Tracción</span><span className="font-bold text-[#0A1F33]">{auto.traccion || 'Consultar'}</span></div>
                              <div className="flex justify-between border-b border-slate-50 pb-2"><span>Baulera</span><span className="font-bold text-[#0A1F33]">{auto.bauleraLitros ? `${auto.bauleraLitros} L` : 'N/D'}</span></div>
                           </div>
                        </div>
                        
                        <div className="space-y-4">
                           <p className="text-[9px] font-black text-[#0A1F33] uppercase border-l-2 border-[#00BFFF] pl-2">Gama de Versiones</p>
                           <div className="space-y-2">
                             {auto.versiones?.slice(0, 4).map((v: any) => (
                               <div key={v.id} className="flex justify-between p-3 bg-slate-50 text-[9px] font-bold">
                                 <span className="text-slate-400">{v.version}</span>
                                 <span className="text-[#0A1F33]">${v.precioUsd.toLocaleString()}</span>
                               </div>
                             ))}
                           </div>
                        </div>
                      </div>
                    )}

                    {/* CTA Final: Siempre al Fondo */}
                    <div className="mt-auto pt-6">
                      <a 
                        href={`https://wa.me/595981123456?text=Me interesa el ${auto.marca} ${auto.modelo} del ranking Datacar.`} 
                        target="_blank"
                        className="block w-full bg-[#0A1F33] text-white py-5 text-center text-[10px] font-black uppercase tracking-[3px] hover:bg-[#00BFFF] hover:text-[#0A1F33] transition-all shadow-lg active:scale-95"
                      >
                        Quiero Comprar
                      </a>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>

          {/* BARRA COMPARADORA FLOTANTE (ESTILO DOCK) */}
          {compareIds.length > 0 && (
            <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-20 duration-700">
               <div className="bg-[#0A1F33] text-white px-10 py-8 shadow-[0_35px_60px_-15px_rgba(0,0,0,0.6)] flex items-center gap-16 border-t-4 border-[#00BFFF]">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-[#00BFFF] uppercase tracking-[4px]">Comparador Activo</p>
                    <p className="text-sm font-montserrat font-black uppercase tracking-tighter">
                      {compareIds.length} <span className="text-slate-500 font-light">de 3 seleccionados</span>
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    {compareIds.length === 3 ? (
                      <button className="bg-[#00BFFF] text-[#0A1F33] px-10 py-4 font-montserrat font-black text-[10px] uppercase tracking-[2px] hover:bg-white transition-all">
                        Comparar Datos Duros
                      </button>
                    ) : (
                      <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic animate-pulse">
                        Faltan {3 - compareIds.length} para habilitar
                      </div>
                    )}
                    <button onClick={() => setCompareIds([])} className="text-white/30 hover:text-white transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
               </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
