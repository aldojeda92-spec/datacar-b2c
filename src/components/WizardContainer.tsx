'use client';

import { useState } from 'react';

export default function WizardContainer() {
  const [step, setStep] = useState(1);
  const totalSteps = 3;

  return (
    <div className="max-w-2xl mx-auto p-8 bg-white rounded-xl shadow-lg mt-12 border border-gray-100">
      
      {/* Cabecera */}
      <h1 className="text-3xl font-extrabold text-center mb-2 text-slate-800">
        Generador de Dossier Datacar
      </h1>
      <p className="text-center text-slate-500 mb-8">
        Completa los datos para obtener el reporte de tus vehículos
      </p>
      
      {/* Barra de progreso */}
      <div className="mb-8">
        <div className="flex justify-between text-sm font-medium text-slate-400 mb-2">
          <span>Paso {step}</span>
          <span>{totalSteps} Pasos</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2.5">
          <div 
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-in-out" 
            style={{ width: `${(step / totalSteps) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Área dinámica del formulario */}
      <div className="p-8 border-2 border-dashed border-slate-200 rounded-lg text-center bg-slate-50 min-h-[200px] flex items-center justify-center">
        <p className="text-slate-600 font-medium">
          {step === 1 && "Aquí pondremos los campos del Paso 1"}
          {step === 2 && "Aquí pondremos los campos del Paso 2"}
          {step === 3 && "Resumen y botón de Generar PDF"}
        </p>
      </div>

      {/* Botones de navegación */}
      <div className="mt-8 flex justify-between">
        <button 
          disabled={step === 1}
          onClick={() => setStep(step - 1)}
          className="px-6 py-2.5 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Atrás
        </button>
        <button 
          onClick={() => setStep(step < totalSteps ? step + 1 : step)}
          className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          {step === totalSteps ? 'Finalizar' : 'Siguiente'}
        </button>
      </div>

    </div>
  );
}
