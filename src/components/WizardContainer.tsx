'use client';

import { useState, useEffect } from 'react';
import { saveLeadAction } from '@/app/actions';

export default function WizardContainer() {
  const [step, setStep] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [top10, setTop10] = useState<any[]>([]);

  // ESTADO DEL FORMULARIO
  const [formData, setFormData] = useState({
    nombre: '', celular: '', email: '',
    presupuestoMin: 15000, presupuestoMax: 45000,
    atributos: [] as string[],
    motorizacion: 'Todos',
    tipoVehiculo: 'SUV',
    origen: 'Todos',
    concesionaria: 'Todas',
    notas: ''
  });

  // Validaciones
  const canSubmit = 
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

  const handleExecute = async () => {
    setIsAnalyzing(true);
    const result = await saveLeadAction(formData);
    if (result.success) {
      const res = await fetch('/api/analyze', { method: 'POST', body: JSON.stringify({ leadId: result.leadId }) });
      const data = await res.json();
      if (data.success) { setTop10(data.top10); setStep(2); }
    }
    setIsAnalyzing(false);
  };

  if (isAnalyzing) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white space-y-4">
      <div className="w-12 h-12 border-4 border-[#0A1F33] border-t-[#00BFFF] rounded-full animate-spin"></div>
      <p className="font-black uppercase tracking-[5px] text-[#0A1F33]">Escaneando Matriz...</p>
    </div>
  );

  return (
    <div className={`min-h-screen font-inter transition-all duration-700 ${step === 2 ? 'bg-slate-50' : 'bg-white'}`}>
      
      {/* HEADER */}
      <div className="max-w-[1400px] mx-auto p-10 flex justify-between items-center border-b border-slate-100">
        <h1 className="text-3xl font-montserrat font-black text-[#0A1F33]">DATA<span className="text-[#00BFFF]">CAR</span></h1>
        {step === 2 && <button onClick={() => setStep(1)} className="text-[10px] font-black uppercase border-b-2 border-[#00BFFF]">Nueva Consulta</button>}
      </div>

      {step === 1 && (
        <div className="max-w-4xl mx-auto p-12 animate-in fade-in duration-700">
          <div className="bg-white p-12 border border-slate-100 shadow-2xl space-y-12">
            
            {/* 1. DATOS PERSONALES */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400">Nombre y Apellido *</label>
                <input value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} className="w-full p-3 border-b-2 bg-slate-50 outline-none focus:border-[#0A1F33] text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400">Celular *</label>
                <input value={formData.celular} onChange={e => setFormData({...formData, celular: e.target.value})} className="w-full p-3 border-b-2 bg-slate-50 outline-none focus:border-[#0A1F33] text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400">Email (Opcional)</label>
                <input value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full p-3 border-b-2 bg-slate-50 outline-none focus:border-[#0A1F33] text-sm" />
              </div>
            </div>

            {/* 2. RANGO DE PRECIO SINCRONIZADO */}
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black uppercase text-slate-400">Rango de Inversión (USD)</label>
                <div className="flex gap-4">
                  <input type="number" value={formData.presupuestoMin} onChange={e => setFormData({...formData, presupuestoMin: Number(e.target.value)})} className="w-24 p-2 bg-slate-50 border-b-2 text-center text-sm font-black text-[#0A1F33]" />
                  <input type="number" value={formData.presupuestoMax} onChange={e => setFormData({...formData, presupuestoMax: Number(e.target.value)})} className="w-24 p-2 bg-slate-50 border-b-2 text-center text-sm font-black text-[#0A1F33]" />
                </div>
              </div>
              <div className="space-y-4">
                <input type="range" min="5000" max="200000" step="1000" value={formData.presupuestoMin} onChange={e => setFormData({...formData, presupuestoMin: Number(e.target.value)})} className="w-full h-1 accent-[#0A1F33]" />
                <input type="range" min="5000" max="200000" step="1000" value={formData.presupuestoMax} onChange={e => setFormData({...formData, presupuestoMax: Number(e.target.value)})} className="w-full h-1 accent-[#00BFFF]" />
              </div>
            </div>

            {/* 3. ATRIBUTOS (EXACTAMENTE 3) */}
            <div className="space-y-4">
              <div className="flex justify-between">
                <label className="text-[10px] font-black uppercase text-slate-400">Atributos (Seleccionar 3) *</label>
                <span className="text-[10px] font-black text-[#00BFFF]">{formData.atributos.length}/3</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {['Seguridad', 'Tecnología', 'Espacio', 'Precio', 'Eficiencia'].map(at => (
                  <button key={at} onClick={() => toggleAtributo(at)} className={`px-6 py-2 text-[10px] font-black border-2 transition-all ${formData.atributos.includes(at) ? 'bg-[#0A1F33] text-white border-[#0A1F33]' : 'text-slate-300'}`}>{at}</button>
                ))}
              </div>
            </div>

            {/* 4. SELECTORES ÚNICOS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              {/* Motorización */}
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase text-slate-400">Tipo de Motorización</label>
                <select value={formData.motorizacion} onChange={e => setFormData({...formData, motorizacion: e.target.value})} className="w-full p-3 bg-slate-50 border-b-2 text-sm outline-none">
                  {['Todos', 'PHEV', 'HEV', 'EV', 'Diesel', 'Flex', 'Nafta'].map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              {/* Tipo de Vehículo */}
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase text-slate-400">Tipo de Vehículo</label>
                <select value={formData.tipoVehiculo} onChange={e => setFormData({...formData, tipoVehiculo: e.target.value})} className="w-full p-3 bg-slate-50 border-b-2 text-sm outline-none">
                  {['SUV', 'Sedan', 'Hatchback', 'Pickup'].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              {/* Origen */}
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase text-slate-400">Origen Preferente</label>
                <select value={formData.origen} onChange={e => setFormData({...formData, origen: e.target.value})} className="w-full p-3 bg-slate-50 border-b-2 text-sm outline-none">
                  {['Todos', 'Solo Coreanos', 'Solo Japoneses', 'Solo Europeos', 'Solo Chinos'].map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              {/* Concesionaria */}
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase text-slate-400">Concesionaria</label>
                <select value={formData.concesionaria} onChange={e => setFormData({...formData, concesionaria: e.target.value})} className="w-full p-3 bg-slate-50 border-b-2 text-sm outline-none">
                  {['Todas', 'Garden', 'Automotor', 'Santa Rosa', 'Chacomer', 'Toyotoshi', 'Condor', 'Gorostiaga'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* 5. NOTAS */}
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase text-slate-400">Notas Adicionales</label>
              <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Ej: Busco un vehículo con bajo costo de mantenimiento y buena reventa..." className="w-full p-4 bg-slate-50 border-b-2 outline-none text-sm min-h-[120px]" />
            </div>

            <button disabled={!canSubmit} onClick={handleExecute} className="w-full py-6 bg-[#0A1F33] text-white font-montserrat font-black text-xs uppercase tracking-[5px] hover:bg-[#00BFFF] transition-all disabled:opacity-20 shadow-xl">Generar Informe DATACAR →</button>
          </div>
        </div>
      )}

      {/* PASO 2: DOSSIER (Con p-10 como pediste) */}
      {step === 2 && (
        <div className="max-w-[1700px] mx-auto p-10 animate-in fade-in duration-1000">
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-10">
              {top10.map((auto) => (
                <div key={auto.id} className="bg-white p-10 border border-slate-100 flex flex-col gap-6 shadow-sm hover:shadow-xl transition-all">
                  <div className="h-40 bg-slate-50 overflow-hidden">
                    <img src={auto.urlImagen} className="w-full h-full object-cover" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-montserrat font-black text-lg text-[#0A1F33] leading-tight uppercase">{auto.marca} {auto.modelo}</h4>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{auto.version} | {auto.origen}</p>
                  </div>
                  <div className="mt-auto pt-6 border-t border-slate-50">
                    <p className="font-montserrat font-black text-xl text-[#0A1F33]">${auto.precioUsd.toLocaleString()}</p>
                    <a href={`https://wa.me/595981123456?text=Quiero comprar el ${auto.marca} ${auto.modelo}`} target="_blank" className="block w-full py-4 mt-4 bg-[#0A1F33] text-white text-center font-black text-[10px] uppercase tracking-widest">Quiero Comprar</a>
                  </div>
                </div>
              ))}
           </div>
        </div>
      )}
    </div>
  );
}
