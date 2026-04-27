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
    presupuestoMin: 15000,
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
      soloCombustion: false // Nuevo filtro
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
      newFiltros[key] = !newFiltros[key];
      newFiltros.todos = false;
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
      } catch (e) { alert("Error de comunicación con el servidor"); } 
      finally { setIsAnalyzing(false); }
    }
  };

  if (isAnalyzing) return (
    <div className="max-w-[1600px] mx-auto p-12 text-center py-48">
      <div className="w-16 h-16 border-4 border-[#00BFFF] border-t-transparent rounded-full animate-spin mx-auto mb-10"></div>
      <h2 className="font-montserrat font-black text-3xl uppercase tracking-[6px] text-[#0A1F33]">DATACAR ANALYTICS</h2>
      <p className="mt-4 text-slate-400 font-bold uppercase text-[10px] tracking-widest animate-pulse">Sincronizando Matriz Híbrida (SQL + IA)...</p>
    </div>
  );

  return (
    <div className={`max-w-[1600px] mx-auto p-8 font-inter text-[#3A3A3C] transition-all duration-500 ${step === 2 ? 'bg-[#F9FAFB]' : 'bg-white'}`}>
      <div className="text-center mb-12">
        <h1 className="text-5xl uppercase tracking-[1px] mb-2 font-montserrat font-black text-[#0A1F33]">DATA<span className="font-light text-[#3A3A3C]">CAR</span></h1>
        <p className="text-[10px] font-bold uppercase tracking-[4px] text-slate-400">Inteligencia Automotriz Estratégica</p>
      </div>

      {step === 1 && (
        <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in bg-white p-10 border border-[#3A3A3C]/10 shadow-sm">
          
          {/* 1. PERFIL */}
          <section>
            <h2 className="font-montserrat font-black text-[12px] uppercase tracking-widest mb-6 border-l-4 border-[#00BFFF] pl-3 text-[#0A1F33]">1. Identificación del Inversor</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input name="nombre" value={formData.nombre} onChange={handleInputChange} placeholder="Nombre Completo *" className="p-3.5 border border-[#3A3A3C]/15 outline-none text-sm bg-slate-50/30 focus:border-[#0A1F33]" />
              <input name="celular" value={formData.celular} onChange={handleInputChange} placeholder="WhatsApp *" className="p-3.5 border border-[#3A3A3C]/15 outline-none text-sm bg-slate-50/30 focus:border-[#0A1F33]" />
              <input name="email" value={formData.email} onChange={handleInputChange} placeholder="Email Corporativo" className="p-3.5 border border-[#3A3A3C]/15 outline-none text-sm bg-slate-50/30 focus:border-[#0A1F33]" />
            </div>
          </section>

          {/* 2. PRESUPUESTO */}
          <section>
            <div className="flex justify-between items-end mb-6">
              <h2 className="font-montserrat font-black text-[12px] uppercase tracking-widest border-l-4 border-[#00BFFF] pl-3 text-[#0A1F33]">2. Rango de Inversión Objetivo (USD)</h2>
              <div className="font-montserrat font-black text-lg text-[#0A1F33]">${formData.presupuestoMin.toLocaleString()} — ${formData.presupuestoMax.toLocaleString()}</div>
            </div>
            <div className="space-y-6">
              <input type="range" name="presupuestoMin" min="5000" max="150000" step="1000" value={formData.presupuestoMin} onChange={handleRangeChange} className="w-full h-1.5 bg-slate-100 accent-[#0A1F33] cursor-pointer" />
              <input type="range" name="presupuestoMax" min="5000" max="150000" step="1000" value={formData.presupuestoMax} onChange={handleRangeChange} className="w-full h-1.5 bg-slate-100 accent-[#00BFFF] cursor-pointer" />
            </div>
          </section>

          {/* 3. TIPO DE CARROCERÍA */}
          <section>
            <h2 className="font-montserrat font-black text-[12px] uppercase tracking-widest mb-6 border-l-4 border-[#00BFFF] pl-3 text-[#0A1F33]">3. Categoría de Activo</h2>
            <div className="flex flex-wrap gap-2.5">
              {['SUV', 'Pickup', 'Sedán', 'Hatchback', 'Furgón', 'Deportivo'].map(t => (
                <button key={t} onClick={() => toggleTipo(t)} className={`px-5 py-2.5 text-[11px] font-black uppercase tracking-widest border transition-all ${formData.tipos.includes(t) ? 'bg-[#0A1F33] text-white border-[#0A1F33]' : 'bg-transparent text-[#3A3A3C] border-[#3A3A3C]/20 hover:bg-slate-50'}`}>
                  {t}
                </button>
              ))}
            </div>
          </section>

          {/* 4. ATRIBUTOS CRÍTICOS */}
          <section>
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-montserrat font-black text-[12px] uppercase tracking-widest border-l-4 border-[#00BFFF] pl-3 text-[#0A1F33]">4. Atributos Críticos (Prioridad IA)</h2>
              <span className="text-[10px] font-black text-[#00BFFF]">{formData.atributos.length}/3</span>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {['Seguridad', 'Dimensiones', 'Rendimiento', 'Precio', 'Tecnología'].map(at => (
                <button key={at} onClick={() => toggleAtributo(at)} className={`px-5 py-2.5 text-[11px] font-black uppercase tracking-widest border transition-all ${formData.atributos.includes(at) ? 'bg-[#0A1F33] text-white border-[#0A1F33]' : 'bg-transparent text-[#3A3A3C] border-[#3A3A3C]/20'}`}>
                  {at}
                </button>
              ))}
            </div>
          </section>

          {/* 5. FILTROS ESTRATÉGICOS (SQL) */}
          <section>
            <h2 className="font-montserrat font-black text-[12px] uppercase tracking-widest mb-6 border-l-4 border-[#00BFFF] pl-3 text-[#0A1F33]">5. Filtros Estratégicos (Exclusivos)</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Todos', key: 'todos' },
                { label: 'Solo Chinos', key: 'soloChinos' },
                { label: 'Solo Japoneses', key: 'soloJaponeses' },
                { label: 'Solo Coreanos', key: 'soloCoreanos' },
                { label: 'Solo EV (Eléctrico)', key: 'soloEV' },
                { label: 'Solo HEV (Híbrido)', key: 'soloHEV' },
                { label: 'Solo Combustión', key: 'soloCombustion' }
              ].map(f => (
                <button key={f.key} onClick={() => handleFilterToggle(f.key as any)} className={`flex justify-between items-center px-4 py-3 border text-[10px] font-black uppercase tracking-tight transition-all ${formData.filtros[f.key as keyof typeof formData.filtros] ? 'border-[#00BFFF] text-[#00BFFF] bg-[#00BFFF]/5' : 'border-slate-100 text-slate-400'}`}>
                  {f.label}
                  <div className={`w-1.5 h-1.5 ${formData.filtros[f.key as keyof typeof formData.filtros] ? 'bg-[#00BFFF]' : 'bg-slate-200'}`}></div>
                </button>
              ))}
            </div>
          </section>

          {/* 6. NOTAS */}
          <section>
            <h2 className="font-montserrat font-black text-[12px] uppercase tracking-widest mb-5 text-[#0A1F33]">Notas Adicionales / Requerimientos</h2>
            <textarea name="notasAdicionales" value={formData.notasAdicionales} onChange={handleInputChange} placeholder="Ej: Espacio para 3 sillas de niños, uso 80% ciudad, prefiero colores sobrios..." className="w-full p-4 border border-[#3A3A3C]/15 outline-none focus:border-[#0A1F33] text-sm min-h-[120px] bg-slate-50/30" />
          </section>

          <div className="text-right pt-8 border-t border-slate-100">
            <button disabled={!formData.nombre || !formData.celular} onClick={handleExecuteAnalysis} className="bg-[#0A1F33] text-white px-16 py-5 font-montserrat font-black text-xs uppercase tracking-[3px] hover:bg-[#00BFFF] hover:text-[#0A1F33] transition-all disabled:opacity-10 w-full md:w-auto">
              Generar Dossier de Inversión →
            </button>
          </div>
        </div>
      )}

      {/* PASO 2: RESULTADOS */}
      {step === 2 && (
        <div className="animate-in fade-in zoom-in-95 duration-700">
          <div className="flex justify-between items-end mb-10 pb-6 border-b border-[#3A3A3C]/10">
            <div>
              <h2 className="font-montserrat font-black text-3xl uppercase tracking-[2px] text-[#0A1F33]">Dossier de Inversión</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Basado en tu perfil y filtros estratégicos</p>
            </div>
            <button onClick={() => setStep(1)} className="text-[11px] font-black uppercase text-[#00BFFF] hover:underline">← Redefinir Perfil</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {top10.map((auto) => (
              <div key={auto.id} className="bg-white p-6 border border-[#3A3A3C]/10 shadow-sm flex flex-col gap-5 hover:border-[#00BFFF] transition-all group">
                <div className="bg-slate-100 h-32 w-full flex items-center justify-center text-[11px] font-bold uppercase relative overflow-hidden">
                  {auto.url_imagen ? <img src={auto.url_imagen} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" /> : 'Sin imagen'}
                  <div className="absolute top-0 left-0 bg-[#0A1F33] text-white text-[10px] px-3 py-1.5 font-black">TOP {auto.puesto}</div>
                </div>
                <div>
                  <h4 className="font-montserrat font-black text-[14px] text-[#0A1F33] uppercase leading-tight group-hover:text-[#00BFFF]">{auto.marca} <span className="font-medium text-[#3A3A3C]">{auto.modelo}</span></h4>
                  <p className="text-[10px] text-slate-500 uppercase font-bold mt-2 bg-slate-50 border px-2 py-1 inline-block">{auto.version} | {auto.origen}</p>
                </div>
                <div className="mt-auto border-t pt-4 space-y-3">
                  <p className="font-montserrat font-black text-[17px] text-[#0A1F33]">${auto.precio_usd.toLocaleString()}</p>
                  <div className="flex flex-col gap-1.5">
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
