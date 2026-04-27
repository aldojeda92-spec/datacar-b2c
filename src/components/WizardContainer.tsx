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
}

export default function WizardContainer() {
  const [step, setStep] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [top10, setTop10] = useState<IAAuto[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

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

  // NUEVA LÓGICA DE FILTROS EXCLUYENTES
  const handleFilterToggle = (key: keyof typeof formData.filtros) => {
    setFormData(prev => {
      const newFiltros = { ...prev.filtros };

      // Caso 1: Click en "Todos" -> Resetea absolutamente todo
      if (key === 'todos') {
        return {
          ...prev,
          filtros: {
            todos: true,
            soloChinos: false, soloJaponeses: false, soloCoreanos: false,
            soloEV: false, soloHEV: false, soloCombustion: false
          }
        };
      }

      // Invertimos el valor del filtro clickeado
      const targetValue = !newFiltros[key];
      newFiltros[key] = targetValue;

      // Caso 2: Mutua Exclusión de Origen
      if (targetValue && ['soloChinos', 'soloJaponeses', 'soloCoreanos'].includes(key)) {
        if (key !== 'soloChinos') newFiltros.soloChinos = false;
        if (key !== 'soloJaponeses') newFiltros.soloJaponeses = false;
        if (key !== 'soloCoreanos') newFiltros.soloCoreanos = false;
      }

      // Caso 3: Mutua Exclusión de Motor
      if (targetValue && ['soloEV', 'soloHEV', 'soloCombustion'].includes(key)) {
        if (key !== 'soloEV') newFiltros.soloEV = false;
        if (key !== 'soloHEV') newFiltros.soloHEV = false;
        if (key !== 'soloCombustion') newFiltros.soloCombustion = false;
      }

      // Si algún filtro quedó activo, "Todos" debe ser false. Si no queda ninguno, "Todos" es true.
      const anyActive = Object.entries(newFiltros).some(([k, v]) => k !== 'todos' && v === true);
      newFiltros.todos = !anyActive;

      return { ...prev, filtros: newFiltros };
    });
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
      } catch (e) { alert("Error de comunicación"); } 
      finally { setIsAnalyzing(false); }
    }
  };

  if (isAnalyzing) return (
    <div className="max-w-[1600px] mx-auto p-12 text-center py-48 bg-white">
      <div className="w-16 h-16 border-4 border-[#00BFFF] border-t-transparent rounded-full animate-spin mx-auto mb-10"></div>
      <h2 className="font-montserrat font-black text-3xl uppercase tracking-[6px] text-[#0A1F33]">DATACAR ENGINE</h2>
      <p className="mt-4 text-slate-400 font-bold uppercase text-[10px] tracking-widest animate-pulse">Procesando con Gemini 2.5 Pro...</p>
    </div>
  );

  return (
    <div className={`max-w-[1600px] mx-auto p-8 font-inter ${step === 2 ? 'bg-[#F9FAFB]' : 'bg-white'}`}>
      <div className="text-center mb-12 select-none">
        <h1 className="text-5xl uppercase tracking-[1px] mb-2 font-montserrat font-black text-[#0A1F33]">DATA<span className="font-light text-[#3A3A3C]">CAR</span></h1>
        <p className="text-[10px] font-bold uppercase tracking-[4px] text-slate-400">Inteligencia Automotriz Estratégica</p>
      </div>

      {step === 1 && (
        <div className="max-w-4xl mx-auto space-y-12 bg-white p-12 border border-slate-100 shadow-sm animate-in fade-in duration-500">
          
          <section>
            <h2 className="font-montserrat font-black text-[11px] uppercase tracking-widest mb-6 border-l-4 border-[#00BFFF] pl-4 text-[#0A1F33]">1. Identificación</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <input name="nombre" value={formData.nombre} onChange={handleInputChange} placeholder="Nombre Completo *" className="w-full p-4 border border-slate-200 outline-none text-sm bg-slate-50/30 focus:border-[#0A1F33]" />
              <input name="celular" value={formData.celular} onChange={handleInputChange} placeholder="WhatsApp / Celular *" className="w-full p-4 border border-slate-200 outline-none text-sm bg-slate-50/30 focus:border-[#0A1F33]" />
            </div>
          </section>

          <section>
            <div className="flex justify-between items-end mb-8">
              <h2 className="font-montserrat font-black text-[11px] uppercase tracking-widest border-l-4 border-[#00BFFF] pl-4 text-[#0A1F33]">2. Rango de Inversión (USD)</h2>
              <div className="font-montserrat font-black text-xl text-[#0A1F33]">${formData.presupuestoMin.toLocaleString()} — ${formData.presupuestoMax.toLocaleString()}</div>
            </div>
            <input type="range" name="presupuestoMin" min="5000" max="150000" step="1000" value={formData.presupuestoMin} onChange={handleRangeChange} className="w-full h-1.5 bg-slate-100 mb-6 accent-[#0A1F33]" />
            <input type="range" name="presupuestoMax" min="5000" max="150000" step="1000" value={formData.presupuestoMax} onChange={handleRangeChange} className="w-full h-1.5 bg-slate-100 accent-[#00BFFF]" />
          </section>

          <section>
            <h2 className="font-montserrat font-black text-[11px] uppercase tracking-widest mb-6 border-l-4 border-[#00BFFF] pl-4 text-[#0A1F33]">3. Categoría de Activo</h2>
            <div className="flex flex-wrap gap-3">
              {['SUV', 'Pickup', 'Sedán', 'Hatchback', 'Furgón', 'Deportivo'].map(t => (
                <button key={t} onClick={() => toggleTipo(t)} className={`px-6 py-3 text-[10px] font-black uppercase tracking-widest border transition-all ${formData.tipos.includes(t) ? 'bg-[#0A1F33] text-white' : 'bg-transparent text-slate-400 border-slate-200 hover:border-slate-400'}`}>
                  {t}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h2 className="font-montserrat font-black text-[11px] uppercase tracking-widest mb-6 border-l-4 border-[#00BFFF] pl-4 text-[#0A1F33]">4. Filtros Estratégicos (Exclusivos)</h2>
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
                <button key={f.key} onClick={() => handleFilterToggle(f.key as any)} className={`flex justify-between items-center px-4 py-3 border text-[9px] font-black uppercase tracking-tighter transition-all ${formData.filtros[f.key as keyof typeof formData.filtros] ? 'border-[#00BFFF] text-[#00BFFF] bg-[#00BFFF]/5' : 'border-slate-100 text-slate-300'}`}>
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
                <button key={at} onClick={() => toggleAtributo(at)} className={`px-6 py-3 text-[10px] font-black uppercase tracking-widest border transition-all ${formData.atributos.includes(at) ? 'bg-[#0A1F33] text-white' : 'bg-transparent text-slate-400 border-slate-200'}`}>
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
            <button disabled={!formData.nombre || !formData.celular} onClick={handleExecuteAnalysis} className="bg-[#0A1F33] text-white px-20 py-6 font-montserrat font-black text-xs uppercase tracking-[4px] hover:bg-[#00BFFF] transition-all disabled:opacity-10 w-full md:w-auto shadow-lg">Generar Dossier →</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="animate-in fade-in zoom-in-95 duration-1000">
          <div className="flex justify-between items-end mb-12 pb-8 border-b border-slate-200">
            <h2 className="font-montserrat font-black text-4xl uppercase text-[#0A1F33]">Dossier</h2>
            <button onClick={() => setStep(1)} className="text-[11px] font-black uppercase text-[#00BFFF]">← Volver</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
            {top10.map((auto) => (
              <div key={auto.id} className="bg-white p-7 border border-slate-100 shadow-sm flex flex-col gap-6 hover:shadow-xl transition-all group">
                <div className="bg-slate-50 h-36 w-full flex items-center justify-center relative overflow-hidden">
                  {auto.url_imagen ? <img src={auto.url_imagen} className="w-full h-full object-cover group-hover:scale-110 transition-duration-700" /> : 'Sin imagen'}
                  <div className="absolute top-0 left-0 bg-[#0A1F33] text-white text-[10px] px-3 py-1.5 font-black">TOP {auto.puesto}</div>
                </div>
                <h4 className="font-montserrat font-black text-[15px] text-[#0A1F33] uppercase leading-tight">{auto.marca} <span className="font-light text-slate-500">{auto.modelo}</span></h4>
                <div className="mt-auto border-t pt-6 space-y-4">
                  <p className="font-montserrat font-black text-xl text-[#0A1F33]">${auto.precio_usd.toLocaleString()}</p>
                  <div className="flex flex-col gap-2">
                    <span className="bg-[#00BFFF]/10 text-[#00BFFF] text-[9px] font-black px-2 py-1 text-center">Match {auto.match_percent}%</span>
                    <span className="bg-[#0A1F33]/5 text-[#0A1F33] text-[9px] font-black px-2 py-1 border text-center">{auto.etiqueta_principal}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
