'use client';

import { useState } from 'react';
import { saveLeadAction, logComparisonAction } from '@/app/actions';

interface IAAuto {
  id: string; puesto: number; match_percent: number; marca: string; modelo: string;
  version: string; precioUsd: number; origenMarca: string; combustible: string;
  urlImagen?: string; motor?: string; traccion?: string; transmision?: string;
  bauleraLitros?: number; garantia?: string; versiones: any[];
}

export default function WizardContainer() {
  const [step, setStep] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [currentLeadId, setCurrentLeadId] = useState<string>('');
  const [top10, setTop10] = useState<IAAuto[]>([]);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    nombre: '', celular: '', email: '', presupuestoMin: 20000, presupuestoMax: 50000,
    atributos: [] as string[], motorizacion: 'Todos', tipoVehiculo: 'SUV',
    origen: 'Todos', concesionaria: 'Todas', notas: ''
  });

  const isReady = formData.nombre && formData.celular && formData.atributos.length === 3;

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.min(Number(e.target.value), formData.presupuestoMax - 2000);
    setFormData({ ...formData, presupuestoMin: value });
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(Number(e.target.value), formData.presupuestoMin + 2000);
    setFormData({ ...formData, presupuestoMax: value });
  };

  const toggleAtributo = (at: string) => {
    setFormData(prev => {
      if (prev.atributos.includes(at)) return { ...prev, atributos: prev.atributos.filter(x => x !== at) };
      if (prev.atributos.length < 3) return { ...prev, atributos: [...prev.atributos, at] };
      return prev;
    });
  };

  const toggleCompare = (id: string) => {
    setCompareIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : prev.length < 3 ? [...prev, id] : prev);
  };

  const handleExecute = async () => {
    setIsAnalyzing(true);
    try {
      const result = await saveLeadAction(formData);
      if (result.success && result.leadId) {
        setCurrentLeadId(result.leadId);
        const res = await fetch('/api/analyze', { 
          method: 'POST', body: JSON.stringify({ leadId: result.leadId }),
          headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        if (data.success) { setTop10(data.top10); setStep(2); window.scrollTo(0, 0); }
      }
    } catch (e) { alert("Error de conexión"); } finally { setIsAnalyzing(false); }
  };

  const handleOpenComparison = async () => {
    const selected = top10.filter(a => compareIds.includes(a.id));
    const nombres = selected.map(a => `${a.marca} ${a.modelo}`).join(' vs ');
    if (currentLeadId) await logComparisonAction({ leadId: currentLeadId, vIds: compareIds, nombres });
    setShowComparison(true);
    window.scrollTo(0, 0);
  };

  if (isAnalyzing) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <div className="w-12 h-12 border-4 border-[#0A1F33] border-t-[#00BFFF] rounded-full animate-spin mb-6"></div>
      <p className="font-montserrat font-black text-xs uppercase tracking-[6px] text-[#0A1F33]">Generando Dossier Estratégico...</p>
    </div>
  );

  // --- VISTA DE COMPARACIÓN ---
  if (showComparison) {
    const selected = top10.filter(a => compareIds.includes(a.id));
    return (
      <div className="min-h-screen bg-white p-10 animate-in fade-in duration-500">
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="flex justify-between items-end border-b-4 border-[#0A1F33] pb-6">
            <h2 className="text-4xl font-montserrat font-black text-[#0A1F33] uppercase leading-none">Comparativa <span className="text-[#00BFFF]">Datos Duros</span></h2>
            <button onClick={() => setShowComparison(false)} className="bg-[#0A1F33] text-white px-8 py-3 font-black text-[10px] uppercase tracking-widest hover:bg-[#00BFFF] transition-all">← Volver al Ranking</button>
          </div>
          <div className="grid grid-cols-4 gap-1 border-b">
            <div className="bg-slate-50 p-6 flex flex-col justify-end font-black text-[10px] text-slate-400 uppercase tracking-widest">Especificaciones</div>
            {selected.map(auto => (
              <div key={auto.id} className="p-6 text-center space-y-4 bg-white border-x">
                <div className="h-32 flex items-center justify-center">
                  <img src={auto.urlImagen} className="max-h-full object-contain mx-auto" />
                </div>
                <h3 className="font-black text-[#0A1F33] uppercase text-sm leading-tight">{auto.marca} <br/> {auto.modelo}</h3>
                <p className="text-[#00BFFF] font-black text-xl">${auto.precioUsd.toLocaleString()}</p>
                {/* CTA en el Comparador */}
                <a href={`https://wa.me/595981123456?text=Me interesa el ${auto.marca} ${auto.modelo} del comparador Datacar.`} target="_blank" className="block w-full py-3 bg-[#0A1F33] text-white text-center font-black text-[9px] uppercase tracking-widest hover:bg-[#00BFFF] transition-all">Quiero Comprar</a>
              </div>
            ))}
          </div>
          {[
            { label: 'Motorización', key: 'combustible' },
            { label: 'Transmisión', key: 'transmision' },
            { label: 'Tracción', key: 'traccion' },
            { label: 'Baulera (Litros)', key: 'bauleraLitros' },
            { label: 'Garantía', key: 'garantia' },
            { label: 'Origen Marca', key: 'origenMarca' }
          ].map((item, idx) => (
            <div key={idx} className={`grid grid-cols-4 gap-1 ${idx % 2 === 0 ? 'bg-slate-50/50' : 'bg-white'}`}>
              <div className="p-6 font-black text-[9px] uppercase text-slate-500 flex items-center">{item.label}</div>
              {selected.map(auto => (
                <div key={auto.id} className="p-6 text-center text-xs font-bold text-[#0A1F33] flex items-center justify-center border-x">
                  {(auto as any)[item.key] || '–'}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen font-inter ${step === 2 ? 'bg-[#F8FAFC]' : 'bg-white'}`}>
      
      <div className="max-w-[1600px] mx-auto p-10 flex justify-between items-center">
        <h1 className="text-3xl font-montserrat font-black text-[#0A1F33] uppercase">DATA<span className="text-[#00BFFF]">CAR</span></h1>
        {step === 2 && <button onClick={() => setStep(1)} className="text-[10px] font-black uppercase border-b-2 border-[#00BFFF] pb-1">← Re-ajustar Búsqueda</button>}
      </div>

      {step === 1 && (
        <div className="max-w-4xl mx-auto p-12 animate-in fade-in duration-700">
          <div className="bg-white border border-slate-100 p-12 shadow-2xl space-y-12">
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400">Nombre *</label>
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

            <div className="space-y-10">
              <div className="flex justify-between items-center">
                <label className="text-[9px] font-black uppercase text-slate-400">Margen de Inversión (USD)</label>
                <div className="flex gap-4 font-black text-[#0A1F33] text-sm tracking-tighter bg-slate-50 px-4 py-2 rounded-full">
                  <span>${formData.presupuestoMin.toLocaleString()}</span> — <span>${formData.presupuestoMax.toLocaleString()}</span>
                </div>
              </div>
              <div className="relative w-full h-1 bg-slate-100 rounded-full">
                <div className="absolute h-full bg-[#00BFFF] rounded-full" style={{ left: `${(formData.presupuestoMin / 200000) * 100}%`, right: `${100 - (formData.presupuestoMax / 200000) * 100}%` }} />
                <input type="range" min="0" max="200000" step="1000" value={formData.presupuestoMin} onChange={handleMinChange} className="absolute w-full -top-1 h-2 appearance-none bg-transparent pointer-events-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-[#0A1F33] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white" />
                <input type="range" min="0" max="200000" step="1000" value={formData.presupuestoMax} onChange={handleMaxChange} className="absolute w-full -top-1 h-2 appearance-none bg-transparent pointer-events-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-[#00BFFF] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white" />
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[9px] font-black uppercase text-slate-400">Atributos Críticos (Seleccionar 3) *</label>
              <div className="flex flex-wrap gap-2">
                {['Seguridad', 'Tecnología', 'Espacio', 'Precio', 'Eficiencia'].map(at => (
                  <button key={at} onClick={() => toggleAtributo(at)} className={`px-6 py-2 text-[10px] font-black border-2 transition-all ${formData.atributos.includes(at) ? 'bg-[#0A1F33] text-white border-[#0A1F33]' : 'text-slate-300 border-slate-100 hover:border-slate-200'}`}>{at}</button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <select value={formData.motorizacion} onChange={e => setFormData({...formData, motorizacion: e.target.value})} className="w-full p-3 bg-slate-50 border-b-2 text-sm outline-none font-medium">
                {['Todos', 'PHEV', 'HEV', 'EV', 'Diesel', 'Flex', 'Nafta'].map(x => <option key={x} value={x}>{x}</option>)}
              </select>
              <select value={formData.tipoVehiculo} onChange={e => setFormData({...formData, tipoVehiculo: e.target.value})} className="w-full p-3 bg-slate-50 border-b-2 text-sm outline-none font-medium">
                {['SUV', 'Sedan', 'Hatchback', 'Pickup'].map(x => <option key={x} value={x}>{x}</option>)}
              </select>
              <select value={formData.origen} onChange={e => setFormData({...formData, origen: e.target.value})} className="p-3 bg-slate-50 border-b-2 text-sm outline-none font-medium">
                {['Todos', 'Solo Coreanos', 'Solo Japoneses', 'Solo Europeos', 'Solo Chinos'].map(x => <option key={x} value={x}>{x}</option>)}
              </select>
              <select value={formData.concesionaria} onChange={e => setFormData({...formData, concesionaria: e.target.value})} className="p-3 bg-slate-50 border-b-2 text-sm outline-none font-medium">
                {['Todas', 'Garden', 'Automotor', 'Santa Rosa', 'Chacomer', 'Toyotoshi', 'Condor', 'Gorostiaga'].map(x => <option key={x} value={x}>{x}</option>)}
              </select>
            </div>

            <textarea value={formData.notas} onChange={e => setFormData({...formData, notas: e.target.value})} placeholder="Notas adicionales..." className="w-full p-4 bg-slate-50 border-b-2 text-sm min-h-[100px] outline-none font-medium" />

            <button disabled={!isReady} onClick={handleExecute} className="w-full py-6 bg-[#0A1F33] text-white font-montserrat font-black text-xs uppercase tracking-[5px] hover:bg-[#00BFFF] transition-all disabled:opacity-20 shadow-xl">Generar Análisis Estratégico →</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="max-w-[1700px] mx-auto p-10 pb-40 animate-in fade-in duration-1000 space-y-12">
          
          {/* RESUMEN DE PERSONALIZACIÓN RESTAURADO */}
          <div className="bg-[#0A1F33] p-12 text-white border-l-8 border-[#00BFFF] shadow-2xl">
            <h2 className="font-montserrat font-black text-2xl uppercase tracking-tighter">
              {formData.nombre.split(' ')[0]}, busca un auto {formData.atributos.join(', ')}.
            </h2>
            <p className="mt-4 text-slate-400 font-medium text-sm uppercase tracking-widest underline decoration-[#00BFFF] underline-offset-8">
              Inversión: ${formData.presupuestoMin.toLocaleString()} – ${formData.presupuestoMax.toLocaleString()} | {formData.origen} | {formData.motorizacion}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-10">
            {top10.map((auto, idx) => (
              <div key={auto.id} className={`bg-white border flex flex-col transition-all relative ${compareIds.includes(auto.id) ? 'border-[#00BFFF] ring-4 ring-[#00BFFF]/10' : 'border-slate-100 shadow-sm'}`}>
                <div className="absolute -top-3 -left-3 w-10 h-10 bg-[#0A1F33] text-white flex items-center justify-center font-black z-10 shadow-lg">{idx + 1}</div>
                <div className="relative h-56 bg-slate-50 overflow-hidden">
                  <img src={auto.urlImagen} className="w-full h-full object-cover" alt={auto.modelo} />
                  <button onClick={() => toggleCompare(auto.id)} className={`absolute top-4 right-4 px-3 py-1 text-[8px] font-black border transition-all ${compareIds.includes(auto.id) ? 'bg-[#00BFFF] text-white border-[#00BFFF]' : 'bg-white/90 text-slate-400 border-slate-200 hover:text-[#0A1F33]'}`}>
                    {compareIds.includes(auto.id) ? '✓ SELECCIONADO' : '+ COMPARAR'}
                  </button>
                </div>
                {/* PADDING P-10 RESTAURADO */}
                <div className="p-10 flex-1 flex flex-col gap-6">
                  <h4 className="font-black text-lg text-[#0A1F33] uppercase leading-tight">{auto.marca} <br/> <span className="font-light text-slate-400">{auto.modelo}</span></h4>
                  <div className="flex justify-between border-y py-4 text-sm font-black uppercase">
                    <span className="text-[#00BFFF]">{auto.match_percent}% Match</span>
                    <span className="text-[#0A1F33]">${auto.precioUsd?.toLocaleString()}</span>
                  </div>
                  <button onClick={() => setExpandedId(expandedId === auto.id ? null : auto.id)} className="text-[9px] font-black text-[#00BFFF] text-left uppercase tracking-widest">+ Datos Técnicos</button>
                  {expandedId === auto.id && (
                    <div className="text-[10px] space-y-2 text-slate-500 animate-in slide-in-from-top-1 duration-300">
                      <p className="flex justify-between border-b pb-1"><span>Motor:</span> <span className="font-bold text-[#0A1F33]">{auto.motor || 'Consultar'}</span></p>
                      <p className="flex justify-between border-b pb-1"><span>Garantía:</span> <span className="font-bold text-[#0A1F33]">{auto.garantia || 'Consultar'}</span></p>
                    </div>
                  )}
                  <a href={`https://wa.me/595981123456?text=Me interesa el ${auto.marca} ${auto.modelo} del ranking Datacar.`} target="_blank" className="mt-auto block w-full py-4 bg-[#0A1F33] text-white text-center font-black text-[10px] uppercase tracking-widest hover:bg-[#00BFFF] transition-all shadow-lg">Quiero Comprar</a>
                </div>
              </div>
            ))}
          </div>

          {/* DOCK COMPARADOR */}
          {compareIds.length >= 1 && (
            <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-50 bg-[#0A1F33] text-white p-8 shadow-2xl flex items-center gap-10 border-t-4 border-[#00BFFF] rounded-sm animate-in slide-in-from-bottom-10">
              <div className="text-sm font-bold uppercase">{compareIds.length} <span className="text-slate-500 font-light">seleccionados</span></div>
              {compareIds.length >= 2 ? (
                <button onClick={handleOpenComparison} className="bg-[#00BFFF] text-[#0A1F33] px-10 py-4 font-black text-[11px] uppercase tracking-widest hover:bg-white transition-all">Comparar Datos Duros</button>
              ) : (
                <p className="text-[10px] text-slate-500 italic tracking-widest">Selecciona al menos 2...</p>
              )}
              <button onClick={() => setCompareIds([])} className="text-white/30 text-[9px] uppercase font-black hover:text-white transition-colors">Limpiar</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
