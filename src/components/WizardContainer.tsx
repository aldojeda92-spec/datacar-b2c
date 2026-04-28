'use client';

import { useState } from 'react';
import { saveLeadAction } from '@/app/actions';

interface IAAuto {
  id: string;
  puesto: number;
  match_percent: number;
  marca: string;
  modelo: string;
  version: string;
  precioUsd: number;
  origen: string;
  urlImagen?: string;
  motor?: string;
  traccion?: string;
  combustible?: string;
  concesionaria?: string;
  versiones: any[];
}

export default function WizardContainer() {
  const [step, setStep] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [top10, setTop10] = useState<IAAuto[]>([]);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ESTADO DEL FORMULARIO SEGÚN TUS REQUERIMIENTOS
  const [formData, setFormData] = useState({
    nombre: '',
    celular: '',
    email: '',
    presupuestoMin: 15000,
    presupuestoMax: 50000,
    atributos: [] as string[],
    motorizacion: 'Todos',
    tipoVehiculo: 'SUV',
    origen: 'Todos',
    concesionaria: 'Todas',
    notas: ''
  });

  // Validaciones de Step 1
  const isReadyToAnalyze = 
    formData.nombre.trim() !== '' && 
    formData.celular.trim() !== '' && 
    formData.atributos.length === 3;

  const toggleAtributo = (at: string) => {
    setFormData(prev => {
      if (prev.atributos.includes(at)) return { ...prev, atributos: prev.atributos.filter(x => x !== at) };
      if (prev.atributos.length < 3) return { ...prev, atributos: [...prev.atributos, at] };
      return prev;
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
        const data = await response.json();
        if (data.success) {
          setTop10(data.top10);
          setStep(2);
        } else {
          alert(data.error || "No se encontraron resultados.");
        }
      }
    } catch (e) {
      alert("Error de comunicación con el servidor.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleCompare = (id: string) => {
    setCompareIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : prev.length < 3 ? [...prev, id] : prev
    );
  };

  if (isAnalyzing) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white space-y-6">
      <div className="w-12 h-12 border-4 border-[#0A1F33] border-t-[#00BFFF] rounded-full animate-spin"></div>
      <h2 className="font-montserrat font-black text-xl uppercase tracking-[10px] text-[#0A1F33]">DATACAR ENGINE</h2>
      <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest animate-pulse">Cruzando Datos de la Matriz...</p>
    </div>
  );

  return (
    <div className={`min-h-screen font-inter ${step === 2 ? 'bg-[#F4F7F9]' : 'bg-white'}`}>
      
      {/* HEADER CORPORATIVO */}
      <div className="max-w-[1600px] mx-auto p-10 flex justify-between items-center select-none">
        <h1 className="text-4xl font-montserrat font-black text-[#0A1F33] uppercase tracking-tighter">
          DATA<span className="font-light text-slate-300">CAR</span>
        </h1>
        {step === 2 && (
          <button onClick={() => setStep(1)} className="text-[10px] font-black uppercase border-b-2 border-[#00BFFF] pb-1 tracking-widest">
            ← Nueva Búsqueda
          </button>
        )}
      </div>

      {/* STEP 1: CONFIGURADOR DE PRECISIÓN */}
      {step === 1 && (
        <div className="max-w-4xl mx-auto p-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="bg-white border border-slate-100 p-12 shadow-2xl space-y-16">
            
            {/* 01. IDENTIFICACIÓN */}
            <section className="space-y-8">
              <div className="flex items-center gap-4">
                <span className="bg-[#0A1F33] text-white w-8 h-8 flex items-center justify-center font-black text-xs">01</span>
                <h2 className="font-montserrat font-black text-xs uppercase tracking-widest text-[#0A1F33]">Identificación del Inversor</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Nombre y Apellido *</label>
                  <input value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} className="w-full p-4 border-b-2 bg-slate-50/30 outline-none focus:border-[#0A1F33] text-sm transition-all" placeholder="Obligatorio" />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-slate-400 ml-1">WhatsApp / Celular *</label>
                  <input value={formData.celular} onChange={e => setFormData({...formData, celular: e.target.value})} className="w-full p-4 border-b-2 bg-slate-50/30 outline-none focus:border-[#0A1F33] text-sm transition-all" placeholder="Obligatorio" />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Email (Opcional)</label>
                  <input value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full p-4 border-b-2 bg-slate-50/30 outline-none focus:border-[#0A1F33] text-sm transition-all" placeholder="correo@ejemplo.com" />
                </div>
              </div>
            </section>

            {/* 02. PRESUPUESTO VINCULADO */}
            <section className="space-y-8">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <span className="bg-[#0A1F33] text-white w-8 h-8 flex items-center justify-center font-black text-xs">02</span>
                  <h2 className="font-montserrat font-black text-xs uppercase tracking-widest text-[#0A1F33]">Rango de Inversión (USD)</h2>
                </div>
                <div className="flex gap-4">
                  <input type="number" value={formData.presupuestoMin} onChange={e => setFormData({...formData, presupuestoMin: Number(e.target.value)})} className="w-24 p-2 bg-slate-50 border-b-2 text-center text-sm font-black text-[#0A1F33]" />
                  <input type="number" value={formData.presupuestoMax} onChange={e => setFormData({...formData, presupuestoMax: Number(e.target.value)})} className="w-24 p-2 bg-slate-50 border-b-2 text-center text-sm font-black text-[#0A1F33]" />
                </div>
              </div>
              <div className="space-y-6">
                <input type="range" min="5000" max="200000" step="1000" value={formData.presupuestoMin} onChange={e => setFormData({...formData, presupuestoMin: Number(e.target.value)})} className="w-full h-1 accent-[#0A1F33]" />
                <input type="range" min="5000" max="200000" step="1000" value={formData.presupuestoMax} onChange={e => setFormData({...formData, presupuestoMax: Number(e.target.value)})} className="w-full h-1 accent-[#00BFFF]" />
              </div>
            </section>

            {/* 03. ATRIBUTOS (LIMITADO A 3) */}
            <section className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="font-montserrat font-black text-xs uppercase tracking-widest text-[#0A1F33]">03. Atributos del Vehículo (Seleccionar 3)</h2>
                <span className="text-[10px] font-black text-[#00BFFF]">{formData.atributos.length}/3</span>
              </div>
              <div className="flex flex-wrap gap-3">
                {['Seguridad', 'Tecnología', 'Espacio', 'Precio', 'Eficiencia'].map(at => (
                  <button key={at} onClick={() => toggleAtributo(at)} className={`px-8 py-3 text-[10px] font-black uppercase border-2 transition-all ${formData.atributos.includes(at) ? 'bg-[#0A1F33] border-[#0A1F33] text-white shadow-lg' : 'text-slate-300 border-slate-50 hover:border-slate-200'}`}>
                    {at}
                  </button>
                ))}
              </div>
            </section>

            {/* 04. SELECTORES TÉCNICOS */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase text-slate-400">Tipo de Motorización</label>
                <select value={formData.motorizacion} onChange={e => setFormData({...formData, motorizacion: e.target.value})} className="w-full p-4 bg-slate-50 border-b-2 text-sm font-medium outline-none">
                  {['Todos', 'PHEV', 'HEV', 'EV', 'Diesel', 'Flex', 'Nafta'].map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase text-slate-400">Tipo de Vehículo</label>
                <select value={formData.tipoVehiculo} onChange={e => setFormData({...formData, tipoVehiculo: e.target.value})} className="w-full p-4 bg-slate-50 border-b-2 text-sm font-medium outline-none">
                  {['SUV', 'Sedan', 'Hatchback', 'Pickup'].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase text-slate-400">Origen Preferencial</label>
                <select value={formData.origen} onChange={e => setFormData({...formData, origen: e.target.value})} className="w-full p-4 bg-slate-50 border-b-2 text-sm font-medium outline-none">
                  {['Todos', 'Solo Coreanos', 'Solo Japoneses', 'Solo Europeos', 'Solo Chinos'].map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase text-slate-400">Preferencia Concesionaria</label>
                <select value={formData.concesionaria} onChange={e => setFormData({...formData, concesionaria: e.target.value})} className="w-full p-4 bg-slate-50 border-b-2 text-sm font-medium outline-none">
                  {['Todas', 'Garden', 'Automotor', 'Santa Rosa', 'Chacomer', 'Toyotoshi', 'Condor', 'Gorostiaga'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </section>

            {/* 05. NOTAS */}
            <section className="space-y-4">
              <label className="text-[10px] font-black uppercase text-slate-400">Observaciones y Notas</label>
              <textarea value={formData.notas} onChange={e => setFormData({...formData, notas: e.target.value})} placeholder="Escriba aquí cualquier observación adicional para el informe..." className="w-full p-6 bg-slate-50 border-b-2 outline-none text-sm min-h-[150px] font-medium" />
            </section>

            <button disabled={!isReadyToAnalyze} onClick={handleExecuteAnalysis} className="w-full py-6 bg-[#0A1F33] text-white font-montserrat font-black text-xs uppercase tracking-[5px] hover:bg-[#00BFFF] hover:text-[#0A1F33] transition-all disabled:opacity-20 shadow-2xl">
              Generar Informe de Inversión →
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: DOSSIER CON AIRE (P-10) */}
      {step === 2 && (
        <div className="max-w-[1750px] mx-auto p-10 pb-40 animate-in fade-in duration-1000">
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-10">
            {top10.map((auto) => {
              const isComparing = compareIds.includes(auto.id);
              const isExpanded = expandedId === auto.id;

              return (
                <div key={auto.id} className={`bg-white border transition-all duration-500 relative flex flex-col ${isComparing ? 'border-[#00BFFF] ring-4 ring-[#00BFFF]/10 shadow-2xl' : 'border-slate-100 shadow-sm hover:shadow-xl'}`}>
                  
                  <div className="absolute -top-3 -left-3 w-10 h-10 bg-[#0A1F33] text-white flex items-center justify-center font-montserrat font-black text-base z-10">
                    {auto.puesto}
                  </div>

                  <div className="relative h-60 bg-slate-50 overflow-hidden">
                    {auto.urlImagen ? (
                      <img src={auto.urlImagen} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    ) : (
                      <div className="h-full flex items-center justify-center text-[9px] font-black uppercase text-slate-300">Imagen No Disponible</div>
                    )}
                    <button onClick={() => toggleCompare(auto.id)} className={`absolute top-4 right-4 px-3 py-1.5 text-[8px] font-black border transition-all ${isComparing ? 'bg-[#00BFFF] text-white border-[#00BFFF]' : 'bg-white/90 text-slate-400 border-slate-200'}`}>
                      {isComparing ? '✓ SELECCIONADO' : '+ COMPARAR'}
                    </button>
                  </div>

                  {/* CONTENIDO CON AIRE (P-10) */}
                  <div className="p-10 flex-1 flex flex-col gap-10">
                    <div className="space-y-3">
                      <h4 className="font-montserrat font-black text-xl text-[#0A1F33] uppercase leading-tight">
                        {auto.marca} <br /> <span className="font-light text-slate-400">{auto.modelo}</span>
                      </h4>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 border px-3 py-1.5 inline-block">
                        {auto.version} | {auto.origen}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 py-8 border-y border-slate-50">
                      <div><p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Match</p><p className="font-black text-xl text-[#00BFFF]">{auto.match_percent}%</p></div>
                      <div className="text-right"><p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Precio</p><p className="font-black text-xl text-[#0A1F33]">${auto.precioUsd?.toLocaleString()}</p></div>
                    </div>

                    <button onClick={() => setExpandedId(isExpanded ? null : auto.id)} className="text-[9px] font-black text-[#00BFFF] text-left hover:tracking-widest transition-all uppercase">
                      {isExpanded ? '– Ocultar Detalles' : '+ Datos Técnicos y Versiones'}
                    </button>

                    {isExpanded && (
                      <div className="animate-in slide-in-from-top-2 duration-300 space-y-6 pt-2">
                         <div className="text-[11px] space-y-3 text-slate-500 font-medium">
                            <p className="flex justify-between border-b pb-1"><span>Motor:</span> <span className="text-[#0A1F33] font-black">{auto.motor}</span></p>
                            <p className="flex justify-between border-b pb-1"><span>Tracción:</span> <span className="text-[#0A1F33] font-black">{auto.traccion}</span></p>
                         </div>
                         <div className="pt-2">
                            <p className="text-[9px] font-black text-[#0A1F33] uppercase border-b pb-2 mb-3 tracking-widest">Gama de Versiones:</p>
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
                      <a 
                        href={`https://wa.me/595981123456?text=Quiero información sobre el ${auto.marca} ${auto.modelo} del ranking Datacar.`} 
                        target="_blank" 
                        className="block w-full py-6 bg-[#0A1F33] text-white text-center font-black text-[11px] uppercase tracking-[4px] hover:bg-[#00BFFF] transition-all shadow-lg"
                      >
                        Quiero Comprar
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* DOCK COMPARADOR FLOTANTE */}
          {compareIds.length > 0 && (
            <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-50 bg-[#0A1F33] text-white p-8 shadow-2xl flex items-center gap-16 border-t-4 border-[#00BFFF] animate-in slide-in-from-bottom-10 rounded-sm">
               <div>
                  <p className="text-[9px] font-black text-[#00BFFF] uppercase tracking-[4px]">Comparador Activo</p>
                  <p className="text-sm font-bold uppercase tracking-tighter">{compareIds.length} <span className="text-slate-500 font-light">de 3 Seleccionados</span></p>
               </div>
               <div className="flex gap-4">
                  {compareIds.length === 3 ? (
                    <button className="bg-[#00BFFF] text-[#0A1F33] px-10 py-4 font-black text-[11px] uppercase tracking-[2px] hover:bg-white transition-all">Comparar Datos Duros</button>
                  ) : (
                    <p className="text-[10px] text-slate-500 italic tracking-widest font-medium">Faltan {3 - compareIds.length} más...</p>
                  )}
                  <button onClick={() => setCompareIds([])} className="text-white/30 hover:text-white transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
               </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
