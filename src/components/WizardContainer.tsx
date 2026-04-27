'use client';

import { useState } from 'react';
import { saveLeadAction } from '@/app/actions';

export default function WizardContainer() {
  const [step, setStep] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [top10, setTop10] = useState<any[]>([]);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Formulario (Mantenemos tu lógica previa)
  const [formData, setFormData] = useState({
    nombre: '', celular: '', email: '',
    presupuestoMin: 20000, presupuestoMax: 50000,
    atributos: [] as string[], tipos: [] as string[],
    notasAdicionales: '', filtros: { todos: true, soloChinos: false, soloJaponeses: false, soloCoreanos: false, soloEV: false, soloHEV: false, soloCombustion: false }
  });

  const toggleCompare = (id: string) => {
    setCompareIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : prev.length < 3 ? [...prev, id] : prev);
  };

  const handleExecuteAnalysis = async () => {
    setIsAnalyzing(true);
    const result = await saveLeadAction(formData);
    if (result.success) {
      const response = await fetch('/api/analyze', { method: 'POST', body: JSON.stringify({ leadId: result.leadId }) });
      const data = await response.json();
      if (data.success) { setTop10(data.top10); setStep(2); }
    }
    setIsAnalyzing(false);
  };

  if (isAnalyzing) return <div className="py-48 text-center animate-pulse font-montserrat font-black text-2xl">ESTABLECIENDO RANKING ESTRATÉGICO...</div>;

  return (
    <div className="max-w-[1600px] mx-auto p-8 font-inter">
      {step === 1 && (
        /* ... Tu Step 1 aquí (se mantiene igual) ... */
        <div className="max-w-4xl mx-auto p-10 border shadow-sm space-y-10">
            <h1 className="text-center font-black text-4xl mb-10 text-[#0A1F33]">DATACAR</h1>
            {/* Campos de Nombre, Presupuesto, etc. (Simplificado para el ejemplo) */}
            <input placeholder="Nombre" className="w-full p-4 border" onChange={(e) => setFormData({...formData, nombre: e.target.value})} />
            <input placeholder="WhatsApp" className="w-full p-4 border" onChange={(e) => setFormData({...formData, celular: e.target.value})} />
            <button onClick={handleExecuteAnalysis} className="w-full py-6 bg-[#0A1F33] text-white font-black">ANALIZAR MATRIZ →</button>
        </div>
      )}

      {step === 2 && (
        <div className="animate-in fade-in duration-700">
          <div className="flex justify-between items-center mb-12 border-b pb-6">
            <h2 className="font-montserrat font-black text-3xl text-[#0A1F33] uppercase">Dossier de Inversión</h2>
            <div className="text-[10px] font-bold text-slate-400">MODELO HÍBRIDO SQL + GEMINI FLASH</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-8">
            {top10.map((auto) => {
              const isComparing = compareIds.includes(auto.id);
              const isExpanded = expandedId === auto.id;

              return (
                <div key={auto.id} className={`bg-white border transition-all duration-300 flex flex-col ${isComparing ? 'border-[#00BFFF] ring-1 ring-[#00BFFF]' : 'border-slate-100 shadow-sm'}`}>
                  
                  {/* Imagen y Header */}
                  <div className="relative h-40 bg-slate-50 overflow-hidden">
                    <img src={auto.url_imagen} className="w-full h-full object-cover" />
                    <div className="absolute top-0 left-0 bg-[#0A1F33] text-white text-[10px] px-3 py-1 font-black">TOP {auto.puesto}</div>
                    <button onClick={() => toggleCompare(auto.id)} className={`absolute top-2 right-2 p-2 rounded-full border ${isComparing ? 'bg-[#00BFFF] border-[#00BFFF] text-white' : 'bg-white/80 border-slate-200 text-slate-400'}`}>
                      <span className="text-[9px] font-black">{isComparing ? '✓ COMPARANDO' : '+ COMPARAR'}</span>
                    </button>
                  </div>

                  <div className="p-6 flex-1 flex flex-col gap-4">
                    <div>
                      <h4 className="font-montserrat font-black text-sm text-[#0A1F33] uppercase">{auto.marca} {auto.modelo}</h4>
                      <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">{auto.version} | {auto.origen}</p>
                    </div>

                    <div className="flex justify-between items-center bg-slate-50 p-3">
                        <span className="text-[9px] font-black text-slate-400 uppercase">Desde</span>
                        <span className="font-montserrat font-black text-base text-[#0A1F33]">${auto.precio_usd.toLocaleString()}</span>
                    </div>

                    {/* Botón Equipamiento (+) */}
                    <button onClick={() => setExpandedId(isExpanded ? null : auto.id)} className="text-[10px] font-black text-[#00BFFF] flex justify-between border-b border-dashed border-[#00BFFF]/30 pb-1">
                       {isExpanded ? '– MENOS INFO' : '+ EQUIPAMIENTO Y VERSIONES'}
                    </button>

                    {isExpanded && (
                        <div className="animate-in slide-in-from-top-2 duration-300 text-[10px] space-y-3 pt-2">
                           <div className="grid grid-cols-2 gap-2 text-slate-500">
                              <p><b>Motor:</b> {auto.motor}</p>
                              <p><b>Tracción:</b> {auto.traccion}</p>
                              <p><b>Baulera:</b> {auto.bauleraLitros}L</p>
                              <p><b>Garantía:</b> {auto.garantia}</p>
                           </div>
                           <div className="pt-2">
                             <p className="font-black text-[#0A1F33] mb-1">OTRAS VERSIONES:</p>
                             {auto.versiones.map((v: any) => (
                               <div key={v.id} className="flex justify-between py-1 border-b border-slate-50">
                                 <span>{v.version}</span>
                                 <span className="font-bold">${v.precioUsd.toLocaleString()}</span>
                               </div>
                             ))}
                           </div>
                        </div>
                    )}

                    <div className="mt-auto pt-4 space-y-3">
                       <div className="flex gap-2">
                          <span className="flex-1 bg-[#00BFFF]/10 text-[#00BFFF] text-[9px] font-black p-2 text-center uppercase">Match {auto.match}%</span>
                          <span className="flex-1 bg-slate-900 text-white text-[9px] font-black p-2 text-center uppercase tracking-tighter">{auto.tag}</span>
                       </div>
                       
                       {/* CTA Quiero Comprar */}
                       <a 
                        href={`https://wa.me/595981123456?text=Hola! Quiero comprar el ${auto.marca} ${auto.modelo} que vi en DATACAR.`} 
                        target="_blank"
                        className="block w-full py-3 bg-[#00BFFF] text-[#0A1F33] text-center font-black text-[11px] uppercase tracking-widest hover:bg-[#0A1F33] hover:text-white transition-all"
                       >
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
            <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-[#0A1F33] text-white p-6 shadow-2xl flex items-center gap-10 animate-in slide-in-from-bottom-10">
               <div>
                  <p className="text-[10px] font-black text-[#00BFFF] uppercase">Comparador</p>
                  <p className="text-sm font-bold">{compareIds.length} de 3 activos seleccionados</p>
               </div>
               <div className="flex gap-4">
                  {compareIds.length === 3 ? (
                    <button className="bg-[#00BFFF] text-[#0A1F33] px-8 py-3 font-black text-[11px] uppercase tracking-widest">Ver Comparativa Ahora</button>
                  ) : (
                    <p className="text-[10px] text-slate-400 italic">Selecciona {3 - compareIds.length} más para comparar datos duros</p>
                  )}
                  <button onClick={() => setCompareIds([])} className="text-white/50 text-[10px] font-black uppercase hover:text-white">Limpiar</button>
               </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
