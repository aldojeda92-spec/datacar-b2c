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
        if (analysis.success) {
          setTop10(analysis.top10);
          setStep(2);
        } else {
          alert(analysis.error || "Error en el análisis de IA.");
        }
      } catch (e) {
        alert("Fallo crítico de conexión.");
      } finally {
        setIsAnalyzing(false);
      }
    }
  };

  if (isAnalyzing) return (
    <div className="max-w-[1600px] mx-auto p-12 text-center py-48 bg-white border border-slate-100">
      <div className="w-16 h-16 border-4 border-[#00BFFF] border-t-transparent rounded-full animate-spin mx-auto mb-10"></div>
      <h2 className="font-montserrat font-black text-3xl uppercase tracking-[6px] text-[#0A1F33]">DATACAR ENGINE</h2>
      <p className="mt-4 text-slate-400 font-bold uppercase text-[10px] tracking-widest animate-pulse">Procesando Matriz Híbrida (SQL + Gemini 2.5 Pro)...</p>
    </div>
  );

  return (
    <div className={`max-w-[1600px] mx-auto p-8 font-inter transition-all duration-500 ${step === 2 ? 'bg-[#F9FAFB]' : 'bg-white'}`}>
      
      {/* BRANDING */}
      <div className="text-center mb-12 select-none">
        <h1 className="text-5xl uppercase tracking-[1px] mb-2 font-montserrat font-black text-[#0A1F33]">
          DATA<span className="font-light text-[#3A3A3C]">CAR</span>
        </h1>
        <p className="text-[10px] font-bold uppercase tracking-[4px] text-slate-400">Inteligencia Automotriz para Inversores</p>
      </div>

      {step === 1 && (
        <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in duration-700 bg-white p-12 border border-slate-100 shadow-sm">
          
          {/* SECCIÓN 1: PERFIL */}
          <section>
            <h2 className="font-montserrat font-black text-[11px] uppercase tracking-widest mb-6 border-l-4 border-[#00BFFF] pl-4 text-[#0A1F33]">1. Identificación del Perfil</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <p className="text-[9px] font-bold uppercase text-slate-400 ml-1">Nombre Completo</p>
                <input name="nombre" value={formData.nombre} onChange={handleInputChange} placeholder="Ej: Juan Pérez" className="w-full p-4 border border-slate-200 outline-none focus:border-[#0A1F33] text-sm bg-slate-50/30 transition-colors" />
              </div>
              <div className="space-y-1">
                <p className="text-[9px] font-bold uppercase text-slate-400 ml-1">WhatsApp / Celular</p>
                <input name="celular" value={formData.celular} onChange={handleInputChange} placeholder="Ej: 0981 123 456" className="w-full p-4 border border-slate-200 outline-none focus:border-[#0A1F33] text-sm bg-slate-50/30 transition-colors" />
              </div>
            </div>
          </section>

          {/* SECCIÓN 2: PRESUPUESTO */}
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

          {/* SECCIÓN 3: TIPO DE AUTO */}
          <section>
            <h2 className="font-montserrat font-black text-[11px] uppercase tracking-widest mb-6 border-l-4 border-[#00BFFF] pl-4 text-[#0A1F33]">3. Categoría de Activo (SQL Filter)</h2>
            <div className="flex flex-wrap gap-3">
              {['SUV', 'Pickup', 'Sedán', 'Hatchback', 'Furgón', 'Deportivo'].map(t => (
                <button key={t} onClick={() => toggleTipo(t)} className={`px-6 py-3 text-[10px] font-black uppercase tracking-widest border transition-all ${formData.tipos.includes(t) ? 'bg-[#0A1F33] text-white border-[#0A1F33] shadow-md' : 'bg-transparent text-slate-400 border-slate-200 hover:border-slate-400'}`}>
                  {t}
                </button>
              ))}
            </div>
          </section>

          {/* SECCIÓN 4: FILTROS ESTRATÉGICOS */}
          <section>
            <h2 className="font-montserrat font-black text-[11px] uppercase tracking-widest mb-6 border-l-4 border-[#00BFFF] pl-4 text-[#0A1F33]">4. Filtros de Exclusión (Origen / Motor)</h2>
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
                <button key={f.key} onClick={() => handleFilterToggle(f.key as any)} className={`flex justify-between items-center px-4 py-3.5 border text-[9px] font-black uppercase tracking-widest transition-all ${formData.filtros[f.key as keyof typeof formData.filtros] ? 'border-[#00BFFF] text-[#00BFFF] bg-[#00BFFF]/5' : 'border-slate-100 text-slate-300'}`}>
                  {f.label}
                  <div className={`w-2 h-2 ${formData.filtros[f.key as keyof typeof formData.filtros] ? 'bg-[#00BFFF]' : 'bg-slate-200'}`}></div>
                </button>
              ))}
            </div>
          </section>

          {/* SECCIÓN 5: ATRIBUTOS */}
          <section>
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-montserrat font-black text-[11px] uppercase tracking-widest border-l-4 border-[#00BFFF] pl-4 text-[#0A1F33]">5. Atributos Críticos (IA Priority)</h2>
              <span className="text-[10px] font-black text-[#00BFFF]">{formData.atributos.length}/3</span>
            </div>
            <div className="flex flex-wrap gap-3">
              {['Seguridad', 'Dimensiones', 'Rendimiento', 'Precio', 'Tecnología'].map(at => (
                <button key={at} onClick={() => toggleAtributo(at)} className={`px-6 py-3 text-[10px] font-black uppercase tracking-widest border transition-all ${formData.atributos.includes(at) ? 'bg-[#0A1F33] text-white border-[#0A1F33]' : 'bg-transparent text-slate-400 border-slate-200'}`}>
                  {at}
                </button>
              ))}
            </div>
          </section>

          {/* SECCIÓN 6: NOTAS */}
          <section>
            <h2 className="font-montserrat font-black text-[11px] uppercase tracking-widest mb-5 text-[#0A1F33]">6. Requerimientos Específicos (Notas)</h2>
            <textarea name="notasAdicionales" value={formData.notasAdicionales} onChange={handleInputChange} placeholder="Describe el uso que le darás al vehículo para que la IA refine la selección..." className="w-full p-5 border border-slate-200 outline-none focus:border-[#0A1F33] text-sm min-h-[140px] bg-slate-50/30 font-medium" />
          </section>

          <div className="text-right pt-10 border-t border-slate-100">
            <button 
              disabled={!formData.nombre || !formData.celular} 
              onClick={handleExecuteAnalysis} 
              className="bg-[#0A1F33] text-white px-20 py-6 font-montserrat font-black text-xs uppercase tracking-[4px] hover:bg-[#00BFFF] hover:text-[#0A1F33] transition-all disabled:opacity-10 shadow-xl"
            >
              Generar Dossier →
            </button>
          </div>
        </div>
      )}

      {/* PASO 2: DOSSIER PREMIUM */}
      {step === 2 && (
        <div className="animate-in fade-in zoom-in-95 duration-1000">
          
          {/* HEADER DOSSIER */}
          <div className="flex justify-between items-end mb-12 pb-8 border-b border-slate-200">
            <div>
              <h2 className="font-montserrat font-black text-4xl uppercase tracking-[2px] text-[#0A1F33]">Dossier de Inversión</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[4px] mt-3">Análisis estratégico de activos automotrices</p>
            </div>
            <button onClick={() => setStep(1)} className="text-[11px] font-black uppercase text-[#00BFFF] hover:tracking-widest transition-all">← Redefinir Parámetros</button>
          </div>

          {/* GRILLA DE TARJETAS (Respirando p-6) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-8">
            {top10.map((auto) => (
              <div key={auto.id} className="bg-white p-7 border border-slate-100 shadow-sm flex flex-col gap-6 hover:shadow-2xl hover:border-[#00BFFF] transition-all duration-500 group relative">
                
                {/* Imagen h-40 */}
                <div className="bg-slate-50 h-40 w-full flex items-center justify-center relative overflow-hidden">
                  {auto.url_imagen ? (
                    <img src={auto.url_imagen} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  ) : (
                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Visual no disponible</span>
                  )}
                  <div className="absolute top-0 left-0 bg-[#0A1F33] text-white text-[10px] px-4 py-2 font-black">TOP {auto.puesto}</div>
                </div>

                {/* Info Textual */}
                <div className="space-y-2">
                  <h4 className="font-montserrat font-black text-[15px] text-[#0A1F33] uppercase leading-tight group-hover:text-[#00BFFF] transition-colors">
                    {auto.marca} <span className="font-light text-slate-500">{auto.modelo}</span>
                  </h4>
                  <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest bg-slate-50 border border-slate-100 px-3 py-1.5 inline-block">
                    {auto.version} <span className="text-slate-200 mx-2">|</span> {auto.origen}
                  </p>
                </div>

                {/* Justificación IA (Opcional si quieres mostrarla) */}
                <p className="text-[10px] text-slate-400 leading-relaxed font-medium italic border-l-2 border-slate-100 pl-3 line-clamp-3">
                  {auto.justificacion}
                </p>

                {/* Precio y Badges */}
                <div className="mt-auto pt-6 border-t border-slate-50 space-y-4">
                  <div className="flex justify-between items-center">
                    <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Inversión desde</p>
                    <p className="font-montserrat font-black text-lg text-[#0A1F33]">${auto.precio_usd.toLocaleString()}</p>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center bg-[#00BFFF]/5 p-2 border border-[#00BFFF]/10">
                        <span className="text-[9px] font-black text-[#00BFFF] uppercase">Match Score</span>
                        <span className="text-[11px] font-black text-[#00BFFF]">{auto.match_percent}%</span>
                    </div>
                    <div className="text-[9px] font-black text-[#0A1F33] uppercase bg-slate-50 border border-slate-100 py-2 text-center tracking-tighter">
                      {auto.etiqueta_principal}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* BUSCADOR INFERIOR */}
          <div className="mt-20 p-12 bg-white border border-slate-100 shadow-sm">
            <h3 className="text-[#0A1F33] text-sm font-black uppercase tracking-[2px] mb-4">¿No encontraste el activo ideal?</h3>
            <p className="text-slate-400 text-xs font-semibold mb-8 uppercase tracking-widest">Explora la matriz completa de 436 activos automotrices.</p>
            <div className="relative max-w-3xl">
              <input 
                type="text" 
                placeholder="Buscar por marca, modelo o segmento..." 
                className="w-full p-5 pr-20 border-b-2 border-slate-100 outline-none focus:border-[#00BFFF] text-xs font-bold bg-transparent transition-all"
              />
              <button className="absolute right-0 top-1/2 -translate-y-1/2 bg-[#0A1F33] text-white p-4 hover:bg-[#00BFFF] transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
