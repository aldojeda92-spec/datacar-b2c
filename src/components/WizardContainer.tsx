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
    <div className="max-w-[1600px] mx-auto p-12 text-center py-48 bg-white border border-slate-100">
      <div className="w-16 h-16 border-4 border-[#00BFFF] border-t-transparent rounded-full animate-spin mx-auto mb-10"></div>
      <h2 className="font-montserrat font-black text-3xl uppercase tracking-[6px] text-[#0A1F33]">DATACAR ENGINE</h2>
      <p className="mt-4 text-slate-400 font-bold uppercase text-[10px] tracking-widest animate-pulse">Analizando 436 activos con Gemini 1.5 Flash...</p>
    </div>
  );

  return (
    <div className={`max-w-[1600px] mx-auto p-8 font-inter transition-all duration-500 ${step === 2 ? 'bg-[#F9FAFB]' : 'bg-white'}`}>
      
      {/* BRANDING */}
      <div className="text-center mb-12 select-none">
        <h1 className="text-5xl uppercase tracking-[1px] mb-2 font-montserrat font-black text-[#0A1F33]">DATA<span className="font-light text-[#3A3A3C]">CAR</span></h1>
        <p className="text-[10px] font-bold uppercase tracking-[4px] text-slate-400">Inteligencia Automotriz para Inversores</p>
      </div>

      {/* STEP 1: FORMULARIO PREMIUM */}
      {step === 1 && (
        <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in duration-700 bg-white p-12 border border-slate-100 shadow-sm">
          
          <section>
            <h2 className="font-montserrat font-black text-[11px] uppercase tracking-widest mb-6 border-l-4 border-[#00BFFF] pl-4 text-[#0A1F33]">1. Identificación</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <input name="nombre" value={formData.nombre} onChange={handleInputChange} placeholder="Nombre Completo *" className="w-full p-4 border border-slate-200 outline-none text-sm bg-slate-50/30 focus:border-[#0A1F33]" />
              <input name="celular" value={formData.celular} onChange={handleInputChange} placeholder="WhatsApp / Celular *" className="w-full p-4 border border-slate-200 outline-none text-sm bg-slate-50/30 focus:border-[#0A1F33]" />
            </div>
          </section>

          <section>
            <div className="flex justify-between items-end mb-8">
              <h2 className="font-montserrat font-black text-[11px] uppercase tracking-widest border-l-4 border-[#00BFFF] pl-4 text-[#0A1F33]">2. Margen de Inversión (USD)</h2>
              <div className="font-montserrat font-black text-xl text-[#0A1F33] bg-slate-50 px-4 py-2 border border-slate-100">
                ${formData.presupuestoMin.toLocaleString()} — ${formData.presupuestoMax.toLocaleString()}
              </div>
            </div>
            <div className="space-y-8 px-2">
              <input type="range" name="presupuestoMin" min="5000" max="150000" step="1000" value={formData.presupuestoMin} onChange={handleRangeChange} className="w-full h-1.5 bg-slate-100 accent-[#0A1F33] cursor-pointer" />
              <input type="range" name="presupuestoMax" min="5000" max="150000" step="1000" value={formData.presupuestoMax} onChange={handleRangeChange} className="w-full h-1.5 bg-slate-100 accent-[#00BFFF] cursor-pointer" />
            </div>
          </section>

          <section>
            <h2 className="font-montserrat font-black text-[11px] uppercase tracking-widest mb-6 border-l-4 border-[#00BFFF] pl-4 text-[#0A1F33]">3. Categoría de Activo</h2>
            <div className="flex flex-wrap gap-3">
              {['SUV', 'Pickup', 'Sedán', 'Hatchback', 'Furgón', 'Deportivo'].map(t => (
                <button key={t} onClick={() => toggleTipo(t)} className={`px-6 py-3 text-[10px] font-black uppercase tracking-widest border transition-all ${formData.tipos.includes(t) ? 'bg-[#0A1F33] text-white border-[#0A1F33]' : 'bg-transparent text-slate-400 border-slate-200 hover:border-slate-400'}`}>
                  {t}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h2 className="font-montserrat font-black text-[11px] uppercase tracking-widest mb-6 border-l-4 border-[#00BFFF] pl-4 text-[#0A1F33]">4. Filtros Estratégicos (Origen / Motor)</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Todos', key: 'todos' },
                { label: 'Solo Chinos', key: 'soloChinos' },
                { label: 'Solo Japoneses', key: 'soloJaponeses' },
                { label: 'Solo Coreanos', key: 'soloCoreanos' },
                { label: 'Solo EV', key: 'soloEV' },
                { label: 'Solo HEV', key: 'soloHEV' },
                { label: 'Solo Combustión', key: 'soloCombustion' }
              ].map(f => (
                <button key={f.key} onClick={() => handleFilterToggle(f.key as any)} className={`flex justify-between items-center px-4 py-3.5 border text-[9px] font-black uppercase tracking-tighter transition-all ${formData.filtros[f.key as keyof typeof formData.filtros] ? 'border-[#00BFFF] text-[#00BFFF] bg-[#00BFFF]/5' : 'border-slate-100 text-slate-300'}`}>
                  {f.label}
                  <div className={`w-2 h-2 ${formData.filtros[f.key as keyof typeof formData.filtros] ? 'bg-[#00BFFF]' : 'bg-slate-200'}`}></div>
                </button>
              ))}
            </div>
          </section>

          <section>
            <h2 className="font-montserrat font-black text-[11px] uppercase tracking-widest mb-6 border-l-4 border-[#00BFFF] pl-4 text-[#0A1F33]">5. Prioridades IA</h2>
            <div className="flex flex-wrap gap-3">
              {['Seguridad', 'Dimensiones', 'Rendimiento', 'Precio', 'Tecnología'].map(at => (
                <button key={at} onClick={() => toggleAtributo(at)} className={`px-6 py-3 text-[10px] font-black uppercase tracking-widest border transition-all ${formData.atributos.includes(at) ? 'bg-[#0A1F33] text-white border-[#0A1F33]' : 'bg-transparent text-slate-400 border-slate-200'}`}>
                  {at}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h2 className="font-montserrat font-black text-[11px] uppercase tracking-widest mb-5 text-[#0A1F33]">6. Notas de Consultoría</h2>
            <textarea name="notasAdicionales" value={formData.notasAdicionales} onChange={handleInputChange} placeholder="Describe el perfil de uso..." className="w-full p-5 border border-slate-200 outline-none text-sm min-h-[140px] bg-slate-50/30" />
          </section>

          <div className="text-right pt-10 border-t border-slate-100">
            <button disabled={!formData.nombre || !formData.celular} onClick={handleExecuteAnalysis} className="bg-[#0A1F33] text-white px-20 py-6 font-montserrat font-black text-xs uppercase tracking-[4px] hover:bg-[#00BFFF] hover:text-[#0A1F33] transition-all disabled:opacity-10 w-full md:w-auto shadow-lg">Generar Dossier →</button>
          </div>
        </div>
      )}

      {/* STEP 2: DOSSIER CON COMPARADOR Y EXPANSIÓN */}
      {step === 2 && (
        <div className="animate-in fade-in zoom-in-95 duration-1000">
          <div className="flex justify-between items-end mb-12 pb-8 border-b border-slate-200">
            <div>
              <h2 className="font-montserrat font-black text-4xl uppercase tracking-[2px] text-[#0A1F33]">Dossier de Inversión</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[4px] mt-3">Análisis estratégico de activos</p>
            </div>
            <button onClick={() => setStep(1)} className="text-[11px] font-black uppercase text-[#00BFFF] hover:tracking-widest transition-all">← Redefinir Perfil</button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-8">
            {top10.map((auto) => {
              const isComparing = compareIds.includes(auto.id);
              const isExpanded = expandedId === auto.id;

              return (
                <div key={auto.id} className={`bg-white p-7 border transition-all duration-500 flex flex-col gap-6 group relative ${isComparing ? 'border-[#00BFFF] ring-2 ring-[#00BFFF]/20 shadow-xl' : 'border-slate-100 shadow-sm'}`}>
                  
                  {/* Imagen y Selector de Comparación */}
                  <div className="bg-slate-50 h-40 w-full flex items-center justify-center relative overflow-hidden">
                    {auto.url_imagen ? <img src={auto.url_imagen} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" /> : 'Sin imagen'}
                    <div className="absolute top-0 left-0 bg-[#0A1F33] text-white text-[10px] px-4 py-2 font-black">TOP {auto.puesto}</div>
                    <button onClick={() => toggleCompare(auto.id)} className={`absolute top-2 right-2 px-3 py-1.5 text-[9px] font-black rounded-sm border transition-all ${isComparing ? 'bg-[#00BFFF] text-white border-[#00BFFF]' : 'bg-white/90 text-slate-400 border-slate-200 hover:text-[#00BFFF]'}`}>
                      {isComparing ? '✓ SELECCIONADO' : '+ COMPARAR'}
                    </button>
                  </div>

                  {/* Info Principal */}
                  <div className="space-y-2">
                    <h4 className="font-montserrat font-black text-[15px] text-[#0A1F33] uppercase leading-tight group-hover:text-[#00BFFF] transition-colors">{auto.marca} <span className="font-light text-slate-500">{auto.modelo}</span></h4>
                    <p className="text-[9px] text-slate-400 uppercase font-black bg-slate-50 border px-3 py-1.5 inline-block">{auto.version} | {auto.origen}</p>
                  </div>

                  {/* Botón Equipamiento (+) */}
                  <button onClick={() => setExpandedId(isExpanded ? null : auto.id)} className="text-[10px] font-black text-[#00BFFF] flex justify-between border-b border-dashed border-[#00BFFF]/30 pb-2 hover:tracking-widest transition-all">
                    {isExpanded ? '– OCULTAR DETALLES' : '+ EQUIPAMIENTO Y VERSIONES'}
                  </button>

                  {/* Sección Expandible */}
                  {isExpanded && (
                    <div className="animate-in slide-in-from-top-2 duration-300 space-y-4 pt-2">
                      <div className="grid grid-cols-2 gap-3 text-[10px] font-medium text-slate-500">
                        <div><p className="text-slate-300 font-bold uppercase text-[8px]">Motor</p><p>{auto.motor}</p></div>
                        <div><p className="text-slate-300 font-bold uppercase text-[8px]">Tracción</p><p>{auto.traccion}</p></div>
                        <div><p className="text-slate-300 font-bold uppercase text-[8px]">Baulera</p><p>{auto.bauleraLitros}L</p></div>
                        <div><p className="text-slate-300 font-bold uppercase text-[8px]">Garantía</p><p>{auto.garantia}</p></div>
                      </div>
                      <div className="pt-2">
                        <p className="text-[9px] font-black text-[#0A1F33] mb-2 uppercase border-b pb-1">Otras Versiones:</p>
                        {auto.versiones?.map((v: any) => (
                          <div key={v.id} className="flex justify-between py-1.5 text-[10px] border-b border-slate-50">
                            <span className="text-slate-400">{v.version}</span>
                            <span className="font-black text-[#0A1F33]">${v.precioUsd.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Footer de Tarjeta */}
                  <div className="mt-auto pt-6 border-t border-slate-50 space-y-4">
                    <div className="flex justify-between items-center">
                      <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Inversión desde</p>
                      <p className="font-montserrat font-black text-lg text-[#0A1F33]">${auto.precio_usd.toLocaleString()}</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-center bg-[#00BFFF]/5 p-2.5 border border-[#00BFFF]/10">
                        <span className="text-[9px] font-black text-[#00BFFF] uppercase">Match Score</span>
                        <span className="text-[11px] font-black text-[#00BFFF]">{auto.match_percent}%</span>
                      </div>
                      <a href={`https://wa.me/595981123456?text=Quiero comprar el ${auto.marca} ${auto.modelo}`} target="_blank" className="block w-full py-3.5 bg-[#0A1F33] text-white text-center font-black text-[10px] uppercase tracking-[2px] hover:bg-[#00BFFF] transition-all">
                        Quiero Comprar →
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* BARRA COMPARADORA FLOTANTE */}
          {compareIds.length > 0 && (
            <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-[#0A1F33] text-white p-7 shadow-2xl flex items-center gap-12 animate-in slide-in-from-bottom-10 rounded-sm z-50">
               <div>
                  <p className="text-[9px] font-black text-[#00BFFF] uppercase tracking-widest mb-1">Comparador de Activos</p>
                  <p className="text-sm font-bold">{compareIds.length} de 3 seleccionados</p>
               </div>
               <div className="flex gap-4">
                  {compareIds.length === 3 ? (
                    <button className="bg-[#00BFFF] text-[#0A1F33] px-10 py-3.5 font-black text-[11px] uppercase tracking-widest hover:bg-white transition-all">Comparar Datos Duros</button>
                  ) : (
                    <p className="text-[10px] text-slate-400 font-medium italic">Selecciona {3 - compareIds.length} más para habilitar</p>
                  )}
                  <button onClick={() => setCompareIds([])} className="text-white/40 text-[10px] font-black uppercase hover:text-white transition-colors">Limpiar</button>
               </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
