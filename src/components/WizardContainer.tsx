'use client';

import { useState } from 'react';
import { saveLeadAction } from '@/app/actions';

interface IAAuto {
  id: string;
  puesto: number;
  match_percent: number;
  etiqueta_principal: string;
  marca: string;
  modelo: string;
  version: string;
  precioUsd: number;
  origen: string;
  urlImagen?: string;
  motor?: string;
  traccion?: string;
  bauleraLitros?: number;
  versiones: any[];
}

export default function WizardContainer() {
  const [step, setStep] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [top10, setTop10] = useState<IAAuto[]>([]);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    nombre: '', celular: '', email: '',
    presupuestoMin: 18000, presupuestoMax: 45000,
    atributos: [] as string[], tipos: [] as string[],
    notasAdicionales: '',
    filtros: {
      todos: true, soloChinos: false, soloJaponeses: false, soloCoreanos: false,
      soloEV: false, soloHEV: false, soloCombustion: false
    }
  });

  // --- LÓGICA DE CONTROL ---
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

  const toggleTipo = (tipo: string) => {
    setFormData(prev => ({
      ...prev,
      tipos: prev.tipos.includes(tipo) ? prev.tipos.filter(t => t !== tipo) : [...prev.tipos, tipo]
    }));
  };

  const handleFilterToggle = (key: keyof typeof formData.filtros) => {
    setFormData(prev => {
      const newFiltros = { ...prev.filtros };
      if (key === 'todos') return { ...prev, filtros: { todos: true, soloChinos: false, soloJaponeses: false, soloCoreanos: false, soloEV: false, soloHEV: false, soloCombustion: false } };
      
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
      newFiltros.todos = !Object.entries(newFiltros).some(([k, v]) => k !== 'todos' && v === true);
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
        const res = await fetch('/api/analyze', { method: 'POST', body: JSON.stringify({ leadId: result.leadId }) });
        const data = await res.json();
        if (data.success) { setTop10(data.top10); setStep(2); }
        else { alert(data.error); }
      } catch (e) { alert("Error de red"); }
    }
    setIsAnalyzing(false);
  };

  if (isAnalyzing) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <div className="w-12 h-12 border-2 border-[#00BFFF] border-t-transparent rounded-full animate-spin mb-6"></div>
      <h2 className="font-montserrat font-black text-xl uppercase tracking-[8px] text-[#0A1F33]">DATACAR ENGINE</h2>
    </div>
  );

  return (
    <div className={`min-h-screen font-inter transition-all duration-700 ${step === 2 ? 'bg-[#F4F7F9]' : 'bg-white'}`}>
      
      {/* BRANDING */}
      <div className="max-w-[1600px] mx-auto p-10 flex justify-between items-center">
        <h1 className="text-4xl font-montserrat font-black text-[#0A1F33] uppercase select-none">
          DATA<span className="font-light text-slate-300">CAR</span>
        </h1>
        {step === 2 && (
          <button onClick={() => setStep(1)} className="text-[10px] font-black uppercase border-b-2 border-[#00BFFF] tracking-widest pb-1 hover:tracking-widest transition-all">
            ← Nueva Búsqueda
          </button>
        )}
      </div>

      {/* STEP 1: DISEÑO CORPORATIVO RESTAURADO */}
      {step === 1 && (
        <div className="max-w-4xl mx-auto p-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <div className="bg-white border border-slate-100 p-12 shadow-2xl space-y-16">
            
            <section className="space-y-8">
              <div className="flex items-center gap-4">
                <span className="bg-[#0A1F33] text-white w-8 h-8 flex items-center justify-center font-black text-xs">01</span>
                <h2 className="font-montserrat font-black text-xs uppercase tracking-widest text-[#0A1F33]">Datos del Inversor</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <input name="nombre" value={formData.nombre} onChange={handleInputChange} placeholder="Nombre Completo *" className="p-4 border-b-2 bg-slate-50/30 outline-none focus:border-[#0A1F33] text-sm font-medium" />
                <input name="celular" value={formData.celular} onChange={handleInputChange} placeholder="WhatsApp / Celular *" className="p-4 border-b-2 bg-slate-50/30 outline-none focus:border-[#0A1F33] text-sm font-medium" />
              </div>
            </section>

            <section className="space-y-8">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <span className="bg-[#0A1F33] text-white w-8 h-8 flex items-center justify-center font-black text-xs">02</span>
                  <h2 className="font-montserrat font-black text-xs uppercase tracking-widest text-[#0A1F33]">Inversión Estimada (USD)</h2>
                </div>
                <div className="text-xl font-montserrat font-black text-[#0A1F33] tracking-tighter">
                   ${formData.presupuestoMin.toLocaleString()} — ${formData.presupuestoMax.toLocaleString()}
                </div>
              </div>
              <div className="space-y-10 px-2">
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
                {['SUV', 'Pickup', 'Sedán', 'Hatchback', 'Deportivo'].map(t => (
                  <button key={t} onClick={() => toggleTipo(t)} className={`px-6 py-3 text-[10px] font-black uppercase border-2 transition-all ${formData.tipos.includes(t) ? 'bg-[#0A1F33] border-[#0A1F33] text-white' : 'text-slate-300 border-slate-50 hover:border-slate-200'}`}>{t}</button>
                ))}
              </div>
            </section>

            <section className="space-y-8">
              <div className="flex items-center gap-4">
                <span className="bg-[#0A1F33] text-white w-8 h-8 flex items-center justify-center font-black text-xs">04</span>
                <h2 className="font-montserrat font-black text-xs uppercase tracking-widest text-[#0A1F33]">Filtros de Exclusión</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  {l:'Todos',k:'todos'},{l:'Chinos',k:'soloChinos'},{l:'Japoneses',k:'soloJaponeses'},
                  {l:'Eléctricos',k:'soloEV'},{l:'Híbridos',k:'soloHEV'},{l:'Combustión',k:'soloCombustion'}
                ].map(f => (
                  <button key={f.k} onClick={() => handleFilterToggle(f.k as any)} className={`p-4 border-2 flex flex-col items-start transition-all ${formData.filtros[f.k as keyof typeof formData.filtros] ? 'border-[#00BFFF] bg-[#00BFFF]/5 text-[#00BFFF]' : 'border-slate-50 text-slate-300 opacity-60'}`}>
                    <span className="text-[9px] font-black uppercase tracking-widest">{f.l}</span>
                    <div className={`w-4 h-1 mt-2 ${formData.filtros[f.k as keyof typeof formData.filtros] ? 'bg-[#00BFFF]' : 'bg-slate-100'}`}></div>
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-6">
              <h2 className="font-montserrat font-black text-[11px] uppercase tracking-widest text-[#0A1F33]">05. Notas y Perfil de Uso</h2>
              <textarea name="notasAdicionales" value={formData.notasAdicionales} onChange={handleInputChange} placeholder="Describa requerimientos específicos para el análisis de IA..." className="w-full p-6 border-2 border-slate-50 outline-none focus:border-[#0A1F33] text-sm min-h-[140px] bg-slate-50/20 font-medium transition-all" />
            </section>

            <button disabled={!formData.nombre || !formData.celular} onClick={handleExecuteAnalysis} className="w-full py-6 bg-[#0A1F33] text-white font-montserrat font-black text-xs uppercase tracking-[5px] hover:bg-[#00BFFF] transition-all shadow-xl">Generar Análisis Estratégico →</button>
          </div>
        </div>
      )}

      {/* STEP 2: DOSSIER PREMIUM CON AIRE (P-10) */}
      {step === 2 && (
        <div className="max-w-[1700px] mx-auto p-10 pb-32 animate-in fade-in zoom-in-95 duration-1000">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5 gap-10">
            {top10.map((auto) => {
              const isComparing = compareIds.includes(auto.id);
              const isExpanded = expandedId === auto.id;

              return (
                <div key={auto.id} className={`group bg-white flex flex-col border transition-all duration-500 relative ${isComparing ? 'border-[#00BFFF] ring-4 ring-[#00BFFF]/10 shadow-2xl' : 'border-slate-100 shadow-sm hover:shadow-2xl'}`}>
                  
                  <div className="absolute -top-3 -left-3 w-10 h-10 bg-[#0A1F33] text-white flex items-center justify-center font-montserrat font-black text-base z-10">{auto.puesto}</div>

                  <div className="relative h-56 bg-slate-50 overflow-hidden">
                    {auto.urlImagen ? <img src={auto.urlImagen} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" /> : <div className="h-full flex items-center justify-center text-[10px] text-slate-300 font-black uppercase tracking-widest">Sin Imagen</div>}
                    <button onClick={() => toggleCompare(auto.id)} className={`absolute top-4 right-4 px-3 py-1.5 text-[8px] font-black border transition-all ${isComparing ? 'bg-[#00BFFF] text-white border-[#00BFFF]' : 'bg-white/90 text-slate-400 border-slate-200 hover:text-[#00BFFF]'}`}>
                      {isComparing ? '✓ SELECCIONADO' : '+ COMPARAR'}
                    </button>
                  </div>

                  {/* CONTENIDO CON MÁXIMO AIRE (P-10) */}
                  <div className="p-10 flex-1 flex flex-col gap-10">
                    <div className="space-y-4">
                      <h4 className="font-montserrat font-black text-lg text-[#0A1F33] uppercase leading-tight group-hover:text-[#00BFFF] transition-colors">{auto.marca} <br /> <span className="font-light text-slate-400">{auto.modelo}</span></h4>
                      <div className="flex gap-2">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 border px-3 py-1.5 inline-block">{auto.version}</p>
                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest px-3 py-1.5 border border-slate-100 inline-block">{auto.origen}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 py-8 border-y border-slate-50">
                      <div><p className="text-[8px] font-black text-slate-300 uppercase tracking-[2px]">Match Score</p><p className="font-black text-xl text-[#00BFFF]">{auto.match_percent}%</p></div>
                      <div className="text-right"><p className="text-[8px] font-black text-slate-300 uppercase tracking-[2px]">Inversión</p><p className="font-black text-xl text-[#0A1F33]">${auto.precioUsd?.toLocaleString()}</p></div>
                    </div>

                    <button onClick={() => setExpandedId(isExpanded ? null : auto.id)} className="text-[9px] font-black text-[#00BFFF] text-left hover:tracking-widest transition-all uppercase tracking-widest">
                      {isExpanded ? '– Ocultar Especificaciones' : '+ Ver Datos Técnicos y Versiones'}
                    </button>

                    {isExpanded && (
                      <div className="animate-in slide-in-from-top-2 duration-300 space-y-6 pt-2">
                        <div className="text-[11px] space-y-3 text-slate-500 font-medium border-l-2 border-[#00BFFF] pl-4">
                          <p className="flex flex-col"><span className="text-[8px] font-black uppercase text-slate-300">Motor:</span> <span className="text-[#0A1F33] font-bold">{auto.motor}</span></p>
                          <p className="flex flex-col"><span className="text-[8px] font-black uppercase text-slate-300">Tracción:</span> <span className="text-[#0A1F33] font-bold">{auto.traccion}</span></p>
                        </div>
                        <div className="pt-2">
                          <p className="text-[9px] font-black text-[#0A1F33] uppercase border-b pb-2 mb-3 tracking-widest">Gama de Versiones:</p>
                          {auto.versiones?.map((v: any) => (
                            <div key={v.id} className="flex justify-between py-2 text-[10px] border-b border-slate-50 group/row hover:bg-slate-50 transition-colors">
                              <span className="text-slate-400">{v.version}</span>
                              <span className="font-black text-[#0A1F33]">${v.precioUsd.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-auto">
                      <a href={`https://wa.me/595981123456?text=Me interesa el ${auto.marca} ${auto.modelo}`} target="_blank" className="block w-full py-6 bg-[#0A1F33] text-white text-center font-black text-[10px] uppercase tracking-[4px] hover:bg-[#00BFFF] hover:text-[#0A1F33] transition-all shadow-lg active:scale-95">Quiero Comprar</a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* DOCK COMPARADOR */}
          {compareIds.length > 0 && (
            <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-50 bg-[#0A1F33] text-white p-8 shadow-2xl flex items-center gap-16 border-t-4 border-[#00BFFF] animate-in slide-in-from-bottom-10 rounded-sm">
               <div className="space-y-1"><p className="text-[9px] font-black text-[#00BFFF] uppercase tracking-[4px]">Comparador Activo</p><p className="text-sm font-bold uppercase tracking-tighter">{compareIds.length} <span className="text-slate-500 font-light">de 3 Activos</span></p></div>
               <div className="flex gap-4">
                  {compareIds.length === 3 ? <button className="bg-[#00BFFF] text-[#0A1F33] px-10 py-4 font-black text-[10px] uppercase tracking-[2px] hover:bg-white transition-all">Comparar Datos Duros</button> : <p className="text-[10px] text-slate-500 italic font-medium tracking-widest">Faltan {3 - compareIds.length} más...</p>}
                  <button onClick={() => setCompareIds([])} className="text-white/30 hover:text-white transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
               </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
