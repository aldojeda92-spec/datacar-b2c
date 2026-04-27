'use client';

import { useState } from 'react';
import { saveLeadAction } from '@/app/actions';

export default function WizardContainer() {
  const [step, setStep] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [top10, setTop10] = useState<any[]>([]);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    nombre: '', celular: '', email: '',
    presupuestoMin: 20000, presupuestoMax: 50000,
    atributos: [] as string[], tipos: [] as string[],
    notasAdicionales: '', filtros: { todos: true, soloChinos: false, soloJaponeses: false, soloCoreanos: false, soloEV: false, soloHEV: false, soloCombustion: false }
  });

  const handleExecuteAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const result = await saveLeadAction(formData);
      if (result.success) {
        const response = await fetch('/api/analyze', {
          method: 'POST',
          body: JSON.stringify({ leadId: result.leadId }),
        });
        const data = await response.json();
        if (data.success && data.top10) {
          setTop10(data.top10);
          setStep(2);
        } else {
          alert(data.error || "No se encontraron vehículos.");
        }
      }
    } catch (e) {
      alert("Error crítico de conexión.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (isAnalyzing) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <div className="w-12 h-12 border-4 border-[#00BFFF] border-t-transparent rounded-full animate-spin mb-6"></div>
      <h2 className="font-montserrat font-black text-xl uppercase tracking-[4px]">Analizando Matriz...</h2>
    </div>
  );

  return (
    <div className={`min-h-screen font-inter ${step === 2 ? 'bg-slate-50' : 'bg-white'}`}>
      
      {/* BRANDING */}
      <div className="max-w-[1600px] mx-auto p-8 flex justify-between items-center">
        <h1 className="text-3xl font-montserrat font-black text-[#0A1F33]">DATA<span className="text-[#00BFFF]">CAR</span></h1>
        {step === 2 && <button onClick={() => setStep(1)} className="text-[10px] font-black uppercase border-b-2 border-[#00BFFF]">Nueva Consulta</button>}
      </div>

      {step === 1 && (
        <div className="max-w-4xl mx-auto p-10 space-y-12 animate-in fade-in">
           <div className="bg-white p-10 border shadow-sm space-y-10">
              <section className="space-y-4">
                <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400">01. Datos</h2>
                <div className="grid grid-cols-2 gap-4">
                  <input placeholder="Nombre *" className="p-4 border bg-slate-50 outline-none focus:border-[#00BFFF]" onChange={e => setFormData({...formData, nombre: e.target.value})} />
                  <input placeholder="Celular *" className="p-4 border bg-slate-50 outline-none focus:border-[#00BFFF]" onChange={e => setFormData({...formData, celular: e.target.value})} />
                </div>
              </section>
              
              <section className="space-y-4">
                <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400">02. Presupuesto: ${formData.presupuestoMin.toLocaleString()} - ${formData.presupuestoMax.toLocaleString()}</h2>
                <input type="range" min="10000" max="150000" step="1000" value={formData.presupuestoMax} className="w-full h-1 accent-[#00BFFF]" onChange={e => setFormData({...formData, presupuestoMax: Number(e.target.value)})} />
              </section>

              <section className="space-y-4">
                <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400">03. Tipo de Auto</h2>
                <div className="flex flex-wrap gap-2">
                  {['SUV', 'Pickup', 'Sedán', 'Hatchback'].map(t => (
                    <button key={t} onClick={() => setFormData(p => ({...p, tipos: p.tipos.includes(t) ? p.tipos.filter(x=>x!==t) : [...p.tipos, t]}))} className={`px-6 py-2 text-[10px] font-black border ${formData.tipos.includes(t) ? 'bg-[#0A1F33] text-white' : 'text-slate-400'}`}>{t}</button>
                  ))}
                </div>
              </section>

              <button onClick={handleExecuteAnalysis} className="w-full py-5 bg-[#0A1F33] text-white font-black uppercase tracking-widest hover:bg-[#00BFFF] transition-all">Generar Análisis →</button>
           </div>
        </div>
      )}

      {step === 2 && (
        <div className="max-w-[1600px] mx-auto p-8 animate-in fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5 gap-8">
            {top10.length > 0 ? top10.map((auto) => {
              const isExpanded = expandedId === auto.id;
              return (
                <div key={auto.id} className="bg-white border border-slate-100 flex flex-col group hover:shadow-2xl transition-all">
                  <div className="h-48 bg-slate-100 relative overflow-hidden">
                    {auto.urlImagen ? <img src={auto.urlImagen} className="w-full h-full object-cover" /> : <div className="flex h-full items-center justify-center text-[10px] text-slate-300">Sin Imagen</div>}
                    <div className="absolute top-0 left-0 bg-[#0A1F33] text-white text-[10px] font-black px-4 py-2">TOP {auto.puesto}</div>
                  </div>
                  
                  {/* AQUÍ ESTÁ EL AIRE (p-8) */}
                  <div className="p-8 flex-1 flex flex-col gap-6">
                    <div>
                      <h3 className="font-montserrat font-black text-sm uppercase text-[#0A1F33] leading-tight">{auto.marca} {auto.modelo}</h3>
                      <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase">{auto.version} | {auto.origen}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 py-4 border-y border-slate-50">
                      <div><p className="text-[8px] font-black text-slate-300 uppercase">Match</p><p className="font-black text-[#00BFFF]">{auto.match_percent}%</p></div>
                      <div className="text-right"><p className="text-[8px] font-black text-slate-300 uppercase">Precio</p><p className="font-black text-[#0A1F33]">${auto.precioUsd?.toLocaleString()}</p></div>
                    </div>

                    <button onClick={() => setExpandedId(isExpanded ? null : auto.id)} className="text-[9px] font-black text-[#00BFFF] text-left hover:tracking-widest transition-all">
                      {isExpanded ? '– OCULTAR INFO' : '+ EQUIPAMIENTO'}
                    </button>

                    {isExpanded && (
                      <div className="animate-in slide-in-from-top-2 text-[10px] space-y-4">
                        <div className="space-y-1">
                          <p className="font-black uppercase text-[8px] text-slate-300">Motorización</p>
                          <p className="font-medium">{auto.motor}</p>
                        </div>
                        <div className="pt-2 border-t border-slate-50">
                          <p className="font-black uppercase text-[8px] text-[#0A1F33] mb-2">Versiones Disponibles</p>
                          {auto.versiones?.map((v:any) => (
                            <div key={v.id} className="flex justify-between py-1 border-b border-slate-50 text-[9px]">
                              <span>{v.version}</span>
                              <span className="font-bold">${v.precioUsd.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-auto pt-4">
                      <a href={`https://wa.me/595981123456?text=Me interesa el ${auto.marca} ${auto.modelo}`} target="_blank" className="block w-full py-4 bg-[#0A1F33] text-white text-center font-black text-[10px] uppercase tracking-widest hover:bg-[#00BFFF] transition-all">
                        Quiero Comprar
                      </a>
                    </div>
                  </div>
                </div>
              )
            }) : (
              <div className="col-span-full py-20 text-center text-slate-400 font-bold uppercase tracking-widest">No se encontraron resultados para tu búsqueda.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
