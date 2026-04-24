'use client';

import { useState } from 'react';

export default function WizardContainer() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    nombre: '',
    celular: '',
    email: '',
    presupuestoDesde: '',
    presupuestoHasta: '',
    tipoVehiculo: 'indistinto',
    prioridad: 'precio',
    notas: '',
    marcas: ''
  });

  const totalSteps = 3;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const isStep1Valid = formData.nombre.trim() !== '' && formData.celular.trim() !== '';

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-2xl shadow-xl mt-8 border border-slate-100">
      {/* Barra de Progreso */}
      <div className="mb-8">
        <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
          <span>Paso {step} de {totalSteps}</span>
          <span>{Math.round((step / totalSteps) * 100)}% Completado</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(37,99,235,0.4)]" 
            style={{ width: `${(step / totalSteps) * 100}%` }}
          ></div>
        </div>
      </div>

      {step === 1 && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <section>
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs">1</span>
              Datos Personales
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre y Apellido *</label>
                <input name="nombre" value={formData.nombre} onChange={handleInputChange} type="text" className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="Ej: Juan Pérez" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Celular *</label>
                <input name="celular" value={formData.celular} onChange={handleInputChange} type="tel" className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="+54 9..." />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Email (Opcional)</label>
                <input name="email" value={formData.email} onChange={handleInputChange} type="email" className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="usuario@email.com" />
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs">2</span>
              Preferencia Automotriz
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Presupuesto Desde</label>
                <input name="presupuestoDesde" value={formData.presupuestoDesde} onChange={handleInputChange} type="number" className="w-full p-2.5 border border-slate-200 rounded-lg outline-none focus:border-blue-500" placeholder="$ 0" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Presupuesto Hasta</label>
                <input name="presupuestoHasta" value={formData.presupuestoHasta} onChange={handleInputChange} type="number" className="w-full p-2.5 border border-slate-200 rounded-lg outline-none focus:border-blue-500" placeholder="$ 50.000" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Vehículo</label>
                <select name="tipoVehiculo" value={formData.tipoVehiculo} onChange={handleInputChange} className="w-full p-2.5 border border-slate-200 rounded-lg outline-none bg-white">
                  <option value="indistinto">Indistinto</option>
                  <option value="SUV">SUV</option>
                  <option value="sedan">Sedán</option>
                  <option value="hatch">Hatchback</option>
                  <option value="pickup">Pick-up</option>
                  <option value="van">Van</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Prioridad Principal</label>
                <select name="prioridad" value={formData.prioridad} onChange={handleInputChange} className="w-full p-2.5 border border-slate-200 rounded-lg outline-none bg-white">
                  <option value="seguridad">Seguridad</option>
                  <option value="tecnologia">Tecnología</option>
                  <option value="espacio">Espacio</option>
                  <option value="precio">Precio</option>
                  <option value="rendimiento">Rendimiento</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Marcas Preferidas / Excluidas</label>
                <input name="marcas" value={formData.marcas} onChange={handleInputChange} type="text" className="w-full p-2.5 border border-slate-200 rounded-lg outline-none focus:border-blue-500" placeholder="Ej: Prefiero Toyota, excluir marcas chinas" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Notas Adicionales</label>
                <textarea name="notas" value={formData.notas} onChange={handleInputChange} className="w-full p-2.5 border border-slate-200 rounded-lg outline-none focus:border-blue-500 min-h-[80px]" placeholder="Ej: Garage pequeño, deseo Android Auto..." />
              </div>
            </div>
          </section>
        </div>
      )}

      {step > 1 && (
        <div className="py-20 text-center text-slate-400 italic">
          Contenido del Paso {step} en desarrollo...
        </div>
      )}

      {/* Navegación */}
      <div className="mt-10 pt-6 border-t border-slate-100 flex justify-between items-center">
        <button 
          disabled={step === 1}
          onClick={() => setStep(step - 1)}
          className="text-slate-500 font-semibold hover:text-slate-800 disabled:opacity-30 transition-colors"
        >
          ← Volver
        </button>
        <button 
          disabled={step === 1 && !isStep1Valid}
          onClick={() => setStep(step + 1)}
          className={`px-8 py-3 rounded-xl font-bold transition-all shadow-lg ${
            isStep1Valid || step > 1 
            ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200' 
            : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
          }`}
        >
          {step === totalSteps ? 'Finalizar' : 'Continuar'}
        </button>
      </div>
      {step === 1 && !isStep1Valid && (
        <p className="text-center text-xs text-amber-500 mt-4 font-medium animate-pulse">
          * Completa Nombre y Celular para continuar
        </p>
      )}
    </div>
  );
}
