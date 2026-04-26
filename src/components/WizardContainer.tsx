'use client';

import { useState } from 'react';

export default function WizardContainer() {
  const [step, setStep] = useState(1);
  const totalSteps = 3;

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
    vehiculos: [{ id: 1, patente: '', marca: '', modelo: '', anio: '', km: '', estado: 'bueno' }]
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const toggleAtributo = (at: string) => {
    setFormData(prev => ({
      ...prev,
      atributos: prev.atributos.includes(at) 
        ? prev.atributos.filter(a => a !== at) 
        : [...prev.atributos, at]
    }));
  };

  const handleFilterToggle = (filterKey: keyof typeof formData.filtros) => {
    setFormData(prev => {
      const newFiltros = { ...prev.filtros };

      if (filterKey === 'todos') {
        return { ...prev, filtros: { todos: true, soloChinos: false, soloEV: false, soloHEV: false, soloJaponeses: false, soloCoreanos: false }};
      }

      newFiltros[filterKey] = !newFiltros[filterKey];
      newFiltros.todos = false;

      // Exclusión lógica: No puede ser EV y HEV simultáneamente
      if (filterKey === 'soloEV' && newFiltros.soloEV) newFiltros.soloHEV = false;
      if (filterKey === 'soloHEV' && newFiltros.soloHEV) newFiltros.soloEV = false;

      // Exclusión de origen: Solo un bloque regional activo
      if (['soloChinos', 'soloJaponeses', 'soloCoreanos'].includes(filterKey) && newFiltros[filterKey]) {
        if (filterKey !== 'soloChinos') newFiltros.soloChinos = false;
        if (filterKey !== 'soloJaponeses') newFiltros.soloJaponeses = false;
        if (filterKey !== 'soloCoreanos') newFiltros.soloCoreanos = false;
      }

      const anyActive = Object.entries(newFiltros).some(([k, v]) => k !== 'todos' && v);
      if (!anyActive) newFiltros.todos = true;

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

  const isStep1Valid = formData.nombre.trim() !== '' && formData.celular.trim() !== '';

  return (
    <div className="max-w-4xl mx-auto p-8 bg-white border border-[#3A3A3C]/20">
      
      {/* WORDMARK DUAL (Manual v2.1) */}
      <div className="text-center mb-10">
        <h1 className="text-5xl uppercase tracking-[1px] mb-2 select-none">
          <span className="font-montserrat font-[900] text-[#0A1F33]">DATA</span>
          <span className="font-montserrat font-[300] text-[#3A3A3C]">CAR</span>
        </h1>
        <p className="font-inter font-medium text-[#3A3A3C]/60 text-[10px] uppercase tracking-[3px]">Inversión Automotriz Basada en Datos</p>
      </div>

      {/* Barra de progreso Digital Cyan */}
      <div className="mb-12 bg-slate-100 h-[2px]">
        <div className="bg-[#00BFFF] h-[2px] transition-all duration-700" style={{ width: `${(step / totalSteps) * 100}%` }}></div>
      </div>

      {step === 1 && (
        <div className="space-y-10 animate-in fade-in duration-500">
          
          {/* 1. CONTACTO */}
          <section>
            <h2 className="font-montserrat font-[900] text-[#0A1F33] text-[11px] uppercase tracking-widest mb-5 border-l-4 border-[#00BFFF] pl-3">1. Perfil del Inversor</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input name="nombre" value={formData.nombre} onChange={handleInputChange} placeholder="Nombre completo *" className="p-3 border border-[#3A3A3C]/20 outline-none focus:border-[#0A1F33] font-inter text-sm bg-slate-50/50" />
              <input name="celular" value={formData.celular} onChange={handleInputChange} placeholder="Celular de contacto *" className="p-3 border border-[#3A3A3C]/20 outline-none focus:border-[#0A1F33] font-inter text-sm bg-slate-50/50" />
            </div>
          </section>

          {/* 2. MARGEN DE INVERSIÓN DUAL */}
          <section>
            <h2 className="font-montserrat font-[900] text-[#0A1F33] text-[11px] uppercase tracking-widest mb-5 border-l-4 border-[#00BFFF] pl-3">2. Margen de Inversión (USD)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
              <div>
                <label className="block text-[10px] font-bold text-[#3A3A3C]/60 uppercase mb-2">Mínimo sugerido</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#3A3A3C]/40 text-sm font-bold">$</span>
                  <input type="number" name="presupuestoMin" value={formData.presupuestoMin} onChange={handleInputChange} className="w-full p-4 pl-8 border border-[#3A3A3C]/20 outline-none focus:border-[#0A1F33] font-inter text-sm font-bold text-[#0A1F33]" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#3A3A3C]/60 uppercase mb-2">Máximo disponible</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#3A3A3C]/40 text-sm font-bold">$</span>
                  <input type="number" name="presupuestoMax" value={formData.presupuestoMax} onChange={handleInputChange} className="w-full p-4 pl-8 border border-[#3A3A3C]/20 outline-none focus:border-[#0A1F33] font-inter text-sm font-bold text-[#0A1F33]" />
                </div>
              </div>
            </div>
          </section>

          {/* 3. PREFERENCIAS Y FILTROS */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div>
              <h2 className="font-montserrat font-[900] text-[#0A1F33] text-[11px] uppercase tracking-widest mb-5 border-l-4 border-[#00BFFF] pl-3">3. Atributos Críticos</h2>
              <div className="flex flex-wrap gap-2">
                {['Seguridad', 'Dimensiones', 'Rendimiento', 'Precio', 'Tecnología'].map(at => (
                  <button key={at} onClick={() => toggleAtributo(at)} className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest border transition-all ${formData.atributos.includes(at) ? 'bg-[#0A1F33] text-white border-[#0A1F33]' : 'bg-transparent text-[#3A3A3C] border-[#3A3A3C]/20 hover:border-[#0A1F33]'}`}>
                    {at}
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <h2 className="font-montserrat font-[900] text-[#0A1F33] text-[11px] uppercase tracking-widest mb-5 border-l-4 border-[#00BFFF] pl-3">4. Filtros de Exclusión</h2>
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

          {/* 4. NOTAS ADICIONALES */}
          <section>
            <h2 className="font-montserrat font-[900] text-[#0A1F33] text-[11px] uppercase tracking-widest mb-4">Notas y Requerimientos Específicos</h2>
            <textarea name="notasAdicionales" value={formData.notasAdicionales} onChange={handleInputChange} placeholder="Colores, equipamiento deseado, restricciones de espacio..." className="w-full p-4 border border-[#3A3A3C]/20 outline-none focus:border-[#0A1F33] font-inter text-sm min-h-[80px] bg-slate-50/30" />
          </section>
        </div>
      )}

      {/* PASO 2: VEHÍCULOS (GARAJE) */}
      {step === 2 && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="flex justify-between items-end border-b border-slate-100 pb-4">
            <h2 className="font-montserrat font-[900] text-[#0A1F33] text-sm uppercase tracking-widest">Vehículos en Evaluación ({formData.vehiculos.length}/5)</h2>
            {formData.vehiculos.length < 5 && (
              <button onClick={addVehicle} className="text-[10px] bg-[#0A1F33] text-white px-4 py-2 font-black uppercase tracking-widest hover:bg-[#00BFFF] hover:text-[#0A1F33] transition-all">+ Add Asset</button>
            )}
          </div>
          <div className="grid grid-cols-1 gap-4">
            {formData.vehiculos.map((v, i) => (
              <div key={v.id} className="p-6 bg-slate-50 border border-slate-100 grid grid-cols-2 md:grid-cols-4 gap-4 relative">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Patente</label>
                  <input value={v.patente} onChange={e => handleVehicleChange(v.id, 'patente', e.target.value)} className="w-full p-2 border border-slate-200 outline-none uppercase text-xs font-bold focus:border-[#0A1F33]" placeholder="ABC 123" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Marca *</label>
                  <input value={v.marca} onChange={e => handleVehicleChange(v.id, 'marca', e.target.value)} className="w-full p-2 border border-slate-200 outline-none text-xs focus:border-[#0A1F33]" placeholder="Toyota" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Modelo *</label>
                  <input value={v.modelo} onChange={e => handleVehicleChange(v.id, 'modelo', e.target.value)} className="w-full p-2 border border-slate-200 outline-none text-xs focus:border-[#0A1F33]" placeholder="Hilux" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Año</label>
                  <input type="number" value={v.anio} onChange={e => handleVehicleChange(v.id, 'anio', e.target.value)} className="w-full p-2 border border-slate-200 outline-none text-xs focus:border-[#0A1F33]" placeholder="2024" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* NAVEGACIÓN CORPORATIVA */}
      <div className="mt-16 flex justify-between items-center pt-8 border-t border-slate-100">
        <button disabled={step === 1} onClick={() => setStep(step - 1)} className="font-montserrat font-[900] text-[10px] uppercase tracking-[3px] text-[#3A3A3C]/30 hover:text-[#0A1F33] transition-all disabled:opacity-0">
          ← Back
        </button>
        <button 
          disabled={(step === 1 && !isStep1Valid)}
          onClick={() => setStep(step + 1)} 
          className="bg-[#00BFFF] text-[#0A1F33] px-12 py-4 font-montserrat font-[900] text-xs uppercase tracking-[3px] transition-all disabled:bg-slate-50 disabled:text-slate-300"
        >
          {step === 3 ? 'Execute Analysis' : 'Next Step →'}
        </button>
      </div>
    </div>
  );
}
