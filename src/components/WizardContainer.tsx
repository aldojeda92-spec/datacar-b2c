'use client';

import { useState } from 'react';
import { saveLeadAction } from '@/app/actions';

export default function WizardContainer() {
  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const totalSteps = 3;

  // ESTADO INTEGRAL: Capturamos TODO lo que el usuario toca
  const [formData, setFormData] = useState({
    nombre: '',
    celular: '',
    email: '',
    presupuestoMin: 15000,
    presupuestoMax: 45000,
    atributos: [] as string[],
    notasAdicionales: '',
    filtros: {
      todos: true,
      soloChinos: false,
      soloEV: false,
      soloHEV: false,
      soloJaponeses: false,
      soloCoreanos: false
    },
    vehiculos: [{ id: Date.now(), patente: '', marca: '', modelo: '', anio: '', km: '', estado: 'bueno' }]
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // UX: Lógica de doble barra de presupuesto (evita que se crucen)
  const handleRangeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const val = Number(value);
    setFormData(prev => {
      if (name === 'presupuestoMin' && val > prev.presupuestoMax - 2000) return prev;
      if (name === 'presupuestoMax' && val < prev.presupuestoMin + 2000) return prev;
      return { ...prev, [name]: val };
    });
  };

  // Lógica de Atributos: Máximo 3 selecciones
  const toggleAtributo = (at: string) => {
    setFormData(prev => {
      const exists = prev.atributos.includes(at);
      if (!exists && prev.atributos.length >= 3) return prev;
      return {
        ...prev,
        atributos: exists ? prev.atributos.filter(a => a !== at) : [...prev.atributos, at]
      };
    });
  };

  // UX: Botones ON/OFF con exclusión mutua inteligente
  const handleFilterToggle = (filterKey: keyof typeof formData.filtros) => {
    setFormData(prev => {
      const newFiltros = { ...prev.filtros };
      if (filterKey === 'todos') {
        return { ...prev, filtros: { todos: true, soloChinos: false, soloEV: false, soloHEV: false, soloJaponeses: false, soloCoreanos: false }};
      }
      newFiltros[filterKey] = !newFiltros[filterKey];
      newFiltros.todos = false;
      
      // Exclusiones automáticas
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

  const handleVehicleChange = (id: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      vehiculos: prev.vehiculos.map(v => v.id === id ? { ...v, [field]: value } : v)
    }));
  };

  const addVehicle = () => {
    if (formData.vehiculos.length < 5) {
      setFormData(prev => ({
        ...prev,
        vehiculos: [...prev.vehiculos, { id: Date.now(), patente: '', marca: '', modelo: '', anio: '', km: '', estado: 'bueno' }]
      }));
    }
  };

  // ENVÍO FINAL A BASE DE DATOS
  const handleFinalSubmit = async () => {
    setIsSaving(true);
    const result = await saveLeadAction(formData);
    if (result.success) {
      setStep(3);
    } else {
      alert("Error al sincronizar con DATACAR. Verifique su conexión.");
      setIsSaving(false);
    }
  };

  const isStep1Valid = formData.nombre.trim() !== '' && formData.celular.trim() !== '';

  return (
    <div className="max-w-4xl mx-auto p-8 bg-white border border-[#3A3A3C]/20 font-inter text-[#3A3A3C]">
      
      {/* BRANDING: Wordmark Dual (Manual v2.1) */}
      <div className="text-center mb-10">
        <h1 className="text-5xl uppercase tracking-[1px] mb-2 select-none">
          <span className="font-montserrat font-[900] text-[#0A1F33]">DATA</span>
          <span className="font-montserrat font-[300] text-[#3A3A3C]">CAR</span>
        </h1>
        <p className="font-medium text-[#3A3A3C]/60 text-[10px] uppercase tracking-[3px]">Inversión Automotriz Basada en Datos</p>
      </div>

      {/* Barra de progreso Digital Cyan */}
      <div className="mb-12 bg-slate-100 h-[2px]">
        <div className="bg-[#00BFFF] h-[2px] transition-all duration-700" style={{ width: `${(step / totalSteps) * 100}%` }}></div>
      </div>

      {step === 1 && (
        <div className="space-y-10 animate-in fade-in duration-500">
          
          <section>
            <h2 className="font-montserrat font-[900] text-[#0A1F33] text-[11px] uppercase tracking-widest mb-5 border-l-4 border-[#00BFFF] pl-3">1. Perfil del Inversor</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input name="nombre" value={formData.nombre} onChange={handleInputChange} placeholder="Nombre completo *" className="p-3 border border-[#3A3A3C]/20 outline-none focus:border-[#0A1F33] text-sm bg-slate-50/50" />
              <input name="celular" value={formData.celular} onChange={handleInputChange} placeholder="Celular *" className="p-3 border border-[#3A3A3C]/20 outline-none focus:border-[#0A1F33] text-sm bg-slate-50/50" />
              <input name="email" value={formData.email} onChange={handleInputChange} placeholder="Email corporativo" className="p-3 border border-[#3A3A3C]/20 outline-none focus:border-[#0A1F33] text-sm bg-slate-50/50" />
            </div>
          </section>

          <section>
            <div className="flex justify-between items-end mb-5">
              <h2 className="font-montserrat font-[900] text-[#0A1F33] text-[11px] uppercase tracking-widest border-l-4 border-[#00BFFF] pl-3">2. Margen de Inversión (USD)</h2>
              <div className="font-montserrat font-[900] text-sm text-[#0A1F33]">
                ${formData.presupuestoMin.toLocaleString()} — ${formData.presupuestoMax.toLocaleString()}
              </div>
            </div>
            <div className="space-y-6 px-2">
              <div className="space-y-2">
                <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase"><span>Mínimo</span><span>${formData.presupuestoMin.toLocaleString()}</span></div>
                <input type="range" name="presupuestoMin" min="5000" max="150000" step="1000" value={formData.presupuestoMin} onChange={handleRangeChange} className="w-full h-1 bg-slate-100 appearance-none cursor-pointer accent-[#0A1F33]" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase"><span>Máximo</span><span>${formData.presupuestoMax.toLocaleString()}</span></div>
                <input type="range" name="presupuestoMax" min="5000" max="150000" step="1000" value={formData.presupuestoMax} onChange={handleRangeChange} className="w-full h-1 bg-slate-100 appearance-none cursor-pointer accent-[#00BFFF]" />
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div>
              <div className="flex justify-between items-center mb-5">
                <h2 className="font-montserrat font-[900] text-[#0A1F33] text-[11px] uppercase tracking-widest border-l-4 border-[#00BFFF] pl-3">3. Atributos (Máx 3)</h2>
                <span className="text-[9px] font-black text-[#00BFFF]">{formData.atributos.length}/3</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {['Seguridad', 'Dimensiones', 'Rendimiento', 'Precio', 'Tecnología'].map(at => {
                  const sel = formData.atributos.includes(at);
                  const dis = !sel && formData.atributos.length >= 3;
                  return (
                    <button key={at} onClick={() => toggleAtributo(at)} disabled={dis} className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest border transition-all ${sel ? 'bg-[#0A1F33] text-white border-[#0A1F33]' : 'bg-transparent text-[#3A3A3C] border-[#3A3A3C]/20'} ${dis ? 'opacity-20 cursor-not-allowed' : 'hover:border-[#0A1F33]'}`}>
                      {at}
                    </button>
                  );
                })}
              </div>
            </div>
            
            <div>
              <h2 className="font-montserrat font-[900] text-[#0A1F33] text-[11px] uppercase tracking-widest mb-5 border-l-4 border-[#00BFFF] pl-3">4. Filtros Estratégicos</h2>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Incluir Todos', key: 'todos' },
                  { label: 'Solo Chinos', key: 'soloChinos' },
                  { label: 'Solo EV', key: 'soloEV' },
                  { label: 'Solo HEV', key: 'soloHEV' },
                  { label: 'Japonesas', key: 'soloJaponeses' },
                  { label: 'Coreanas', key: 'soloCoreanos' }
                ].map(f => (
                  <button key={f.key} onClick={() => handleFilterToggle(f.key as any)} className={`flex justify-between items-center px-3 py-2 border text-[9px] font-black uppercase tracking-tighter transition-all ${formData.filtros[f.key as keyof typeof formData.filtros] ? 'border-[#00BFFF] text-[#00BFFF] bg-[#00BFFF]/5' : 'border-slate-100 text-slate-400 opacity-60'}`}>
                    {f.label}
                    <div className={`w-2 h-2 ${formData.filtros[f.key as keyof typeof formData.filtros] ? 'bg-[#00BFFF]' : 'bg-slate-200'}`}></div>
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-montserrat font-[900] text-[#0A1F33] text-[11px] uppercase tracking-widest mb-4">Notas Adicionales</h2>
            <textarea name="notasAdicionales" value={formData.notasAdicionales} onChange={handleInputChange} placeholder="Requerimientos específicos..." className="w-full p-4 border border-[#3A3A3C]/20 outline-none focus:border-[#0A1F33] text-sm min-h-[80px] bg-slate-50/30" />
          </section>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="flex justify-between items-end border-b border-slate-100 pb-4">
            <h2 className="font-montserrat font-[900] text-[#0A1F33] text-sm uppercase tracking-widest">Activos en Evaluación ({formData.vehiculos.length}/5)</h2>
            {formData.vehiculos.length < 5 && (
              <button onClick={addVehicle} className="text-[10px] bg-[#0A1F33] text-white px-4 py-2 font-black uppercase tracking-widest hover:bg-[#00BFFF] hover:text-[#0A1F33] transition-all">+ Add Asset</button>
            )}
          </div>
          <div className="grid grid-cols-1 gap-4">
            {formData.vehiculos.map((v) => (
              <div key={v.id} className="p-6 bg-slate-50 border border-slate-100 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1"><label className="text-[9px] font-bold text-slate-400 uppercase">Patente</label><input value={v.patente} onChange={e => handleVehicleChange(v.id, 'patente', e.target.value)} className="w-full p-2 border border-slate-200 outline-none uppercase text-xs font-bold focus:border-[#0A1F33]" placeholder="ABC 123" /></div>
                <div className="space-y-1"><label className="text-[9px] font-bold text-slate-400 uppercase">Marca *</label><input value={v.marca} onChange={e => handleVehicleChange(v.id, 'marca', e.target.value)} className="w-full p-2 border border-slate-200 outline-none text-xs focus:border-[#0A1F33]" placeholder="Toyota" /></div>
                <div className="space-y-1"><label className="text-[9px] font-bold text-slate-400 uppercase">Modelo *</label><input value={v.modelo} onChange={e => handleVehicleChange(v.id, 'modelo', e.target.value)} className="w-full p-2 border border-slate-200 outline-none text-xs focus:border-[#0A1F33]" placeholder="Hilux" /></div>
                <div className="space-y-1"><label className="text-[9px] font-bold text-slate-400 uppercase">Año</label><input type="number" value={v.anio} onChange={e => handleVehicleChange(v.id, 'anio', e.target.value)} className="w-full p-2 border border-slate-200 outline-none text-xs focus:border-[#0A1F33]" placeholder="2024" /></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="py-24 text-center border border-slate-100 bg-slate-50/50">
          <div className="w-12 h-12 border-4 border-[#00BFFF] border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
          <h2 className="font-montserrat font-[900] text-[#0A1F33] text-lg uppercase tracking-[4px]">Ejecutando Análisis</h2>
          <p className="text-[#3A3A3C] mt-2 text-xs font-medium uppercase tracking-widest opacity-60">Procesando matriz de datos DATACAR...</p>
        </div>
      )}

      {/* NAVEGACIÓN */}
      <div className="mt-16 flex justify-between items-center pt-8 border-t border-slate-100">
        <button disabled={step === 1 || isSaving} onClick={() => setStep(step - 1)} className="font-montserrat font-[900] text-[10px] uppercase tracking-[3px] text-[#3A3A3C]/30 hover:text-[#0A1F33] transition-all disabled:opacity-0">← Back</button>
        <button 
          disabled={(step === 1 && !isStep1Valid) || isSaving}
          onClick={step === 2 ? handleFinalSubmit : () => setStep(step + 1)} 
          className="bg-[#00BFFF] text-[#0A1F33] px-12 py-4 font-montserrat font-[900] text-xs uppercase tracking-[3px] transition-all disabled:bg-slate-50 disabled:text-slate-300"
        >
          {isSaving ? 'Synchronizing...' : (step === 2 ? 'Execute Analysis' : (step === 3 ? 'Analysis Ready' : 'Next Step →'))}
        </button>
      </div>
    </div>
  );
}
