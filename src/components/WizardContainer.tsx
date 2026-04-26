'use client';

import { useState, useEffect } from 'react';

export default function WizardContainer() {
  const [step, setStep] = useState(1);
  const totalSteps = 3;

  const [formData, setFormData] = useState({
    nombre: '', celular: '', email: '',
    presupuestoMin: 10000, presupuestoMax: 50000,
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

  // Lógica de Atributos (Checkboxes)
  const toggleAtributo = (at: string) => {
    setFormData(prev => ({
      ...prev,
      atributos: prev.atributos.includes(at) 
        ? prev.atributos.filter(a => a !== at) 
        : [...prev.atributos, at]
    }));
  };

  // Lógica de Filtros ON/OFF con exclusión mutua (UX)
  const handleFilterToggle = (filterKey: keyof typeof formData.filtros) => {
    setFormData(prev => {
      const newFiltros = { ...prev.filtros };

      if (filterKey === 'todos') {
        return { ...prev, filtros: { todos: true, soloChinos: false, soloEV: false, soloHEV: false, soloJaponeses: false, soloCoreanos: false }};
      }

      newFiltros[filterKey] = !newFiltros[filterKey];
      newFiltros.todos = false;

      // Exclusión: No puede ser EV y HEV al mismo tiempo
      if (filterKey === 'soloEV' && newFiltros.soloEV) newFiltros.soloHEV = false;
      if (filterKey === 'soloHEV' && newFiltros.soloHEV) newFiltros.soloEV = false;

      // Exclusión de origen: Solo un origen a la vez
      if (['soloChinos', 'soloJaponeses', 'soloCoreanos'].includes(filterKey) && newFiltros[filterKey]) {
        if (filterKey !== 'soloChinos') newFiltros.soloChinos = false;
        if (filterKey !== 'soloJaponeses') newFiltros.soloJaponeses = false;
        if (filterKey !== 'soloCoreanos') newFiltros.soloCoreanos = false;
      }

      // Si todos los específicos están OFF, volver a "Incluir todos"
      const anyActive = Object.entries(newFiltros).some(([k, v]) => k !== 'todos' && v);
      if (!anyActive) newFiltros.todos = true;

      return { ...prev, filtros: newFiltros };
    });
  };

  const isStep1Valid = formData.nombre.trim() !== '' && formData.celular.trim() !== '';

  return (
    <div className="max-w-4xl mx-auto p-8 bg-white border border-[#3A3A3C]/20 shadow-none">
      
      {/* BRANDING CORPORATIVO [cite: 5, 11, 15] */}
      <div className="text-center mb-10">
        <h1 className="text-5xl tracking-[1px] mb-2 select-none">
          <span className="font-montserrat font-[900] text-[#0A1F33]">DATA</span>
          <span className="font-montserrat font-[300] text-[#3A3A3C] tracking-wider">CAR</span>
        </h1>
        <p className="font-inter font-medium text-[#3A3A3C]/60 text-sm uppercase tracking-widest">Gestión de Inversiones Automotrices</p>
      </div>

      {/* Barra de progreso Digital Cyan [cite: 42] */}
      <div className="mb-10 bg-slate-100 h-1">
        <div className="bg-[#00BFFF] h-1 transition-all duration-500" style={{ width: `${(step / totalSteps) * 100}%` }}></div>
      </div>

      {step === 1 && (
        <div className="space-y-8 animate-in fade-in">
          {/* SECCIÓN 1: LEAD */}
          <section>
            <h2 className="font-montserrat font-[900] text-[#0A1F33] text-xs uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">1. Información de Contacto</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input name="nombre" value={formData.nombre} onChange={handleInputChange} placeholder="Nombre y Apellido *" className="p-3 border border-[#3A3A3C]/20 outline-none focus:border-[#0A1F33] font-inter text-sm" />
              <input name="celular" value={formData.celular} onChange={handleInputChange} placeholder="Celular *" className="p-3 border border-[#3A3A3C]/20 outline-none focus:border-[#0A1F33] font-inter text-sm" />
            </div>
          </section>

          {/* SECCIÓN 2: RANGO PRESUPUESTARIO */}
          <section>
            <h2 className="font-montserrat font-[900] text-[#0A1F33] text-xs uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">2. Rango de Inversión (USD)</h2>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <input type="range" min="5000" max="150000" step="1000" value={formData.presupuestoMax} name="presupuestoMax" onChange={handleInputChange} className="w-full h-1 bg-slate-200 appearance-none cursor-pointer accent-[#00BFFF]" />
                <div className="flex justify-between text-[10px] font-bold text-[#3A3A3C]/50 mt-2">
                  <span>MIN: $5.000</span>
                  <span>MÁX: $150.000</span>
                </div>
              </div>
              <div className="bg-[#0A1F33] text-white p-3 font-montserrat font-[900] text-sm min-w-[120px] text-center">
                UP TO ${Number(formData.presupuestoMax).toLocaleString()}
              </div>
            </div>
          </section>

          {/* SECCIÓN 3: ATRIBUTOS Y FILTROS */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h2 className="font-montserrat font-[900] text-[#0A1F33] text-xs uppercase tracking-widest mb-4">Atributos Prioritarios</h2>
              <div className="flex flex-wrap gap-2">
                {['Seguridad', 'Dimensiones', 'Rendimiento', 'Precio', 'Tecnología'].map(at => (
                  <button key={at} onClick={() => toggleAtributo(at)} className={`px-4 py-2 text-[10px] font-bold uppercase tracking-wider border transition-all ${formData.atributos.includes(at) ? 'bg-[#0A1F33] text-white border-[#0A1F33]' : 'bg-transparent text-[#3A3A3C] border-[#3A3A3C]/20'}`}>
                    {at}
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <h2 className="font-montserrat font-[900] text-[#0A1F33] text-xs uppercase tracking-widest mb-4">Filtros de Exclusión</h2>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Incluir Todos', key: 'todos' },
                  { label: 'Solo Chinos', key: 'soloChinos' },
                  { label: 'Solo EV', key: 'soloEV' },
                  { label: 'Solo HEV', key: 'soloHEV' },
                  { label: 'Japonesas', key: 'soloJaponeses' },
                  { label: 'Coreanas', key: 'soloCoreanos' }
                ].map(f => (
                  <button key={f.key} onClick={() => handleFilterToggle(f.key as any)} className={`flex justify-between items-center px-3 py-2 border text-[9px] font-black uppercase tracking-tighter transition-all ${formData.filtros[f.key as keyof typeof formData.filtros] ? 'border-[#00BFFF] text-[#00BFFF] bg-[#00BFFF]/5' : 'border-slate-100 text-slate-400'}`}>
                    {f.label}
                    <div className={`w-2 h-2 rounded-full ${formData.filtros[f.key as keyof typeof formData.filtros] ? 'bg-[#00BFFF]' : 'bg-slate-200'}`}></div>
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* SECCIÓN 4: NOTAS */}
          <section>
            <h2 className="font-montserrat font-[900] text-[#0A1F33] text-xs uppercase tracking-widest mb-4">Notas Adicionales</h2>
            <textarea name="notasAdicionales" value={formData.notasAdicionales} onChange={handleInputChange} placeholder="Colores favoritos, detalles específicos, requerimientos técnicos..." className="w-full p-4 border border-[#3A3A3C]/20 outline-none focus:border-[#0A1F33] font-inter text-sm min-h-[100px] bg-slate-50" />
          </section>
        </div>
      )}

      {/* NAVEGACIÓN [cite: 44] */}
      <div className="mt-12 flex justify-between items-center pt-8 border-t border-slate-100">
        <button disabled={step === 1} onClick={() => setStep(step - 1)} className="font-montserrat font-[900] text-[10px] uppercase tracking-[2px] text-[#3A3A3C]/40 disabled:opacity-0">
          ← Back
        </button>
        <button 
          disabled={(step === 1 && !isStep1Valid)}
          onClick={() => setStep(step + 1)} 
          className="bg-[#00BFFF] text-[#0A1F33] px-10 py-4 font-montserrat font-[900] text-xs uppercase tracking-[2px] hover:bg-[#0099CC] transition-all disabled:bg-slate-100 disabled:text-slate-300"
        >
          {step === 3 ? 'Generate Dossier' : 'Continue →'}
        </button>
      </div>
    </div>
  );
}
