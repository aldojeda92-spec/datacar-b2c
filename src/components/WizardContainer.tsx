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
  precioUsd: number; // Sincronizado con tu matriz
  origen: string;
  urlImagen?: string; // Sincronizado con tu matriz
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
    presupuestoMin: 18000,
    presupuestoMax: 45000,
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
      
      // Mutua exclusión de Origen
      if (targetValue && ['soloChinos', 'soloJaponeses', 'soloCoreanos'].includes(key)) {
        if (key !== 'soloChinos') newFiltros.soloChinos = false;
        if (key !== 'soloJaponeses') newFiltros.soloJaponeses = false;
        if (key !== 'soloCoreanos') newFiltros.soloCoreanos = false;
      }
      // Mutua exclusión de Motor
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

  const handleExecuteAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const result = await saveLeadAction(formData);
      if (result.success) {
        const response = await fetch('/api/analyze', {
          method: 'POST',
          body: JSON.stringify({ leadId: result.leadId }),
          headers: { 'Content-Type': 'application/json' }
        });
        const analysis = await response.json();
        if (analysis.success) {
          setTop10(analysis.top10);
          setStep(2);
        } else { alert(analysis.error || "Error en el análisis"); }
      }
    } catch (e) { alert("Error de red"); }
    finally { setIsAnalyzing(false); }
  };

  if (isAnalyzing) return (
    <div className="max-w-[1600px] mx-auto p-12 text-center py-48 bg-white">
      <div className="w-16 h-16 border-4 border-[#00BFFF] border-t-transparent rounded-full animate-spin mx-auto mb-10"></div>
      <h2 className="font-montserrat font-black text-3xl uppercase tracking-[6px] text-[#0A1F33]">DATACAR ANALYTICS</h2>
      <p className="mt-4 text-slate-400 font-bold uppercase text-[10px] tracking-widest animate-pulse">Sincronizando Matriz con Gemini 1.5 Flash...</p>
    </div>
  );

  return (
    <div className={`min-h-screen font-inter text-[#3A3A3C] transition-all duration-700 ${step === 2 ? 'bg-slate-50' : 'bg-white'}`}>
      
      {/* BRANDING HEADER */}
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

      {/* PASO 1: CONFIGURADOR PREMIUM (RESTAURADO) */}
      {step === 1 && (
        <div className="max-w-4xl mx-auto p-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <div className="bg-white border border-slate-100 p-12 shadow-2xl space-y-16">
            
            <section className="space-y-8">
              <div className="flex items-center gap-4">
                <span className="bg-[#0A1F33] text-white w-8 h-8 flex items-center justify-center font-black text-xs">01</span>
                <h2 className="font-montserrat font-black text-xs uppercase tracking-widest text-[#0A1F33]">Identificación del Inversor</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="group space-y-2">
                  <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Nombre Completo *</label>
                  <input name="nombre" value={formData.nombre} onChange={handleInputChange} placeholder="Nombre y Apellido" className="w-full p-4 border-b-2 border-slate-100 outline-none focus:border-[#0A1F33] text-sm font-medium transition-all bg-slate-50/30" />
                </div>
                <div className="group space-y-2">
                  <label className="text-[9px] font-black uppercase text-slate-400 ml-1">WhatsApp / Celular *</label>
                  <input name="celular" value={formData.celular} onChange={handleInputChange} placeholder="Ej: 0981 123 456" className="w-full p-4 border-b-2 border-slate-100 outline-none focus:border-[#0A1F33] text-sm font-medium transition-all bg-slate-50/30" />
                </div>
              </div>
            </section>

            <section className="space-y-8">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <span className="bg-[#0A1F33] text-white w-8 h-8 flex items-center justify-center font-black text-xs">02</span>
                  <h2 className="font-montserrat font-black text-xs uppercase tracking-widest text-[#0A1F33]">Margen de Inversión (USD)</h2>
                </div>
                <div className="text-xl font-montserrat font-black text-[#0A1F33]">
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
                <h2 className="font-montserrat font-black text-xs uppercase tracking-widest text-[#0A1F33]">Categoría de Activo</h2>
              </div>
              <div className="flex flex-wrap gap-3">
                {['SUV', 'Pickup', 'Sedán', 'Hatchback', 'Furgón', 'Deportivo'].map(t => (
                  <button key={t} onClick={() => toggleTipo(t)} className={`px-6 py-3 text-[10px] font-black uppercase tracking-widest border-2 transition-all ${formData.tipos.includes(t) ? 'bg-[#0A1F33] border-[#0A1F33] text-white' : 'bg-transparent border-slate-100 text-slate-300 hover:border-slate-200'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-8">
              <div className="flex items-center gap-4">
                <span className="bg-[#0A1F33] text-white w-8 h-8 flex items-center justify-center font-black text-xs">04</span>
                <h2 className="font-montserrat font-black text-xs uppercase tracking-widest text-[#0A1F33]">Filtros Estratégicos</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Todos', key: 'todos' },
                  { label: 'Solo Chinos', key: 'soloChinos' },
                  { label: 'Solo Japoneses', key: 'soloJaponeses' },
                  { label: 'Solo Coreanos', key: 'soloCoreanos' },
                  { label: 'Solo Eléctricos', key: 'soloEV' },
                  { label: 'Solo Híbridos', key: 'soloHEV' },
                  { label: 'Solo Combustión', key: 'soloCombustion' }
                ].map(f => (
                  <button key={f.key} onClick={() => handleFilterToggle(f.key as any)} className={`flex flex-col items-start p-4 border-2 transition-all ${formData.filtros[f.key as keyof typeof formData.filtros] ? 'border-[#00BFFF] bg-[#00BFFF]/5' : 'border-slate-50 opacity-40'}`}>
                    <span className={`text-[9px] font-black uppercase tracking-tighter ${formData.filtros[f.key as keyof typeof formData.filtros] ? 'text-[#00BFFF]' : 'text-slate-400'}`}>{f.label}</span>
                    <div className={`w-4 h-1 mt-2 ${formData.filtros[f.key as keyof typeof formData.filtros] ? 'bg-[#00BFFF]' : 'bg-slate-200'}`}></div>
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-8">
              <div className="flex items-center gap-4">
                <span className="bg-[#0A1F33] text-white w-8 h-8 flex items-center justify-center font-black text-xs">05</span>
                <h2 className="font-montserrat font-black text-xs uppercase tracking-widest text-[#0A1F33]">Atributos Críticos (IA)</h2>
              </div>
              <div className="flex flex-wrap gap-3">
                {['Seguridad', 'Dimensiones', 'Rendimiento', 'Precio', 'Tecnología'].map(at => (
                  <button key={at} onClick={() => toggleAtributo(at)} className={`px-6 py-3 text-[10px] font-black uppercase border-2 transition-all ${formData.atributos.includes(at) ? 'bg-[#0A1F33] border-[#0A1F33] text-white' : 'bg-transparent border-slate-100 text-slate-300'}`}>
                    {at}
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-6">
              <h2 className="font-montserrat font-black text-[11px] uppercase tracking-widest text-[#0A1F33]">Notas y Perfil de Uso</h2>
              <textarea name="notasAdicionales" value={formData.notasAdicionales} onChange={handleInputChange} placeholder="Describa requerimientos específicos..." className="w-full p-6 border-2 border-slate-50 outline-none focus:border-[#0A1F33] text-sm min-h-[140px] bg-slate-50/20 font-medium" />
            </section>

            <div className="pt-10 border-t border-slate-100 flex justify-end">
              <button disabled={!formData.nombre || !formData.celular} onClick={handleExecuteAnalysis} className="bg-[#0A1F33] text-white px-20 py-6 font-montserrat font-black text-xs uppercase tracking-[4px] hover:bg-[#00BFFF] hover:text-[#0A1F33] transition-all disabled:opacity-10 shadow-2xl w-full md:w-auto">
                Generar Análisis Estratégico →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PASO 2: DOSSIER PREMIUM QUE "RESPIRA" (P-10) */}
      {step === 2 && (
        <div className="max-w-[1700px] mx-auto p-8 pb-32 animate-in fade-in zoom-in-95 duration-1000">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5 gap-10">
            {top10.map((auto) => {
              const isComparing = compareIds.includes(auto.id);
              const isExpanded = expandedId === auto.id;

              return (
                <div key={auto.id} className={`group bg-white flex flex-col transition-all duration-500 relative border ${isComparing ? 'border-[#00BFFF] ring-4 ring-[#00BFFF]/10 shadow-2xl' : 'border-slate-100 shadow-sm hover:shadow-2xl'}`}>
                  
                  {/* Badge Puesto */}
                  <div className="absolute -top-3 -left-3 w-10 h-10 bg-[#0A1F33] text-white flex items-center justify-center font-montserrat font-black text-base z-10">
                    {auto.puesto}
                  </div>

                  {/* Imagen */}
                  <div className="relative h-56 bg-slate-100 overflow-hidden">
                    {auto.urlImagen ? (
                      <img src={auto.urlImagen} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    ) : (
                      <div className="h-full flex items-center justify-center text-[9px] font-black uppercase text-slate-300">Imagen N/D</div>
                    )}
                    <button onClick={() => toggleCompare(auto.id)} className={`absolute top-4 right-4 px-3 py-1.5 text-[8px] font-black border transition-all ${isComparing ? 'bg-[#00BFFF] text-white border-[#00BFFF]' : 'bg-white/90 text-slate-400 border-slate-200'}`}>
                      {isComparing ? '✓ SELECCIONADO' : '+ COMPARAR'}
                    </button>
                  </div>

                  {/* CONTENIDO CON AIRE (P-10) */}
                  <div className="p-10 flex-1 flex flex-col gap-8">
                    <div className="space-y-2">
                      <h4 className="font-montserrat font-black text-base text-[#0A1F33] uppercase leading-tight group-hover:text-[#00BFFF] transition-colors">
                        {auto.marca} <br /> <span className="font-light text-slate-400">{auto.modelo}</span>
                      </h4>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 border px-3 py-1.5 inline-block">
                        {auto.version} | {auto.origen}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 py-6 border-y border-slate-50">
                      <div><p className="text-[8px] font-black text-slate-300 uppercase">Match Score</p><p className="font-black text-[#00BFFF]">{auto.match_percent}%</p></div>
                      <div className="text-right"><p className="text-[8px] font-black text-slate-300 uppercase">Inversión</p><p className="font-black text-[#0A1F33]">${auto.precioUsd?.toLocaleString()}</p></div>
                    </div>

                    <button onClick={() => setExpandedId(isExpanded ? null : auto.id)} className="text-[9px] font-black text-[#00BFFF] text-left hover:tracking-widest transition-all">
                      {isExpanded ? '– OCULTAR DETALLES' : '+ VER EQUIPAMIENTO Y VERSIONES'}
                    </button>

                    {isExpanded && (
                      <div className="animate-in slide-in-from-top-2 duration-300 space-y-6 pt-2">
                         <div className="space-y-3 text-[10px] font-medium text-slate-500">
                            <div className="flex justify-between border-b border-slate-50 pb-2"><span>Motor</span><span className="font-bold text-[#0A1F33]">{auto.motor || 'Consultar'}</span></div>
                            <div className="flex justify-between border-b border-slate-50 pb-2"><span>Tracción</span><span className="font-bold text-[#0A1F33]">{auto.traccion || 'Consultar'}</span></div>
                         </div>
                         <div className="space-y-2">
                            <p className="text-[9px] font-black text-[#0A1F33] uppercase border-b pb-1">Otras Versiones:</p>
                            {auto.versiones?.map((v: any) => (
                              <div key={v.id} className="flex justify-between py-2 text-[10px] border-b border-slate-50">
                                <span className="text-slate-400">{v.version}</span>
                                <span className="font-black text-[#0A1F33]">${v.precioUsd.toLocaleString()}</span>
                              </div>
                            ))}
                         </div>
                      </div>
                    )}

                    <div className="mt-auto">
                      <a href={`https://wa.me/595981123456?text=Me interesa el ${auto.marca} ${auto.modelo}`} target="_blank" className="block w-full bg-[#0A1F33] text-white py-5 text-center font-black text-[10px] uppercase tracking-[3px] hover:bg-[#00BFFF] hover:text-[#0A1F33] transition-all shadow-lg">
                        Quiero Comprar
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* DOCK COMPARADOR */}
          {compareIds.length > 0 && (
            <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 bg-[#0A1F33] text-white p-8 shadow-2xl flex items-center gap-12 border-t-4 border-[#00BFFF] animate-in slide-in-from-bottom-10">
               <div><p className="text-[9px] font-black text-[#00BFFF] uppercase tracking-widest">Comparador</p><p className="text-sm font-bold">{compareIds.length} de 3 Activos</p></div>
               <div className="flex gap-4">
                  {compareIds.length === 3 ? <button className="bg-[#00BFFF] text-[#0A1F33] px-8 py-3.5 font-black text-[11px] uppercase tracking-widest hover:bg-white">Comparar Ahora</button> : <p className="text-[10px] text-slate-500 italic">Selecciona {3-compareIds.length} más...</p>}
                  <button onClick={() => setCompareIds([])} className="text-white/40 text-[10px] font-black uppercase hover:text-white">Limpiar</button>
               </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
