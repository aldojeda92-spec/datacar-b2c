'use client';

import { useState } from 'react';

export default function WizardContainer() {
  const [step, setStep] = useState(1);
  const totalSteps = 3;

  const [formData, setFormData] = useState({
    nombre: '', celular: '', email: '',
    presupuestoDesde: '', presupuestoHasta: '', tipoVehiculo: 'indistinto', prioridad: 'precio', marcas: '', notas: '',
    vehiculos: [{ id: 1, patente: '', marca: '', modelo: '', anio: '', km: '', estado: 'bueno' }]
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
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
    <div className="max-w-4xl mx-auto p-8 bg-white border border-data-charcoal/20">
      
      {/* BRANDING: Wordmark Dual */}
      <div className="text-center mb-10 mt-4">
        <h1 className="text-5xl uppercase tracking-[1px] mb-3">
          <span className="font-montserrat font-black text-authority-blue">DATA</span>
          <span className="font-montserrat font-light text-data-charcoal">CAR</span>
        </h1>
        <p className="text-data-charcoal/70 font-medium">Gestión analítica de su próxima inversión automotriz</p>
      </div>

      {/* Barra de progreso con Digital Cyan */}
      <div className="mb-10 bg-slate-200 h-1">
        <div className="bg-digital-cyan h-1 transition-all duration-500" style={{ width: `${(step / totalSteps) * 100}%` }}></div>
      </div>

      {/* PASO 1 */}
      {step === 1 && (
        <div className="space-y-6 animate-in fade-in">
          <h2 className="text-xl font-bold text-authority-blue border-b border-data-charcoal/20 pb-3 uppercase tracking-wider text-sm">1. Datos Personales y Preferencias</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <input name="nombre" value={formData.nombre} onChange={handleInputChange} placeholder="Nombre y Apellido *" className="p-3 border border-data-charcoal/30 outline-none focus:border-authority-blue bg-slate-50" />
            <input name="celular" value={formData.celular} onChange={handleInputChange} placeholder="Celular *" className="p-3 border border-data-charcoal/30 outline-none focus:border-authority-blue bg-slate-50" />
            <input name="presupuestoDesde" type="number" value={formData.presupuestoDesde} onChange={handleInputChange} placeholder="Presupuesto Desde ($)" className="p-3 border border-data-charcoal/30 outline-none focus:border-authority-blue bg-slate-50" />
            <select name="tipoVehiculo" value={formData.tipoVehiculo} onChange={handleInputChange} className="p-3 border border-data-charcoal/30 outline-none focus:border-authority-blue bg-slate-50 text-data-charcoal">
              <option value="indistinto">Tipo: Indistinto</option>
              <option value="SUV">SUV</option>
              <option value="sedan">Sedán</option>
              <option value="pickup">Pick-up</option>
            </select>
          </div>
        </div>
      )}

      {/* PASO 2 */}
      {step === 2 && (
        <div className="space-y-6 animate-in fade-in">
          <div className="flex justify-between items-center border-b border-data-charcoal/20 pb-3">
            <h2 className="text-xl font-bold text-authority-blue uppercase tracking-wider text-sm">2. Vehículos a Evaluar ({formData.vehiculos.length}/5)</h2>
            {formData.vehiculos.length < 5 && (
              <button onClick={addVehicle} className="text-xs bg-data-charcoal text-white px-4 py-2 uppercase tracking-wider font-bold hover:bg-authority-blue transition-colors">
                + Añadir Auto
              </button>
            )}
          </div>
          {formData.vehiculos.map((v, i) => (
            <div key={v.id} className="p-5 bg-slate-50 border border-data-charcoal/20 grid grid-cols-2 md:grid-cols-4 gap-4">
              <input placeholder="Patente" value={v.patente} onChange={e => handleVehicleChange(v.id, 'patente', e.target.value)} className="p-2 border border-data-charcoal/30 outline-none uppercase text-sm focus:border-authority-blue bg-white" />
              <input placeholder="Marca *" value={v.marca} onChange={e => handleVehicleChange(v.id, 'marca', e.target.value)} className="p-2 border border-data-charcoal/30 outline-none text-sm focus:border-authority-blue bg-white" />
              <input placeholder="Modelo *" value={v.modelo} onChange={e => handleVehicleChange(v.id, 'modelo', e.target.value)} className="p-2 border border-data-charcoal/30 outline-none text-sm focus:border-authority-blue bg-white" />
              <input placeholder="Año" type="number" value={v.anio} onChange={e => handleVehicleChange(v.id, 'anio', e.target.value)} className="p-2 border border-data-charcoal/30 outline-none text-sm focus:border-authority-blue bg-white" />
            </div>
          ))}
        </div>
      )}

      {/* PASO 3 */}
      {step === 3 && (
        <div className="py-16 text-center border border-data-charcoal/10 bg-slate-50">
          <div className="w-12 h-12 border-4 border-digital-cyan border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
          <h2 className="text-lg font-bold text-authority-blue uppercase tracking-widest">Análisis en Proceso</h2>
          <p className="text-data-charcoal mt-2 text-sm">El motor de IA está procesando los datos...</p>
        </div>
      )}

      {/* NAVEGACIÓN CON DIGITAL CYAN PARA CTA */}
      <div className="mt-10 flex justify-between pt-6 border-t border-data-charcoal/20">
        <button disabled={step === 1} onClick={() => setStep(step - 1)} className="px-6 py-3 text-data-charcoal uppercase tracking-wider text-sm font-bold disabled:opacity-0 transition-all">Atrás</button>
        <button 
          disabled={(step === 1 && !isStep1Valid)}
          onClick={() => setStep(step + 1)} 
          className="px-8 py-3 bg-digital-cyan text-authority-blue uppercase tracking-wider text-sm font-extrabold disabled:bg-slate-200 disabled:text-slate-400 transition-colors"
        >
          {step === 3 ? 'Generar Dossier' : 'Siguiente'}
        </button>
      </div>
    </div>
  );
}
