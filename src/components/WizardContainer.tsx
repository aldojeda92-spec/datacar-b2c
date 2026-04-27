'use client';

import { useState } from 'react';
import { saveLeadAction } from '@/app/actions';

// Definimos la interfaz enriquecida que viene de Gemini
interface IAAuto {
  id: string;
  puesto: number;
  match_percent: number;
  etiqueta_principal: string;
  justificacion: string;
  // Datos técnicos de la base de datos
  marca: string;
  modelo: string;
  version: string;
  precio_usd: number;
  origen: string;
  url_imagen?: string;
  baulera_litros?: number;
  adas?: string;
}

export default function WizardContainer() {
  const [step, setStep] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [top10, setTop10] = useState<IAAuto[]>([]);
  const [searchTerm, setSearchTerm] = useState(''); // Estado para el buscador final

  // ESTADO LIMPIO
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

  // EL CEREBRO EN ACCIÓN
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
          alert("Error en el análisis de IA. Falló la conexión con Gemini.");
        }
      } catch (error) {
        console.error("Error al conectar con el Agente:", error);
        alert("Error crítico de red.");
      } finally {
        setIsAnalyzing(false);
      }
    } else {
      alert("Error al sincronizar datos.");
      setIsAnalyzing(false);
    }
  };

  const isStep1Valid = formData.nombre.trim() !== '' && formData.celular.trim() !== '';

  // PANTALLA DE CARGA
  if (isAnalyzing) {
    return (
      <div className="max-w-[1600px] mx-auto p-12 bg-white font-inter text-center py-48 border border-[#3A3A3C]/10">
        <div className="w-16 h-16 border-4 border-[#00BFFF] border-t-transparent rounded-full animate-spin mx-auto mb-10"></div>
        <h2 className="font-montserrat font-[900] text-[#0A1F33] text-3xl uppercase tracking-[6px] mb-3">Analizando Matriz</h2>
        <p className="text-[#3A3A3C]/70 text-sm font-medium uppercase tracking-widest animate-pulse">
          Gemini 1.5 Flash procesando 436 activos automotrices para tu perfil...
        </p>
      </div>
    );
  }

  return (
    <div className={`max-w-[1600px] mx-auto p-8 font-inter text-[#3A3A3C] transition-all duration-500 ${step === 2 ? 'bg-[#F9FAFB]' : 'bg-white'}`}>
      
      {/* BRANDING */}
      <div className="text-center mb-12">
        <h1 className="text-5xl uppercase tracking-[1px] mb-2 select-none">
          <span className="font-montserrat font-[900] text-[#0A1F33]">DATA</span>
          <span className="font-montserrat font-[300] text-[#3A3A3C]">CAR</span>
        </h1>
        <p className="font-medium text-[#3A3A3C]/60 text-[11px] uppercase tracking-[4px]">Inversión Automotriz Basada en Datos</p>
      </div>

      {/* PASO 1: PERFIL */}
      {step === 1 && (
        <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in duration-500 bg-white p-10 border border-[#3A3A3C]/10 shadow-sm">
           <section>
            <h2 className="font-montserrat font-[900] text-[#0A1F33] text-[12px] uppercase tracking-widest mb-6 border-l-4 border-[#00BFFF] pl-3">1. Perfil del Inversor</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input name="nombre" value={formData.nombre} onChange={handleInputChange} placeholder="Nombre completo *" className="p-3.5 border border-[#3A3A3C]/15 outline-none focus:border-[#0A1F33] text-sm bg-slate-50/30" />
              <input name="celular" value={formData.celular} onChange={handleInputChange} placeholder="Celular (ej. 0981...)*" className="p-3.5 border border-[#3A3A3C]/15 outline-none focus:border-[#0A1F33] text-sm bg-slate-50/30" />
              <input name="email" value={formData.email} onChange={handleInputChange} placeholder="Email corporativo" className="p-3.5 border border-[#3A3A3C]/15 outline-none focus:border-[#0A1F33] text-sm bg-slate-50/30" />
            </div>
          </section>

          <section>
            <div className="flex justify-between items-end mb-6">
              <h2 className="font-montserrat font-[900] text-[#0A1F33] text-[12px] uppercase tracking-widest border-l-4 border-[#00BFFF] pl-3">2. Margen de Inversión Objetivo (USD)</h2>
              <div className="font-montserrat font-[900] text-base text-[#0A1F33]">
                ${formData.presupuestoMin.toLocaleString()} — ${formData.presupuestoMax.toLocaleString()}
              </div>
            </div>
            <div className="space-y-6 px-2">
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase"><span>Mínimo</span><span>${formData.presupuestoMin.toLocaleString()}</span></div>
                <input type="range" name="presupuestoMin" min="5000" max="150000" step="1000" value={formData.presupuestoMin} onChange={handleRangeChange} className="w-full h-1 bg-slate-100 appearance-none cursor-pointer accent-[#0A1F33]" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase"><span>Máximo</span><span>${formData.presupuestoMax.toLocaleString()}</span></div>
                <input type="range" name="presupuestoMax" min="5000" max="150000" step="1000" value={formData.presupuestoMax} onChange={handleRangeChange} className="w-full h-1 bg-slate-100 appearance-none cursor-pointer accent-[#00BFFF]" />
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-montserrat font-[900] text-[#0A1F33] text-[12px] uppercase tracking-widest border-l-4 border-[#00BFFF] pl-3">3. Atributos Críticos (Máx 3)</h2>
                <span className="text-[10px] font-black text-[#00BFFF]">{formData.atributos.length}/3</span>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {['Seguridad', 'Dimensiones', 'Rendimiento', 'Precio', 'Tecnología'].map(at => {
                  const sel = formData.atributos.includes(at);
                  const dis = !sel && formData.atributos.length >= 3;
                  return (
                    <button key={at} onClick={() => toggleAtributo(at)} disabled={dis} className={`px-5 py-2.5 text-[11px] font-black uppercase tracking-widest border transition-all ${sel ? 'bg-[#0A1F33] text-white border-[#0A1F33]' : 'bg-transparent text-[#3A3A3C] border-[#3A3A3C]/20'} ${dis ? 'opacity-25 cursor-not-allowed' : 'hover:border-[#0A1F33] hover:bg-slate-50'}`}>
                      {at}
                    </button>
                  );
                })}
              </div>
            </div>
            
            <div>
              <h2 className="font-montserrat font-[900] text-[#0A1F33] text-[12px] uppercase tracking-widest mb-6 border-l-4 border-[#00BFFF] pl-3">4. Filtros Estratégicos</h2>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { label: 'Incluir Todos', key: 'todos' },
                  { label: 'Solo Chinos', key: 'soloChinos' },
                  { label: 'Solo EV (Eléctrico)', key: 'soloEV' },
                  { label: 'Solo HEV (Híbrido)', key: 'soloHEV' },
                  { label: 'Japonesas', key: 'soloJaponeses' },
                  { label: 'Coreanas', key: 'soloCoreanos' }
                ].map(f => (
                  <button key={f.key} onClick={() => handleFilterToggle(f.key as any)} className={`flex justify-between items-center px-4 py-2.5 border text-[10px] font-black uppercase tracking-tighter transition-all ${formData.filtros[f.key as keyof typeof formData.filtros] ? 'border-[#00BFFF] text-[#00BFFF] bg-[#00BFFF]/5' : 'border-slate-100 text-slate-400 opacity-70'}`}>
                    {f.label}
                    <div className={`w-2 h-2 ${formData.filtros[f.key as keyof typeof formData.filtros] ? 'bg-[#00BFFF]' : 'bg-slate-200'}`}></div>
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-montserrat font-[900] text-[#0A1F33] text-[12px] uppercase tracking-widest mb-5">Notas Adicionales / Requerimientos</h2>
            <textarea name="notasAdicionales" value={formData.notasAdicionales} onChange={handleInputChange} placeholder="Escribe detalles específicos (ej. 'Espacio para 3 sillas de niños', 'Uso 80% ciudad Paraguaya')..." className="w-full p-4 border border-[#3A3A3C]/15 outline-none focus:border-[#0A1F33] text-sm min-h-[100px] bg-slate-50/30" />
          </section>

          <div className="mt-16 pt-8 border-t border-slate-100 text-right">
            <button 
              disabled={!isStep1Valid}
              onClick={handleExecuteAnalysis} 
              className="bg-[#0A1F33] text-white px-16 py-5 font-montserrat font-[900] text-xs uppercase tracking-[3px] transition-all hover:bg-[#00BFFF] hover:text-[#0A1F33] disabled:bg-slate-100 disabled:text-slate-300 w-full md:w-auto"
            >
              Execute Analysis →
            </button>
          </div>
        </div>
      )}

      {/* PASO 2: EL DOSSIER VISUAL (LAYOUT GRILLA) */}
      {step === 2 && (
        <div className="animate-in fade-in zoom-in-95 duration-700">
          
          {/* HEADER DEL DOSSIER (Simulando captura) */}
          <div className="flex justify-between items-start mb-10 pb-6 border-b border-[#3A3A3C]/10">
              <div>
                <h2 className="font-montserrat font-[900] text-[#0A1F33] text-3xl uppercase tracking-[2px]">Dossier de Inversión</h2>
                <p className="text-[#3A3A3C]/70 text-sm font-semibold uppercase tracking-widest mt-1.5">Aquí están tus mejores opciones. Encontramos {top10.length} activos que coinciden con tu búsqueda.</p>
              </div>
              <button onClick={() => setStep(1)} className="text-[11px] font-black uppercase tracking-widest text-[#00BFFF] hover:underline flex items-center gap-1.5">
                ← Volver a editar perfil
              </button>
          </div>
          
          {/* GRILLA DE TARJETAS (Layout idéntico a captura: 5 columnas en md/lg) */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {top10.map((auto) => (
              <div key={auto.id} className="bg-white p-4.5 border border-[#3A3A3C]/10 shadow-sm flex flex-col gap-4 font-inter group hover:border-[#00BFFF] transition-all duration-300">
                
                {/* 1. Imagen o Placeholder */}
                <div className="bg-slate-100 h-28 w-full flex items-center justify-center text-[10px] text-slate-400 font-bold uppercase tracking-widest relative overflow-hidden">
                  {auto.url_imagen ? (
                      <img src={auto.url_imagen} alt={`${auto.marca} ${auto.modelo}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                      'Sin imagen'
                  )}
                  {/* Badge de puesto */}
                  <div className="absolute top-0 left-0 bg-[#0A1F33] text-white text-[10px] font-montserrat font-black px-2.5 py-1">#{auto.puesto}</div>
                </div>

                {/* 2. Marca y Modelo (Bold) + Versión */}
                <div>
                  <h4 className="font-montserrat font-black text-[13px] leading-tight text-[#0A1F33] uppercase">
                    {auto.marca} <span className="font-medium text-[#3A3A3C]">{auto.modelo}</span>
                  </h4>
                  <p className="text-[10px] text-slate-500 uppercase font-medium mt-0.5 tracking-tight">{auto.version || 'Única'} <span className="text-slate-300">| {auto.origen}</span></p>
                </div>

                {/* 3. Precio y Rango */}
                <div className="space-y-1 mt-auto">
                  <p className="text-[10px] text-slate-500 font-medium">desde</p>
                  <p className="font-montserrat font-black text-[15px] text-[#0A1F33]">
                    ${auto.precio_usd.toLocaleString()}
                  </p>
                </div>

                {/* 4. Tags / Badges (Identidad Visual) */}
                <div className="flex flex-wrap gap-1.5 text-[9px] font-black uppercase tracking-tight pt-3 border-t border-slate-100">
                  
                  {/* Badge Versiones (Asumimos 1 versión por registro) */}
                  <span className="bg-slate-100 text-[#3A3A3C] px-2 py-0.5 rounded-sm">1 versión</span>
                  
                  {/* Badge Match (Calculado por Gemini) */}
                  <span className="bg-[#00BFFF]/10 text-[#00BFFF] px-2 py-0.5 rounded-sm flex items-center gap-1">
                    <div className="w-1 h-1 bg-[#00BFFF]"></div>
                    Match {auto.match_percent}%
                  </span>
                  
                  {/* Badge Presupuesto (Verde/Rojo) */}
                  {auto.precio_usd <= formData.presupuestoMax ? (
                       <span className="bg-[#e6fcf5] text-[#0ca678] px-2 py-0.5 rounded-sm w-full text-center">USD ${auto.precio_usd.toLocaleString()} dentro del presupuesto</span>
                  ) : (
                      <span className="bg-[#fff5f5] text-[#ff6b6b] px-2 py-0.5 rounded-sm w-full text-center">USD ${auto.precio_usd.toLocaleString()} excede por ${(auto.precio_usd - formData.presupuestoMax).toLocaleString()}</span>
                  )}
                  
                  {/* Badge Etiqueta Principal (Derivado por Gemini) */}
                  <span className="bg-[#0A1F33]/5 text-[#0A1F33] px-2 py-0.5 rounded-sm border border-[#0A1F33]/10">{auto.etiqueta_principal}</span>
                </div>
              </div>
            ))}
          </div>

          {/* BUSCADOR INFERIOR (Idéntico a captura) */}
          <div className="mt-12 p-10 bg-white border border-[#3A3A3C]/10 shadow-sm font-montserrat">
              <h3 className="text-[#0A1F33] text-sm font-black uppercase tracking-[1px] mb-3">¿No ves el auto que buscás?</h3>
              <p className="text-[#3A3A3C]/70 text-xs font-semibold mb-6">Explora nuestro catálogo completo de 436 activos automotrices. Usa los filtros para encontrar el activo ideal.</p>
              
              <div className="relative max-w-2xl">
                  <input 
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar por Marca, Modelo o Versión en todo el catálogo..."
                    className="w-full p-4.5 pr-16 border border-[#3A3A3C]/15 outline-none focus:border-[#00BFFF] text-xs font-semibold bg-slate-50/50"
                  />
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 text-[#00BFFF] flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-widest">Buscar</span>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  </div>
              </div>
              
              {searchTerm && (
                  <div className="mt-6 text-xs italic text-slate-400 p-4 border border-slate-100 bg-slate-50 opacity-80 animate-in fade-in">
                      Nota de Arquitecto: El buscador clientside está visualmente implementado. Para que funcione, necesitamos crear una Server Action nueva en `app/actions.ts` que haga `select * from catalogoMatriz where marca ilike '%${searchTerm}%'`. Por ahora, previsualizamos el layout.
                  </div>
              )}
          </div>

        </div>
      )}
    </div>
  );
}
