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
  origenMarca: string;
  combustible: string;
  urlImagen?: string;
  motor?: string;
  traccion?: string;
  concesionaria?: string;
  versiones: any[];
}

export default function WizardContainer() {
  const [step, setStep] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [top10, setTop10] = useState<IAAuto[]>([]);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ESTADO DEL FORMULARIO - UNIFICADO A "notas"
  const [formData, setFormData] = useState({
    nombre: '',
    celular: '',
    email: '',
    presupuestoMin: 15000,
    presupuestoMax: 45000,
    atributos: [] as string[],
    motorizacion: 'Todos',
    tipoVehiculo: 'SUV',
    origen: 'Todos',
    concesionaria: 'Todas',
    notas: '' // <-- Siempre usar 'notas'
  });

  const isReady = formData.nombre && formData.celular && formData.atributos.length === 3;

  const toggleAtributo = (at: string) => {
    setFormData(prev => {
      if (prev.atributos.includes(at)) return { ...prev, atributos: prev.atributos.filter(x => x !== at) };
      if (prev.atributos.length < 3) return { ...prev, atributos: [...prev.atributos, at] };
      return prev;
    });
  };

  const handleExecute = async () => {
    setIsAnalyzing(true);
    try {
      // Enviamos el formData tal cual, ya que usa 'notas'
      const result = await saveLeadAction(formData);
      if (result.success) {
        const res = await fetch('/api/analyze', { 
          method: 'POST', 
          body: JSON.stringify({ leadId: result.leadId }),
          headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        if (data.success) { 
          setTop10(data.top10); 
          setStep(2); 
          window.scrollTo(0, 0);
        }
      }
    } catch (e) {
      alert("Error en la conexión");
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (isAnalyzing) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <div className="w-12 h-12 border-4 border-[#0A1F33] border-t-[#00BFFF] rounded-full animate-spin mb-6"></div>
      <p className="font-montserrat font-black text-xs uppercase tracking-[6px] text-[#0A1F33]">Generando Dossier Estratégico...</p>
    </div>
  );

  return (
    <div className={`min-h-screen font-inter ${step === 2 ? 'bg-[#F8FAFC]' : 'bg-white'}`}>
      
      {/* HEADER */}
      <div className="max-w-[1600px] mx-auto p-10 flex justify-between items-center">
        <h1 className="text-3xl font-montserrat font-black text-[#0A1F33] uppercase">DATA<span className="text-[#00BFFF]">CAR</span></h1>
        {step === 2 && (
          <button onClick={() => setStep(1)} className="text-[10px] font-black uppercase border-b-2 border-[#00BFFF] pb-1">← Re-ajustar Búsqueda</button>
        )}
      </div>

      {/* PASO 1: FORMULARIO DE CONSULTORÍA */}
      {step === 1 && (
        <div className="max-w-4xl mx-auto p-12 animate-in fade-in duration-700">
          <div className="bg-white border border-slate-100 p-12 shadow-2xl space-y-12">
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400">Nombre y Apellido *</label>
                <input value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} className="w-full p-3 border-b-2 bg-slate-50 outline-none focus:border-[#0A1F33] text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400">WhatsApp *</label>
                <input value={formData.celular} onChange={e => setFormData({...formData, celular: e.target.value})} className="w-full p-3 border-b-2 bg-slate-50 outline-none focus:border-[#0A1F33] text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400">Email</label>
                <input value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full p-3 border-b-2 bg-slate-50 outline-none focus:border-[#0A1F33] text-sm" />
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <label className="text-[9px] font-black uppercase text-slate-400">Inversión (USD)</label>
                <div className="flex gap-4 font-black text-[#0A1F33] text-sm">
                  <span>${formData.presupuestoMin.toLocaleString()}</span> — <span>${formData.presupuestoMax.toLocaleString()}</span>
                </div>
              </div>
              <input type="range" min="5000" max="150000" step="1000" value={formData.presupuestoMax} onChange={e => setFormData({...formData, presupuestoMax: Number(e.target.value)})} className="w-full h-1 accent-[#00BFFF]" />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between text-[9px] font-black uppercase">
                <label className="text-slate-400">Atributos Críticos (Seleccionar 3) *</label>
                <span className={formData.atributos.length === 3 ? 'text-[#00BFFF]' : 'text-red-400'}>{formData.atributos.length}/3</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {['Seguridad', 'Tecnología', 'Espacio', 'Precio', 'Eficiencia'].map(at => (
                  <button key={at} onClick={() => toggleAtributo(at)} className={`px-6 py-2 text-[10px] font-black border-2 transition-all ${formData.atributos.includes(at) ? 'bg-[#0A1F33] text-white border-[#0A1F33]' : 'text-slate-300'}`}>{at}</button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase text-slate-400">Motorización</label>
                <select value={formData.motorizacion} onChange={e => setFormData({...formData, motorizacion: e.target.value})} className="w-full p-3 bg-slate-50 border-b-2 text-sm outline-none">
                  {['Todos', 'PHEV', 'HEV', 'EV', 'Diesel', 'Flex', 'Nafta'].map(x => <option key={x} value={x}>{x}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase text-slate-400">Tipo de Vehículo</label>
                <select value={formData.tipoVehiculo} onChange={e => setFormData({...formData, tipoVehiculo: e.target.value})} className="w-full p-3 bg-slate-50 border-b-2 text-sm outline-none">
                  {['SUV', 'Sedan', 'Hatchback', 'Pickup'].map(x => <option key={x} value={x}>{x}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase text-slate-400">Origen Preferente</label>
                <select value={formData.origen} onChange={e => setFormData({...formData, origen: e.target.value})} className="w-full p-3 bg-slate-50 border-b-2 text-sm outline-none">
                  {['Todos', 'Solo Coreanos', 'Solo Japoneses', 'Solo Europeos', 'Solo Chinos'].map(x => <option key={x} value={x}>{x}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase text-slate-400">Concesionaria</label>
                <select value={formData.concesionaria} onChange={e => setFormData({...formData, concesionaria: e.target.value})} className="w-full p-3 bg-slate-50 border-b-2 text-sm outline-none">
                  {['Todas', 'Garden', 'Automotor', 'Santa Rosa', 'Chacomer', 'Toyotoshi', 'Condor', 'Gorostiaga'].map(x => <option key={x} value={x}>{x}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase text-slate-400">Notas Adicionales</label>
              <textarea value={formData.notas} onChange={e => setFormData({...formData, notas: e.target.value})} placeholder="Ej. Busco colores sobrios y buena garantía..." className="w-full p-4 bg-slate-50 border-b-2 text-sm min-h-[100px] outline-none" />
            </div>

            <button disabled={!isReady} onClick={handleExecute} className="w-full py-6 bg-[#0A1F33] text-white font-montserrat font-black text-xs uppercase tracking-[4px] hover:bg-[#00BFFF] transition-all disabled:opacity-20 shadow-xl">Generar Análisis Estratégico →</button>
          </div>
        </div>
      )}

      {/* PASO 2: DOSSIER PULIDO (CON AIRE) */}
      {step === 2 && (
        <div className="max-w-[1700px] mx-auto p-10 pb-40 animate-in fade-in zoom-in-95 duration-1000">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-10">
            {top10.map((auto, idx) => {
              const isComp = compareIds.includes(auto.id);
              const isExp = expandedId === auto.id;

              return (
                <div key={auto.id} className={`bg-white border flex flex-col transition-all duration-500 relative ${isComp ? 'border-[#00BFFF] ring-4 ring-[#00BFFF]/10 shadow-2xl' : 'border-slate-100 shadow-sm hover:shadow-xl'}`}>
                  
                  <div className="absolute -top-3 -left-3 w-10 h-10 bg-[#0A1F33] text-white flex items-center justify-center font-montserrat font-black text-base z-10">{idx + 1}</div>

                  <div className="relative h-60 bg-slate-50 overflow-hidden">
                    {auto.urlImagen ? (
                      <img src={auto.urlImagen} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    ) : (
                      <div className="h-full flex items-center justify-center text-[9px] font-black text-slate-300 uppercase">Visual no disponible</div>
                    )}
                    <button onClick={() => toggleCompare(auto.id)} className={`absolute top-4 right-4 px-3 py-1.5 text-[8px] font-black border transition-all ${isComp ? 'bg-[#00BFFF] text-white border-[#00BFFF]' : 'bg-white/90 text-slate-400 border-slate-200'}`}>
                      {isComp ? '✓ SELECCIONADO' : '+ COMPARAR'}
                    </button>
                  </div>

                  {/* CONTENIDO CON AIRE (P-10) */}
                  <div className="p-10 flex-1 flex flex-col gap-8">
                    <div className="space-y-3">
                      <h4 className="font-montserrat font-black text-lg text-[#0A1F33] uppercase leading-tight">
                        {auto.marca} <br /> <span className="font-light text-slate-400">{auto.modelo}</span>
                      </h4>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 border px-3 py-1.5 inline-block">{auto.version} | {auto.origenMarca}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 py-6 border-y border-slate-50">
                      <div><p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Match</p><p className="font-black text-xl text-[#00BFFF]">{auto.match_percent}%</p></div>
                      <div className="text-right"><p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Inversión</p><p className="font-black text-xl text-[#0A1F33]">${auto.precioUsd?.toLocaleString()}</p></div>
                    </div>

                    <button onClick={() => setExpandedId(isExp ? null : auto.id)} className="text-[9px] font-black text-[#00BFFF] text-left hover:tracking-widest transition-all">
                      {isExp ? '– OCULTAR INFO' : '+ EQUIPAMIENTO Y VERSIONES'}
                    </button>

                    {isExp && (
                      <div className="animate-in slide-in-from-top-2 duration-300 space-y-4 pt-2">
                        <div className="text-[10px] space-y-2 text-slate-500 font-medium">
                          <p className="flex justify-between border-b pb-1"><span>Motor:</span> <span className="text-[#0A1F33] font-bold">{auto.motor}</span></p>
                          <p className="flex justify-between border-b pb-1"><span>Tracción:</span> <span className="text-[#0A1F33] font-bold">{auto.traccion}</span></p>
                        </div>
                        <div className="pt-2">
                          <p className="text-[9px] font-black text-[#0A1F33] uppercase border-b pb-1 mb-2">Versiones:</p>
                          {auto.versiones?.map((v: any) => (
                            <div key={v.id} className="flex justify-between py-1.5 text-[10px] border-b border-slate-50">
                              <span className="text-slate-400">{v.version}</span>
                              <span className="font-black text-[#0A1F33]">${v.precioUsd.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-auto">
                      <a 
                        href={`https://wa.me/595981123456?text=Me interesa el ${auto.marca} ${auto.modelo} que vi en DATACAR.`} 
                        target="_blank" 
                        className="block w-full py-5 bg-[#0A1F33] text-white text-center font-black text-[10px] uppercase tracking-[3px] hover:bg-[#00BFFF] transition-all shadow-lg active:scale-95"
                      >
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
            <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-50 bg-[#0A1F33] text-white p-8 shadow-2xl flex items-center gap-16 border-t-4 border-[#00BFFF] animate-in slide-in-from-bottom-10 rounded-sm">
               <div><p className="text-[9px] font-black text-[#00BFFF] uppercase tracking-[4px]">Comparador</p><p className="text-sm font-bold uppercase">{compareIds.length} <span className="text-slate-500 font-light">de 3 seleccionados</span></p></div>
               <div className="flex gap-4">
                  {compareIds.length === 3 ? <button className="bg-[#00BFFF] text-[#0A1F33] px-10 py-4 font-black text-[11px] uppercase tracking-[2px] hover:bg-white">Comparar Ahora</button> : <p className="text-[10px] text-slate-500 italic">Selecciona {3 - compareIds.length} más...</p>}
                  <button onClick={() => setCompareIds([])} className="text-white/30 hover:text-white transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
               </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
