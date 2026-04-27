'use client';

import { useState } from 'react';
import { saveLeadAction } from '@/app/actions';

export default function WizardContainer() {
  const [step, setStep] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [top10, setTop10] = useState<any[]>([]);

  // ESTADO LIMPIO: Sin el "garaje" del usuario
  const [formData, setFormData] = useState({
    nombre: '',
    celular: '',
    email: '',
    presupuestoMin: 15000,
    presupuestoMax: 45000,
    atributos: [] as string[],
    notasAdicionales: '',
    filtros: {
      todos: true, soloChinos: false, soloEV: false, soloHEV: false, soloJaponeses: false, soloCoreanos: false
    }
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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

  const handleFilterToggle = (filterKey: keyof typeof formData.filtros) => {
    setFormData(prev => {
      const newFiltros = { ...prev.filtros };
      if (filterKey === 'todos') {
        return { ...prev, filtros: { todos: true, soloChinos: false, soloEV: false, soloHEV: false, soloJaponeses: false, soloCoreanos: false }};
      }
      newFiltros[filterKey] = !newFiltros[filterKey];
      newFiltros.todos = false;
      
      if (filterKey === 'soloEV' && newFiltros.soloEV) newFiltros.soloHEV = false;
      if (filterKey === 'soloHEV' && newFiltros.soloHEV) newFiltros.soloEV = false;
      if (['soloChinos', 'soloJaponeses', 'soloCoreanos'].includes(filterKey) && newFiltros[filterKey]) {
        if (filterKey !== 'soloChinos') newFiltros.soloChinos = false;
        if (filterKey !== 'soloJaponeses') newFiltros.soloJaponeses = false;
        if (filterKey !== 'soloCoreanos') newFiltros.soloCoreanos = false;
      }
      if (!Object.entries(newFiltros).some(([k, v]) => k !== 'todos' && v)) newFiltros.todos = true;
      return { ...prev, filtros: newFiltros };
    });
  };

  // EL CEREBRO EN ACCIÓN: Botón único para Guardar + Analizar
  const handleExecuteAnalysis = async () => {
    setIsAnalyzing(true);
    
    // 1. Guardamos silenciosamente en Base de Datos
    const result = await saveLeadAction(formData);
    
    if (result.success) {
      // 2. Llamamos a Gemini
      try {
        const response = await fetch('/api/analyze', {
          method: 'POST',
          body: JSON.stringify({ leadId: result.leadId }),
          headers: { 'Content-Type': 'application/json' }
        });
        
        const analysis = await response.json();
        if (analysis.success) {
          setTop10(analysis.top10);
          setStep(2); // Pasamos al Dossier final
        } else {
          alert("Error en el análisis de IA.");
        }
      } catch (error) {
        console.error("Error al conectar con el Agente:", error);
      } finally {
        setIsAnalyzing(false);
      }
    } else {
      alert("Error al sincronizar con la base de datos.");
      setIsAnalyzing(false);
    }
  };

  const isStep1Valid = formData.nombre.trim() !== '' && formData.celular.trim() !== '';

  // PANTALLA DE CARGA GLOBAL
  if (isAnalyzing) {
    return (
      <div className="max-w-4xl mx-auto p-8 bg-white border border-[#3A3A3C]/20 font-inter text-center py-32">
        <div className="w-16 h-16 border-4 border-[#00BFFF] border-t-transparent rounded-full animate-spin mx-auto mb-8"></div>
        <h2 className="font-montserrat font-[900] text-[#0A1F33] text-2xl uppercase tracking-[4px]">Analizando Matriz</h2>
        <p className="text-[#3A3A3C] mt-3 text-sm font-medium uppercase tracking-widest opacity-60 animate-pulse">
          Gemini 1.5 Pro procesando 436 activos automotrices...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8 bg-white border border-[#3A3A3C]/20 font-inter text-[#3A3A3C]">
      
      {/* BRANDING */}
      <div className="text-center mb-10">
        <h1 className="text-5xl uppercase tracking-[1px] mb-2 select-none">
          <span className="font-montserrat font-[900] text-[#0A1F33]">DATA</span>
          <span className="font-montserrat font-[300] text-[#3A3A3C]">CAR</span>
        </h1>
        <p className="font-medium text-[#3A3A3C]/60 text-[10px] uppercase tracking-[3px]">Inversión Automotriz Basada en Datos</p>
      </div>

      {/* PASO 1: PERFIL */}
      {step === 1 && (
        <div className="space-y-10 animate-in fade-in duration-500">
           <section>
            <h2 className="font-montserrat font-[900] text-[#0A1F33] text-[11px] uppercase tracking-widest mb-5 border-l-4 border-[#00BFFF] pl-3">1. Perfil del Inversor</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input name="nombre" value={formData.nombre} onChange={handleInputChange} placeholder="Nombre completo *" className="p-3 border border-[#3A3A3C]/20 outline-none focus:border-[#0A1F33] text-sm bg-slate-50/50" />
              <input name="celular" value={formData.celular} onChange={handleInputChange} placeholder="Celular *" className="p-3 border border-[#3A3A3C]/20 outline-none focus:border-[#0A1F33] text-sm bg-slate-50/50" />
              <input name="email" value={formData.email} onChange={handleInputChange} placeholder="Email corporativo" className="p-3 border border-[#3A3A3C]/20 outline-none focus:border-[#0A1F33] text-sm bg-slate-50/50" />
            </div>
          </section>

          <section>
            <div className="flex justify-between items-end mb-5">
              <h2 className="font-montserrat font-[900] text-[#0A1F33] text-[11px] uppercase tracking-widest border-l-4 border-[#00BFFF] pl-3">2. Margen de Inversión (USD)</h2>
              <div className="font-montserrat font-[900] text-sm text-[#0A1F33]">
                ${formData.presupuestoMin.toLocaleString()} — ${formData.presupuestoMax.toLocaleString()}
              </div>
            </div>
            <div className="space-y-6 px-2">
              <div className="space-y-2">
                <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase"><span>Mínimo</span><span>${formData.presupuestoMin.toLocaleString()}</span></div>
                <input type="range" name="presupuestoMin" min="5000" max="150000" step="1000" value={formData.presupuestoMin} onChange={handleRangeChange} className="w-full h-1 bg-slate-100 appearance-none cursor-pointer accent-[#0A1F33]" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase"><span>Máximo</span><span>${formData.presupuestoMax.toLocaleString()}</span></div>
                <input type="range" name="presupuestoMax" min="5000" max="150000" step="1000" value={formData.presupuestoMax} onChange={handleRangeChange} className="w-full h-1 bg-slate-100 appearance-none cursor-pointer accent-[#00BFFF]" />
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div>
              <div className="flex justify-between items-center mb-5">
                <h2 className="font-montserrat font-[900] text-[#0A1F33] text-[11px] uppercase tracking-widest border-l-4 border-[#00BFFF] pl-3">3. Atributos (Máx 3)</h2>
                <span className="text-[9px] font-black text-[#00BFFF]">{formData.atributos.length}/3</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {['Seguridad', 'Dimensiones', 'Rendimiento', 'Precio', 'Tecnología'].map(at => {
                  const sel = formData.atributos.includes(at);
                  const dis = !sel && formData.atributos.length >= 3;
                  return (
                    <button key={at} onClick={() => toggleAtributo(at)} disabled={dis} className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest border transition-all ${sel ? 'bg-[#0A1F33] text-white border-[#0A1F33]' : 'bg-transparent text-[#3A3A3C] border-[#3A3A3C]/20'} ${dis ? 'opacity-20 cursor-not-allowed' : 'hover:border-[#0A1F33]'}`}>
                      {at}
                    </button>
                  );
                })}
              </div>
            </div>
            
            <div>
              <h2 className="font-montserrat font-[900] text-[#0A1F33] text-[11px] uppercase tracking-widest mb-5 border-l-4 border-[#00BFFF] pl-3">4. Filtros Estratégicos</h2>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Incluir Todos', key: 'todos' },
                  { label: 'Solo Chinos', key: 'soloChinos' },
                  { label: 'Solo EV', key: 'soloEV' },
                  { label: 'Solo HEV', key: 'soloHEV' },
                  { label: 'Japonesas', key: 'soloJaponeses' },
                  { label: 'Coreanas', key: 'soloCoreanos' }
                ].map(f => (
                  <button key={f.key} onClick={() => handleFilterToggle(f.key as any)} className={`flex justify-between items-center px-3 py-2 border text-[9px] font-black uppercase tracking-tighter transition-all ${formData.filtros[f.key as keyof typeof formData.filtros] ? 'border-[#00BFFF] text-[#00BFFF] bg-[#00BFFF]/5' : 'border-slate-100 text-slate-400 opacity-60'}`}>
                    {f.label}
                    <div className={`w-2 h-2 ${formData.filtros[f.key as keyof typeof formData.filtros] ? 'bg-[#00BFFF]' : 'bg-slate-200'}`}></div>
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-montserrat font-[900] text-[#0A1F33] text-[11px] uppercase tracking-widest mb-4">Notas Adicionales</h2>
            <textarea name="notasAdicionales" value={formData.notasAdicionales} onChange={handleInputChange} placeholder="Requerimientos específicos..." className="w-full p-4 border border-[#3A3A3C]/20 outline-none focus:border-[#0A1F33] text-sm min-h-[80px] bg-slate-50/30" />
          </section>

          {/* BOTÓN FINAL */}
          <div className="mt-16 pt-8 border-t border-slate-100 text-right">
            <button 
              disabled={!isStep1Valid}
              onClick={handleExecuteAnalysis} 
              className="bg-[#0A1F33] text-white px-12 py-5 font-montserrat font-[900] text-xs uppercase tracking-[3px] transition-all hover:bg-[#00BFFF] hover:text-[#0A1F33] disabled:bg-slate-100 disabled:text-slate-300 w-full md:w-auto"
            >
              Execute Analysis →
            </button>
          </div>
        </div>
      )}

      {/* PASO 2: EL DOSSIER DE RESULTADOS */}
      {step === 2 && (
        <div className="animate-in fade-in zoom-in-95 duration-500">
          <div className="border-b-2 border-[#0A1F33] pb-4 mb-8 flex justify-between items-end">
              <div>
                <h2 className="font-montserrat font-[900] text-[#0A1F33] text-2xl uppercase tracking-[2px]">Dossier de Inversión</h2>
                <p className="text-[#3A3A3C]/60 text-xs font-bold uppercase tracking-widest mt-1">TOP 10 Seleccionados por IA</p>
              </div>
              <button onClick={() => setStep(1)} className="text-[10px] font-black uppercase tracking-widest text-[#00BFFF] hover:underline">
                ← Volver al Perfil
              </button>
          </div>
          
          <div className="space-y-4">
            {top10.map((auto: any, index: number) => (
              <div key={index} className="p-6 bg-white border border-slate-200 hover:border-[#00BFFF] transition-all flex flex-col md:flex-row gap-6 items-start group">
                <div className="flex-shrink-0 w-12 h-12 bg-[#0A1F33] text-white flex items-center justify-center font-montserrat font-black text-xl">
                  #{auto.puesto || index + 1}
                </div>
                <div className="flex-grow">
                  <h3 className="font-montserrat font-[900] text-lg text-[#0A1F33] uppercase">{auto.marca} <span className="font-light">{auto.modelo}</span></h3>
                  <p className="text-sm text-[#3A3A3C] mt-2 leading-relaxed">{auto.justificacion}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
