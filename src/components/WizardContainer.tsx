'use client';

import { useState } from 'react';
import { saveLeadAction, logComparisonAction } from '@/app/actions';

// ... (Interface IAAuto se mantiene igual)

export default function WizardContainer() {
  const [step, setStep] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showComparison, setShowComparison] = useState(false); // Nuevo: Vista comparador
  const [currentLeadId, setCurrentLeadId] = useState<string>(''); // Nuevo: Guardamos el ID para el B2B
  const [top10, setTop10] = useState<any[]>([]);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    nombre: '', celular: '', email: '', presupuestoMin: 15000, presupuestoMax: 45000,
    atributos: [] as string[], motorizacion: 'Todos', tipoVehiculo: 'SUV',
    origen: 'Todos', concesionaria: 'Todas', notas: ''
  });

  const isReady = formData.nombre && formData.celular && formData.atributos.length === 3;

  const handleExecute = async () => {
    setIsAnalyzing(true);
    try {
      const result = await saveLeadAction(formData);
      if (result.success) {
        setCurrentLeadId(result.leadId); // Guardamos para el B2B
        const res = await fetch('/api/analyze', { 
          method: 'POST', body: JSON.stringify({ leadId: result.leadId }),
          headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        if (data.success) { setTop10(data.top10); setStep(2); window.scrollTo(0, 0); }
      }
    } catch (e) { alert("Error"); } finally { setIsAnalyzing(false); }
  };

  // FUNCIÓN PARA ACTIVAR EL COMPARADOR Y LOGUEAR B2B
  const handleOpenComparison = async () => {
    const selectedAutos = top10.filter(a => compareIds.includes(a.id));
    const nombres = selectedAutos.map(a => `${a.marca} ${a.modelo}`).join(' vs ');
    
    // Guardamos en Neon para el informe B2B
    await logComparisonAction({
      leadId: currentLeadId,
      vIds: compareIds,
      nombres: nombres
    });

    setShowComparison(true);
    window.scrollTo(0, 0);
  };

  if (isAnalyzing) return (/* ... loading igual ... */ <div className="p-20 text-center font-black">GENERANDO DOSSIER...</div>);

  // VISTA DE COMPARACIÓN "CARA A CARA"
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
            <div className="bg-slate-50 p-6 flex flex-col justify-end font-black text-[10px] text-slate-400 uppercase tracking-widest">Especificaciones</div>
            {selected.map(auto => (
              <div key={auto.id} className="p-6 text-center space-y-4 bg-white border-x">
                <img src={auto.urlImagen} className="h-32 object-contain mx-auto" />
                <h3 className="font-black text-[#0A1F33] uppercase text-sm">{auto.marca} <br/> {auto.modelo}</h3>
                <p className="text-[#00BFFF] font-black text-xl">${auto.precioUsd.toLocaleString()}</p>
              </div>
            ))}
          </div>

          {/* FILAS TÉCNICAS */}
          {[
            { label: 'Seguridad / ADAS', key: 'adas' },
            { label: 'Airbags', key: 'airbags' },
            { label: 'Motorización', key: 'combustible' },
            { label: 'Transmisión', key: 'transmision' },
            { label: 'Baulera (Litros)', key: 'bauleraLitros' },
            { label: 'Garantía', key: 'garantia' },
            { label: 'Origen Marca', key: 'origenMarca' }
          ].map((item, idx) => (
            <div key={idx} className={`grid grid-cols-4 gap-1 ${idx % 2 === 0 ? 'bg-slate-50/50' : 'bg-white'}`}>
              <div className="p-6 font-black text-[9px] uppercase text-slate-500 flex items-center">{item.label}</div>
              {selected.map(auto => (
                <div key={auto.id} className="p-6 text-center text-xs font-bold text-[#0A1F33] flex items-center justify-center border-x">
                  {auto[item.key] || '–'}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // VISTA NORMAL DEL RANKING (Ajustada para activar el comparador)
  return (
    <div className={`min-h-screen font-inter ${step === 2 ? 'bg-[#F8FAFC]' : 'bg-white'}`}>
      {/* ... Header igual ... */}
      
      {step === 1 && (/* ... Step 1 igual con el Slider Dual ... */ <div className="p-10">Step 1 Form... (mismo código anterior)</div>)}

      {step === 2 && (
        <div className="max-w-[1700px] mx-auto p-10 pb-40 space-y-12">
          {/* Resumen de personalización igual... */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-10">
            {top10.map((auto, idx) => (
               <div key={auto.id} className="bg-white border p-6">
                  {/* ... Tarjeta igual ... */}
                  <button onClick={() => setCompareIds(prev => prev.includes(auto.id) ? prev.filter(i => i !== auto.id) : [...prev].slice(-2).concat(auto.id))} 
                          className={`p-2 text-[8px] font-black ${compareIds.includes(auto.id) ? 'bg-[#00BFFF] text-white' : 'bg-slate-100 text-slate-400'}`}>
                    {compareIds.includes(auto.id) ? 'SELECCIONADO' : '+ COMPARAR'}
                  </button>
               </div>
            ))}
          </div>

          {/* DOCK COMPARADOR CON FUNCIÓN handleOpenComparison */}
          {compareIds.length > 0 && (
            <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-50 bg-[#0A1F33] text-white p-8 shadow-2xl flex items-center gap-16 border-t-4 border-[#00BFFF] rounded-sm">
               <div><p className="text-[9px] font-black text-[#00BFFF] uppercase tracking-[4px]">Comparador B2B</p><p className="text-sm font-bold uppercase">{compareIds.length} Seleccionados</p></div>
               <div className="flex gap-4">
                  {compareIds.length >= 2 ? (
                    <button onClick={handleOpenComparison} className="bg-[#00BFFF] text-[#0A1F33] px-10 py-4 font-black text-[11px] uppercase tracking-[2px] hover:bg-white transition-all">Comparar Datos Duros</button>
                  ) : (
                    <p className="text-[10px] text-slate-500">Selecciona al menos 2...</p>
                  )}
               </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
