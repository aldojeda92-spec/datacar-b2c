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
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-2xl shadow-xl border border-slate-100">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-extrabold text-blue-600 mb-2">Datacar Auto-Gestión</h1>
        <p className="text-slate-500">Compara y decide tu próximo vehículo con IA</p>
      </div>

      {/* Barra de progreso */}
      <div className="mb-8 bg-slate-100 rounded-full h-2">
        <div className="bg-blue-600 h-2 rounded-full transition-all duration-500" style={{ width: `${(step / totalSteps) * 100}%` }}></div>
      </div>

      {/* PASO 1 */}
      {step === 1 && (
        <div className="space-y-6 animate-in fade-in">
          <h2 className="text-xl font-bold text-slate-800 border-b pb-2">1. Datos Personales y Preferencias</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input name="nombre" value={formData.nombre} onChange={handleInputChange} placeholder="Nombre y Apellido *" className="p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
            <input name="celular" value={formData.celular} onChange={handleInputChange} placeholder="Celular *" className="p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
            <input name="presupuestoDesde" type="number" value={formData.presupuestoDesde} onChange={handleInputChange} placeholder="Presupuesto Desde ($)" className="p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
            <select name="tipoVehiculo" value={formData.tipoVehiculo} onChange={handleInputChange} className="p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white">
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
          <div className="flex justify-between items-center border-b pb-2">
            <h2 className="text-xl font-bold text-slate-800">2. Tu Garaje Actual ({formData.vehiculos.length}/5)</h2>
            {formData.vehiculos.length < 5 && (
              <button onClick={addVehicle} className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200">+ Añadir Auto</button>
            )}
          </div>
          {formData.vehiculos.map((v, i) => (
            <div key={v.id} className="p-4 bg-slate-50 border rounded-lg grid grid-cols-2 md:grid-cols-4 gap-3 relative">
              <input placeholder="Patente" value={v.patente} onChange={e => handleVehicleChange(v.id, 'patente', e.target.value)} className="p-2 border rounded uppercase text-sm" />
              <input placeholder="Marca *" value={v.marca} onChange={e => handleVehicleChange(v.id, 'marca', e.target.value)} className="p-2 border rounded text-sm" />
              <input placeholder="Modelo *" value={v.modelo} onChange={e => handleVehicleChange(v.id, 'modelo', e.target.value)} className="p-2 border rounded text-sm" />
              <input placeholder="Año" type="number" value={v.anio} onChange={e => handleVehicleChange(v.id, 'anio', e.target.value)} className="p-2 border rounded text-sm" />
            </div>
          ))}
        </div>
      )}

      {/* PASO 3 */}
      {step === 3 && (
        <div className="py-12 text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-xl font-bold text-slate-800">La IA está analizando tus opciones...</h2>
          <p className="text-slate-500 mt-2">Este será nuestro motor de comparación Datacar.</p>
        </div>
      )}

      {/* NAVEGACIÓN */}
      <div className="mt-8 flex justify-between pt-4 border-t">
        <button disabled={step === 1} onClick={() => setStep(step - 1)} className="px-6 py-2 text-slate-500 disabled:opacity-0">Atrás</button>
        <button 
          disabled={(step === 1 && !isStep1Valid)}
          onClick={() => setStep(step + 1)} 
          className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold disabled:bg-slate-300"
        >
          {step === 3 ? 'Generar PDF' : 'Siguiente'}
        </button>
      </div>
    </div>
  );
}
