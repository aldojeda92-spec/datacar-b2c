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
    nombre: '', celular: '', email: '', presupuestoMin: 15000, presupuestoMax: 45000,
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
      if (result.success) {
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
    await logComparisonAction({ leadId: currentLeadId, vIds: compareIds, nombres });
    setShowComparison(true);
    window.scrollTo(0, 0);
  };

  if (isAnalyzing) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <div className="w-12 h-12 border-4 border-[#0A1F33] border-t-[#00BFFF] rounded-full animate-spin mb-6"></div>
      <p className="font-montserrat font-black text-xs uppercase tracking-[6px]">Generando Dossier Estratégico...</p>
    </div>
  );

  if (showComparison) {
    const selected = top10.filter(a => compareIds.includes(a.id));
    return (
      <div className="min-h-screen bg-white p-10 animate-in fade-in duration-500">
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="flex justify-between items-end border-b-4 border-[#0A1F33] pb-6">
            <h2 className="text-4xl font-montserrat font-black text-[#0A1F33] uppercase">Comparativa de Datos Duros</h2>
            <button onClick={() => setShowComparison(false)} className="bg-[#00BFFF] text-[#0A1F33] px-8 py-3 font-black text-[10px] uppercase">← Volver al Ranking</button>
          </div>
          <div className="grid grid-cols-4 gap-1 border-b">
            <div className="bg-slate-50 p-6 flex flex-col justify-end font-black text-[10px] text-slate-400 uppercase tracking-widest">Modelos</div>
            {selected.map(auto => (
              <div key={auto.id} className="p-6 text-center space-y-4 bg-white border-x">
                <img src={auto.urlImagen} className="h-32 object-contain mx-auto" />
                <h3 className="font-black text-[#0A1F33] uppercase text-sm">{auto.marca} {auto.modelo}</h3>
                <p className="text-[#00BFFF] font-black text-xl">${auto.precioUsd.toLocaleString()}</p>
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
              <div className="p-6 font-black text-[9px] uppercase text-slate-500">{item.label}</div>
              {selected.map(auto => (
                <div key={auto.id} className="p-6 text-center text-xs font-bold text-[#0A1F33] border-x">{(auto as any)[item.key] || '–'}</div>
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
          <div className="bg-white border p-12 shadow-2xl space-y-12">
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
                <label className="text-[9px] font-black uppercase text-slate-400">Inversión (USD)</label>
                <div className="flex gap-4 font-black text-[#0A1F33] text-sm bg-slate-50 px-4 py-2 rounded-full">
                  <span>${formData.presupuestoMin.toLocaleString()}</span> — <span>${formData.presupuestoMax.toLocaleString()}</span>
                </div>
              </div>
              <div className="relative w-full h-1 bg-slate-100 rounded-full">
                <div className="absolute h-full bg-[#00BFFF] rounded-full" style={{ left: `${(formData.presupuestoMin / 200000) * 100}%`, right: `${100 - (formData.presupuestoMax / 200000) * 100}%` }} />
                <input type="range" min="0" max="200000" step="1000" value={formData.presupuestoMin} onChange={handleMinChange} className="absolute w-full -top-1 appearance-none bg-transparent pointer-events-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-[#0A1F33] [&::-webkit-slider-thumb]:rounded-full" />
                <input type="range" min="0" max="200000" step="1000" value={formData.presupuestoMax} onChange={handleMaxChange} className="absolute w-full -top-1 appearance-none bg-transparent pointer-events-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-[#00BFFF] [&::-webkit-slider-thumb]:rounded-full" />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between text-[9px] font-black uppercase">
                <label className="text-slate-400">Atributos (Seleccionar 3) *</label>
                <span className={formData.atributos.length === 3 ? 'text-[#00BFFF]' : 'text-red-400'}>{formData.atributos.length}/3</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {['Seguridad', 'Tecnología', 'Espacio', 'Precio', 'Eficiencia'].map(at => (
                  <button key={at} onClick={() => toggleAtributo(at)} className={`px-6 py-2 text-[10px] font-black border-2 transition-all ${formData.atributos.includes(at) ? 'bg-[#0A1F33] text-white border-[#0A1F33]' : 'text-slate-300 border-slate-100'}`}>{at}</button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
              <select value={formData.motorizacion} onChange={e => setFormData({...formData, motorizacion: e.target.value})} className="p-3 bg-slate-50 border-b-2 text-sm outline-none">
                {['Todos', 'PHEV', 'HEV', 'EV', 'Diesel', 'Flex', 'Nafta'].map(x => <option key={x} value={x}>{x}</option>)}
              </select>
              <select value={formData.tipoVehiculo} onChange={e => setFormData({...formData, tipoVehiculo: e.target.value})} className="p-3 bg-slate-50 border-b-2 text-sm outline-none">
                {['SUV', 'Sedan', 'Hatchback', 'Pickup'].map(x => <option key={x} value={x}>{x}</option>)}
              </select>
              <select value={formData.origen} onChange={e => setFormData({...formData, origen: e.target.value})} className="p-3 bg-slate-50 border-b-2 text-sm outline-none">
                {['Todos', 'Solo Coreanos', 'Solo Japoneses', 'Solo Europeos', 'Solo Chinos'].map(x => <option key={x} value={x}>{x}</option>)}
              </select>
              <select value={formData.concesionaria} onChange={e => setFormData({...formData, concesionaria: e.target.value})} className="p-3 bg-slate-50 border-b-2 text-sm outline-none">
                {['Todas', 'Garden', 'Automotor', 'Santa Rosa', 'Chacomer', 'Toyotoshi', 'Condor', 'Gorostiaga'].map(x => <option key={x} value={x}>{x}</option>)}
              </select>
            </div>

            <textarea value={formData.notas} onChange={e => setFormData({...formData, notas: e.target.value})} placeholder="Notas adicionales..." className="w-full p-4 bg-slate-50 border-b-2 text-sm min-h-[100px] outline-none" />

            <button disabled={!isReady} onClick={handleExecute} className="w-full py-6 bg-[#0A1F33] text-white font-black text-xs uppercase tracking-[5px] hover:bg-[#00BFFF] disabled:opacity-20 shadow-xl">Generar Análisis Estratégico →</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="max-w-[1700px] mx-auto p-10 pb-40 space-y-12 animate-in fade-in duration-1000">
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
                <div className="absolute -top-3 -left-3 w-10 h-10 bg-[#0A1F33] text-white flex items-center justify-center font-black z-10">{idx + 1}</div>
                <div className="relative h-56 bg-slate-50">
                  <img src={auto.urlImagen} className="w-full h-full object-cover" />
                  <button onClick={() => toggleCompare(auto.id)} className={`absolute top-4 right-4 px-3 py-1 text-[8px] font-black border ${compareIds.includes(auto.id) ? 'bg-[#00BFFF] text-white' : 'bg-white text-slate-400'}`}>
                    {compareIds.includes(auto.id) ? 'SELECCIONADO' : '+ COMPARAR'}
                  </button>
                </div>
                <div className="p-10 flex-1 flex flex-col gap-6">
                  <h4 className="font-black text-lg text-[#0A1F33] uppercase">{auto.marca} <br/> <span className="font-light">{auto.modelo}</span></h4>
                  <div className="flex justify-between border-y py-4 text-sm font-black uppercase">
                    <span className="text-[#00BFFF]">{auto.match_percent}% Match</span>
                    <span className="text-[#0A1F33]">${auto.precioUsd?.toLocaleString()}</span>
                  </div>
                  <button onClick={() => setExpandedId(expandedId === auto.id ? null : auto.id)} className="text-[9px] font-black text-[#00BFFF] text-left uppercase">+ Detalles</button>
                  {expandedId === auto.id && (
                    <div className="text-[10px] space-y-2 text-slate-500 animate-in slide-in-from-top-1">
                      <p className="border-b pb-1">Motor: {auto.motor}</p>
                      <p className="border-b pb-1">Garantía: {auto.garantia}</p>
                    </div>
                  )}
                  <a href={`https://wa.me/595981123456?text=Interés: ${auto.marca} ${auto.modelo}`} target="_blank" className="mt-auto block w-full py-4 bg-[#0A1F33] text-white text-center font-black text-[10px] uppercase tracking-widest hover:bg-[#00BFFF]">Comprar</a>
                </div>
              </div>
            ))}
          </div>

          {compareIds.length >= 1 && (
            <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-50 bg-[#0A1F33] text-white p-8 shadow-2xl flex items-center gap-10 border-t-4 border-[#00BFFF]">
              <div className="text-sm font-bold uppercase">{compareIds.length} Seleccionados</div>
              <button onClick={handleOpenComparison} className="bg-[#00BFFF] text-[#0A1F33] px-10 py-4 font-black text-[11px] uppercase tracking-widest">Comparar Datos Duros</button>
              <button onClick={() => setCompareIds([])} className="text-white/30 text-xs uppercase font-black">Limpiar</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
