'use client';

import { useState, useRef, useEffect } from 'react';
import { saveLeadAction, logComparisonAction } from '@/app/actions';

interface IAAuto {
  id: string; 
  puesto: number; 
  match_percent: number; 
  marca: string; 
  modelo: string;
  version: string; 
  precioUsd: number; 
  origenMarca: string; 
  combustible: string;
  urlImagen?: string; 
  motor?: string; 
  traccion?: string; 
  transmision?: string;
  bauleraLitros?: number; 
  garantia?: string;
  adas?: string;
  airbags?: string;
  tamanhoPantalla?: string;
  camaras?: string;
  plazas?: number;
  largo?: number;
  ancho?: number;
  alto?: number;
  despejeSuelo?: number;
  asientoCuero?: string;
  techoPanoramico?: string;
  conectividad?: string;
  concesionaria?: string;
  veredicto: string; 
  versiones: any[];
  // CAMPO PROMOCIONAL
  subsegmento?: string; 
}

const PEDIR_DATOS_USUARIO = false; 

export default function WizardContainer() {
  const [step, setStep] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [currentLeadId, setCurrentLeadId] = useState<string>('');
  const [top10, setTop10] = useState<IAAuto[]>([]);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [openFilter, setOpenFilter] = useState<string | null>(null);
  
  const [activeVersions, setActiveVersions] = useState<Record<string, IAAuto>>({});
  const [esRescate, setEsRescate] = useState(false);

  // Estados del Buscador
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<IAAuto[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [manualSelections, setManualSelections] = useState<IAAuto[]>([]);

  // Estado del Modal de Captura de Leads
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [isSavingLead, setIsSavingLead] = useState(false);

  const [formData, setFormData] = useState({
    nombre: PEDIR_DATOS_USUARIO ? '' : 'Invitado', 
    celular: PEDIR_DATOS_USUARIO ? '' : '0999999999', 
    email: '', 
    presupuestoMin: 8000, 
    presupuestoMax: 50000,
    atributos: [] as string[], 
    motorizacion: [] as string[], 
    tipoVehiculo: [] as string[],
    origen: [] as string[], 
    concesionaria: [] as string[], 
    notas: ''
  });

  const isCelularValid = formData.celular.startsWith('09') && formData.celular.length === 10;
  
  const isReady = PEDIR_DATOS_USUARIO
    ? formData.nombre && isCelularValid && formData.atributos.length === 3
    : formData.atributos.length === 3; 
  
  const toggleArrayItem = (key: 'motorizacion' | 'tipoVehiculo' | 'origen' | 'concesionaria', value: string) => {
    setFormData(prev => {
      const current = prev[key] as string[];
      const exists = current.includes(value);
      return {
        ...prev,
        [key]: exists ? current.filter(i => i !== value) : [...current, value]
      };
    });
  };

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
      if (result.success && result.leadId) {
        setCurrentLeadId(result.leadId);
        localStorage.setItem('datacar_lead_id', result.leadId);
        const res = await fetch('/api/analyze', { 
          method: 'POST', body: JSON.stringify({ leadId: result.leadId }),
          headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        if (data.success) { 
          setTop10(data.top10); 
          setEsRescate(data.esRescate || false); 
          setStep(2); 
          window.scrollTo(0, 0); 
        }
      }
    } catch (e) { alert("Error de conexión"); } finally { setIsAnalyzing(false); }
  };

  const handleOpenComparison = async () => {
    const selected = displayedAutos.filter(a => compareIds.includes(a.id));
    const nombres = selected.map(a => `${a.marca} ${a.modelo}`).join(' vs ');
    const leadIdToUse = currentLeadId || localStorage.getItem('datacar_lead_id');
    if (leadIdToUse && compareIds.length >= 2) {
      await logComparisonAction({ leadId: leadIdToUse, vIds: compareIds, nombres: nombres });
    }
    setShowComparison(true);
    window.scrollTo(0, 0);
  };

  const handlePrintRequest = () => {
    if (formData.nombre === 'Invitado') {
      setShowLeadModal(true);
    } else {
      setTimeout(() => window.print(), 100);
    }
  };

  const handleUnlockDossier = async () => {
    setIsSavingLead(true);
    try {
      await saveLeadAction(formData); 
      setShowLeadModal(false);
      setTimeout(() => window.print(), 300);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSavingLead(false);
    }
  };

  useEffect(() => {
    if (searchTerm.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const delayFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/search-autos?q=${encodeURIComponent(searchTerm)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.autos || []);
        }
      } catch (e) {
        console.error("Error al buscar autos", e);
      } finally {
        setIsSearching(false);
      }
    }, 400); 
    return () => clearTimeout(delayFn);
  }, [searchTerm]);

  // ============================================================================
  // LOGICA CRO: FILTRO Y EXTRACCIÓN DE AD SLOTS (MÁXIMO 3)
  // ============================================================================
  const getPromocionValida = (valor?: string) => {
    if (!valor) return null;
    const cleanValue = valor.trim().toLowerCase();
    if (cleanValue === "" || cleanValue === "0" || cleanValue === "n/a" || cleanValue === "null" || cleanValue === "none") {
      return null;
    }
    return valor.trim();
  };

  const uniqueAutos = [...manualSelections, ...top10].filter((auto, index, self) =>
    index === self.findIndex((a) => a.id === auto.id)
  );

  // Extraemos todos los autos que califican para promoción
  const allPromotedAutos = uniqueAutos.filter(auto => {
    const currentAuto = activeVersions[auto.id] || auto;
    return getPromocionValida(currentAuto.subsegmento) !== null;
  });

  // Limitamos a un máximo de 3 Ad Slots para mantener el balance orgánico
  const top3Promoted = allPromotedAutos.slice(0, 3);
  const top3Ids = new Set(top3Promoted.map(a => a.id));

  // El resto de los vehículos (orgánicos + cualquier promocionado excedente)
  const remainingAutos = uniqueAutos.filter(auto => !top3Ids.has(auto.id));

  // Unificamos: Los Ad Slots primero, seguidos del contenido orgánico normal
  const displayedAutos = [...top3Promoted, ...remainingAutos];
  // ============================================================================

  const MultiSelect = ({ label, items, value, storeKey }: { label: string, items: string[], value: string[], storeKey: any }) => (
    <div className="space-y-1 relative">
      <label className="text-[9px] font-black uppercase text-slate-400">{label}</label>
      <div 
        onClick={() => setOpenFilter(openFilter === label ? null : label)}
        className="w-full p-3 bg-slate-50 border-b-2 text-sm cursor-pointer flex justify-between items-center border-slate-100 hover:border-[#0A1F33] transition-all"
      >
        <span className="truncate pr-4 font-medium text-[#0A1F33]">
          {value.length > 0 ? value.join(', ') : 'Todos / Cualquier'}
        </span>
        <span className="text-[#00BFFF] text-[10px]">{openFilter === label ? '▲' : '▼'}</span>
      </div>
      {openFilter === label && (
        <div className="absolute z-50 w-full bg-white border shadow-2xl max-h-60 overflow-y-auto p-2 animate-in fade-in zoom-in duration-200">
          {items.map(item => (
            <label key={item} className="flex items-center gap-3 p-3 hover:bg-slate-50 cursor-pointer rounded transition-colors">
              <input 
                type="checkbox" 
                checked={value.includes(item)} 
                onChange={() => toggleArrayItem(storeKey, item)}
                className="w-4 h-4 accent-[#00BFFF] rounded border-slate-300"
              />
              <span className="text-xs font-bold text-[#0A1F33] uppercase">{item}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );

  if (isAnalyzing) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white font-inter">
      <div className="w-12 h-12 border-4 border-[#0A1F33] border-t-[#00BFFF] rounded-full animate-spin mb-6"></div>
      <p className="font-montserrat font-black text-xs uppercase tracking-[6px] text-[#0A1F33]">Generando Dossier Estratégico...</p>
    </div>
  );

  if (showComparison) {
    const selected = displayedAutos.filter(a => compareIds.includes(a.id));
    const autoRecomendado = selected.length > 0 ? (activeVersions[selected[0].id] || selected[0]) : null;
    const opcionesExtra = top10.filter(a => !compareIds.includes(a.id)).slice(0, 3); 

    return (
      <div className="font-inter">
        
        {/* MODAL DE LEAD MAGNET */}
        {showLeadModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A1F33]/90 p-4 animate-in fade-in duration-300 print:hidden">
            <div className="bg-white max-w-md w-full p-8 shadow-2xl relative">
              <button onClick={() => setShowLeadModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-[#0A1F33]">✕</button>
              
              <div className="text-center mb-6">
                <h3 className="font-montserrat font-black text-xl text-[#0A1F33] uppercase leading-tight mb-2">
                  Desbloquea tu <span className="text-[#00BFFF]">Dossier VIP</span>
                </h3>
                <p className="text-xs text-slate-500 font-medium">Ingresa tus datos para generar el PDF con tu nombre y recibir asesoría personalizada sobre estos modelos.</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400">Nombre Completo</label>
                  <input 
                    value={formData.nombre === 'Invitado' ? '' : formData.nombre} 
                    onChange={e => setFormData({...formData, nombre: e.target.value})} 
                    className="w-full p-3 border-2 border-slate-100 bg-slate-50 outline-none focus:border-[#00BFFF] text-sm font-bold text-[#0A1F33]" 
                    placeholder="Ej: Juan Pérez"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400">WhatsApp (Para enviar el PDF)</label>
                  <input 
                    type="tel"
                    value={formData.celular === '0999999999' ? '' : formData.celular} 
                    onChange={e => {
                      const soloNumeros = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setFormData({...formData, celular: soloNumeros});
                    }} 
                    className="w-full p-3 border-2 border-slate-100 bg-slate-50 outline-none focus:border-[#00BFFF] text-sm font-bold text-[#0A1F33]" 
                    placeholder="09..."
                  />
                </div>
                
                <button 
                  disabled={formData.nombre.length < 2 || !isCelularValid || isSavingLead}
                  onClick={handleUnlockDossier} 
                  className="w-full mt-4 py-4 bg-[#0A1F33] text-white font-black text-[10px] uppercase tracking-widest hover:bg-[#00BFFF] transition-all disabled:opacity-30 flex items-center justify-center gap-2"
                >
                  {isSavingLead ? 'Generando...' : 'Generar PDF Corporativo'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* === VISTA INTERACTIVA WEB === */}
        <div className="min-h-screen bg-white p-2 md:p-6 animate-in fade-in duration-500 print:hidden">
          <div className="max-w-7xl mx-auto space-y-4">
            
            <div className="flex flex-row justify-between items-center gap-4 border-b-2 border-[#0A1F33] pb-2">
              <h2 className="text-xl md:text-2xl font-montserrat font-black text-[#0A1F33] uppercase leading-none">
                Comparativa <span className="text-[#00BFFF]">Datos Duros</span>
              </h2>
              <div className="flex gap-2">
                <button 
                  onClick={handlePrintRequest} 
                  className="bg-slate-100 text-[#0A1F33] border border-slate-200 px-4 py-2 font-black text-[9px] uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center gap-2"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  Guardar PDF
                </button>
                <button onClick={() => setShowComparison(false)} className="bg-[#0A1F33] text-white px-4 py-2 font-black text-[9px] uppercase tracking-widest hover:bg-[#00BFFF] transition-all">
                  ← Volver
                </button>
              </div>
            </div>
            
            <div className="w-full overflow-auto max-h-[85vh] border-b-2 border-slate-200 shadow-inner rounded-lg relative">
              <div className="min-w-[900px]">
                <div className="grid grid-cols-4 gap-1 sticky top-0 z-50 bg-white shadow-md border-b-2 border-slate-200">
                  <div className="bg-slate-50 p-2 flex flex-col justify-end font-black text-[9px] text-slate-400 uppercase tracking-widest">
                    Especificaciones
                  </div>
                  {selected.map(auto => {
                     const currentAuto = activeVersions[auto.id] || auto;
                     const promoValida = getPromocionValida(currentAuto.subsegmento);

                     return (
                      <div key={auto.id} className="p-2 text-center space-y-1.5 bg-white border-x flex flex-col justify-between relative">
                        {/* INYECCIÓN CRO: BADGE DE PROMOCIÓN */}
                        {promoValida && (
                          <div className="absolute top-2 left-0 right-0 z-10 flex justify-center">
                            <span className="bg-[#00BFFF] text-[#0A1F33] font-black text-[8px] uppercase px-2 py-0.5 rounded shadow-sm">
                              {promoValida}
                            </span>
                          </div>
                        )}
                        <div className="h-12 flex items-center justify-center mt-2"> 
                          <img src={currentAuto.urlImagen} className="max-h-full object-contain mx-auto" alt={currentAuto.modelo} />
                        </div>
                        <div className="leading-tight">
                          <h3 className="font-black text-[#0A1F33] uppercase text-[10px]">{currentAuto.marca} {currentAuto.modelo}</h3>
                          <p className="text-[#00BFFF] font-black text-xs">${currentAuto.precioUsd.toLocaleString()}</p>
                        </div>
                        <a href={`https://wa.me/595991244469?text=Me interesa el ${currentAuto.marca} ${currentAuto.modelo} del comparador Datacar.`} target="_blank" className="block w-full py-1 bg-[#0A1F33] text-white text-center font-black text-[8px] uppercase tracking-widest hover:bg-[#00BFFF] transition-all">
                          Quiero Comprar
                        </a>
                      </div>
                     );
                  })}
                </div>

                {[
                  { label: 'Versión', key: 'version' },
                  { label: 'Motorización', key: 'motor' },
                  { label: 'Combustible', key: 'combustible' },
                  { label: 'Transmisión', key: 'transmision' },
                  { label: 'Tracción', key: 'traccion' },
                  { label: 'Seguridad (ADAS)', key: 'adas' },
                  { label: 'Airbags', key: 'airbags' },
                  { label: 'Dimensiones', key: 'dimensiones' },
                  { label: 'Despeje del Suelo', key: 'bauleraLitros' }, // Mantenido tal cual lo tenias, aunque parece error tipográfico tuyo previo
                  { label: 'Baulera (Litros)', key: 'bauleraLitros' },
                  { label: 'Capacidad Plazas', key: 'plazas' },
                  { label: 'Infoentretenimiento', key: 'tamanhoPantalla' },
                  { label: 'Conectividad', key: 'conectividad' },
                  { label: 'Sistema de Cámaras', key: 'camaras' },
                  { label: 'Tapizado en cuero', key: 'asientoCuero' },
                  { label: 'Techo / Sunroof', key: 'techoPanoramico' },
                  { label: 'Garantía oficial', key: 'garantia' },
                  { label: 'Origen de Marca', key: 'origenMarca' }
                ].map((item, idx) => (
                  <div key={idx} className={`grid grid-cols-4 gap-1 ${idx % 2 === 0 ? 'bg-slate-50/50' : 'bg-white'}`}>
                    <div className="p-3 font-black text-[9px] uppercase text-slate-500 flex items-center">{item.label}</div>
                    {selected.map(auto => {
                      const currentAuto = activeVersions[auto.id] || auto;
                      let valor = (currentAuto as any)[item.key];
                      if (item.key === 'dimensiones') {
                        valor = (currentAuto.largo && currentAuto.ancho) ? `${currentAuto.largo}x${currentAuto.ancho}x${currentAuto.alto || ''} mm` : null;
                      } else if (item.key === 'despejeSuelo') {
                        valor = currentAuto.despejeSuelo ? `${currentAuto.despejeSuelo} mm` : null;
                      }
                      const linkWhatsApp = `https://wa.me/595991244469?text=Hola, quiero consultar el dato de *${item.label}* para el vehículo *${currentAuto.marca} ${currentAuto.modelo}* que vi en Datacar.`;

                      return (
                        <div key={auto.id} className="p-3 text-center text-[10px] font-bold text-[#0A1F33] flex items-center justify-center border-x">
                          {valor && valor !== '–' && String(valor).trim() !== '' ? valor : (
                            <a href={linkWhatsApp} target="_blank" rel="noopener noreferrer" className="text-[8px] px-2 py-1.5 bg-[#0A1F33] text-white rounded font-black uppercase tracking-widest hover:bg-[#00BFFF] transition-colors">
                              Consultar Dato
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* === VISTA DEL DOSSIER PDF === */}
        {autoRecomendado && (
          <div className="hidden print:block w-full bg-white px-8 py-4 font-inter text-slate-800">
            
            {/* CABECERA: Aplicación Estricta de Manual de Marca */}
            <header className="border-b-2 border-[#0A1F33] pb-4 mb-6 flex justify-between items-end">
              <div>
                <h1 className="text-3xl font-montserrat font-black uppercase tracking-tighter text-[#0A1F33]">
                  DATA<span className="font-light text-[#3A3A3C] tracking-normal">CAR</span>
                </h1>
                <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mt-1">Consultoría Automotriz · Paraguay</p>
              </div>
              <div className="text-right">
                <h2 className="text-lg font-montserrat font-black uppercase text-[#0A1F33]">Dossier Estratégico</h2>
                <p className="text-[10px] font-bold text-slate-500">Generado para: {formData.nombre !== 'Invitado' ? formData.nombre : 'Cliente VIP'}</p>
              </div>
            </header>

            {/* RECOMENDACIÓN PRINCIPAL */}
            <section className="bg-slate-50 p-4 mb-6 border-l-4 border-[#0A1F33] break-inside-avoid relative">
              {/* INYECCIÓN CRO EN PDF: BADGE DE PROMOCIÓN */}
              {getPromocionValida(autoRecomendado.subsegmento) && (
                 <div className="absolute -top-3 right-4 bg-[#0A1F33] text-[#00BFFF] font-black text-[9px] uppercase px-3 py-1 shadow-sm border-b-2 border-[#00BFFF]">
                   {getPromocionValida(autoRecomendado.subsegmento)}
                 </div>
              )}
              <div className="flex items-start gap-4 mt-2">
                <div className="flex-1">
                  <h3 className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">⭐ Selección a Medida</h3>
                  <h4 className="text-xl font-montserrat font-black uppercase leading-none mb-1 text-[#0A1F33]">
                    {autoRecomendado.marca} {autoRecomendado.modelo} <span className="font-medium text-slate-500 text-sm">{autoRecomendado.version}</span>
                  </h4>
                  <p className="text-[10px] text-[#3A3A3C] font-medium leading-relaxed italic pr-4">
                    "{autoRecomendado.veredicto || "Análisis a Demanda: Vehículo seleccionado para contrastar métricas técnicas frente a las opciones del mercado."}"
                  </p>
                </div>
                <div className="w-24 h-24 bg-white border border-slate-200 flex items-center justify-center p-1 flex-shrink-0">
                  <img src={autoRecomendado.urlImagen} alt={autoRecomendado.modelo} className="max-w-full max-h-full object-contain" />
                </div>
              </div>
            </section>

            {/* GRILLA COMPRIMIDA PARA A4 */}
            <section className="mb-6">
              <h3 className="text-xs font-montserrat font-black uppercase tracking-widest text-[#0A1F33] border-b border-slate-200 pb-1 mb-3">Matriz de Datos Duros</h3>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-[8px] uppercase tracking-widest text-slate-500">
                    <th className="p-2 font-black border border-slate-200 w-1/4">Especificación</th>
                    {selected.map(auto => (
                      <th key={auto.id} className="p-2 font-black border border-slate-200 text-center text-[#0A1F33]">{auto.marca} {auto.modelo}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="font-medium text-[9px] text-[#3A3A3C]">
                  {[
                    { label: 'Precio USD', key: 'precioUsd', isPrice: true },
                    { label: 'Versión', key: 'version' },
                    { label: 'Motor', key: 'motor' },
                    { label: 'Consumo/Eficiencia', key: 'combustible' },
                    { label: 'Baulera', key: 'bauleraLitros' },
                    { label: 'Garantía', key: 'garantia' },
                    { label: 'Seguridad (ADAS)', key: 'adas' },
                    { label: 'Origen Marca', key: 'origenMarca' },
                  ].map((item, idx) => (
                    <tr key={idx} className="border-b border-slate-200 break-inside-avoid">
                      <td className="p-1.5 bg-slate-50 font-black text-[8px] uppercase text-slate-500 border border-slate-200">{item.label}</td>
                      {selected.map(auto => {
                        const currentAuto = activeVersions[auto.id] || auto;
                        let valor = (currentAuto as any)[item.key];
                        if (item.key === 'bauleraLitros' && valor) valor = `${valor} Litros`;
                        if (item.isPrice && valor) valor = `$${valor.toLocaleString()}`;
                        
                        return (
                          <td key={auto.id} className={`p-1.5 border border-slate-200 text-center ${item.isPrice ? 'font-black text-[#0A1F33] text-[10px]' : ''}`}>
                            {valor || 'Consultar'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            {/* OPCIONES EXTRA */}
            {opcionesExtra.length > 0 && (
              <section className="mb-6 break-inside-avoid">
                <h3 className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-2">Otras opciones que cumplen tu perfil:</h3>
                <div className="grid grid-cols-2 gap-2">
                  {opcionesExtra.map(auto => (
                    <div key={auto.id} className="p-2 border border-slate-200 bg-white flex items-center gap-3">
                      <img src={auto.urlImagen} className="w-12 h-10 object-contain" alt={auto.modelo} />
                      <div className="flex-1">
                        <h4 className="font-black text-[10px] uppercase text-[#0A1F33] leading-none">{auto.marca} <span className="font-medium text-[9px] text-slate-500">{auto.modelo}</span></h4>
                        <p className="text-[9px] font-black text-[#0A1F33] mt-0.5 mb-1">${auto.precioUsd?.toLocaleString()}</p>
                        
                        <div className="flex flex-wrap gap-1">
                          {auto.motor && <span className="px-1 py-0.5 bg-slate-100 text-[6px] font-bold text-slate-500 uppercase rounded-sm">{auto.motor.slice(0, 15)}</span>}
                          {auto.bauleraLitros && <span className="px-1 py-0.5 bg-slate-100 text-[6px] font-bold text-slate-500 uppercase rounded-sm">{auto.bauleraLitros}L</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* FOOTER CORPORATIVO */}
            <footer className="bg-slate-50 p-4 border-t-2 border-[#0A1F33] break-inside-avoid mt-auto">
              <div className="flex items-center justify-between">
                <div className="max-w-[75%]">
                  <h3 className="text-sm font-montserrat font-black uppercase text-[#0A1F33] mb-1">
                    ☕ ¿Tomamos un café y lo definimos?
                  </h3>
                  <p className="text-[9px] text-[#3A3A3C] font-medium leading-tight pr-4">
                    Un asesor experto de DATACAR te invita a revisar este reporte y evaluar la mejor estrategia financiera para tu inversión. Es gratis y sin compromiso.
                  </p>
                </div>
                <div className="text-right border-l-2 border-slate-200 pl-4">
                  <p className="text-[7px] font-black uppercase tracking-widest text-slate-400 mb-1">Contacto Directo</p>
                  <p className="text-sm font-black text-[#0A1F33] leading-none">0991 244 469</p>
                  <p className="text-[8px] font-bold text-slate-500 mt-1">datacarpy.com</p>
                </div>
              </div>
            </footer>
          </div>
        )}
      </div>
    );
  }

  // ============================================================================
  // FLUJO NORMAL WEB (Step 1 y Step 2)
  // ============================================================================
  return (
    <div className={`min-h-screen font-inter ${step === 2 ? 'bg-[#F8FAFC]' : 'bg-white'}`}>
      
      {/* HEADER WEB CORREGIDO */}
      <div className="max-w-[1600px] mx-auto p-10 flex justify-between items-center">
        <h1 className="text-3xl font-montserrat font-black text-[#0A1F33] uppercase">
          DATA<span className="font-light text-[#3A3A3C] tracking-normal">CAR</span>
        </h1>
        {step === 2 && <button onClick={() => setStep(1)} className="text-[10px] font-black uppercase border-b-2 border-[#00BFFF] pb-1 text-slate-500 hover:text-[#0A1F33] transition-colors">← Re-ajustar Búsqueda</button>}
      </div>

      {step === 1 && (
        <div className="max-w-4xl mx-auto p-12 animate-in fade-in duration-700">
          <div className="bg-white border border-slate-100 p-6 md:p-12 shadow-2xl space-y-8 md:space-y-12">
            
            {PEDIR_DATOS_USUARIO && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400">Nombre *</label>
                  <input value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} className="w-full p-3 border-b-2 bg-slate-50 outline-none focus:border-[#0A1F33] text-sm font-medium" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400">WhatsApp *</label>
                  <input 
                    type="tel"
                    placeholder="Ej: 0981234567"
                    value={formData.celular} 
                    onChange={e => {
                      const soloNumeros = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setFormData({...formData, celular: soloNumeros});
                    }} 
                    className={`w-full p-3 border-b-2 bg-slate-50 outline-none text-sm font-medium transition-colors ${formData.celular.length > 0 && !isCelularValid ? 'border-red-400 focus:border-red-500 text-red-600' : 'focus:border-[#0A1F33]'}`} 
                  />
                  {formData.celular.length > 0 && !isCelularValid && (
                    <p className="text-[9px] font-bold text-red-500">Debe ser un número de celular válido.</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400">Email</label>
                  <input value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full p-3 border-b-2 bg-slate-50 outline-none focus:border-[#0A1F33] text-sm font-medium" />
                </div>
              </div>
            )}

            <div className="space-y-10">
              <div className="flex justify-between items-center">
                <label className="text-[9px] font-black uppercase text-slate-400">Presupuesto (USD)</label>
                <div className="flex gap-4 font-black text-[#0A1F33] text-sm tracking-tighter bg-slate-50 px-4 py-2 rounded-full">
                  <span>${formData.presupuestoMin.toLocaleString()}</span> — <span>${formData.presupuestoMax.toLocaleString()}</span>
                </div>
              </div>
              <div className="relative w-full h-1 bg-slate-100 rounded-full">
                {/* Matemáticas ajustadas para que el input arranque en 8000 en vez de 0 */}
                <div className="absolute h-full bg-[#00BFFF] rounded-full" style={{ left: `${((formData.presupuestoMin - 8000) / 192000) * 100}%`, right: `${100 - (((formData.presupuestoMax - 8000) / 192000) * 100)}%` }} />
                <input type="range" min="8000" max="200000" step="1000" value={formData.presupuestoMin} onChange={handleMinChange} className="absolute w-full -top-1 h-2 appearance-none bg-transparent pointer-events-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-[#0A1F33] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white" />
                <input type="range" min="8000" max="200000" step="1000" value={formData.presupuestoMax} onChange={handleMaxChange} className="absolute w-full -top-1 h-2 appearance-none bg-transparent pointer-events-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-[#00BFFF] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white" />
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[9px] font-black uppercase text-slate-400">Atributos que buscás en tu próximo 0km (Seleccionar 3) *</label>
              <div className="flex flex-wrap gap-2">
                {['Seguridad', 'Tecnología', 'Espacio', 'Precio', 'Eficiencia'].map(at => (
                  <button key={at} onClick={() => toggleAtributo(at)} className={`px-6 py-2 text-[10px] font-black border-2 transition-all ${formData.atributos.includes(at) ? 'bg-[#0A1F33] text-white border-[#0A1F33]' : 'text-slate-300 border-slate-100 hover:border-slate-200'}`}>{at}</button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <MultiSelect label="Motorización" items={['PHEV', 'HEV', 'EV', 'Diesel', 'Flex', 'Nafta']} value={formData.motorizacion} storeKey="motorizacion" />
              <MultiSelect label="Tipo de Vehículo" items={['SUV', 'Sedan', 'Hatchback', 'Pickup']} value={formData.tipoVehiculo} storeKey="tipoVehiculo" />
              <MultiSelect label="Origen de Marca" items={['Solo Coreanos', 'Solo Japoneses', 'Solo Europeos', 'Solo Chinos']} value={formData.origen} storeKey="origen" />
              <MultiSelect label="Concesionaria" items={['Garden', 'Automotor', 'Santa Rosa', 'Chacomer', 'Toyotoshi', 'Condor', 'Gorostiaga', 'Automaq', 'De La Sobera', 'Vicar', 'Tape Ruvicha', 'Diesa']} value={formData.concesionaria} storeKey="concesionaria" />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-slate-400">Notas Adicionales</label>
              <textarea value={formData.notas} onChange={e => setFormData({...formData, notas: e.target.value})} placeholder="Ej: Busco que tenga buen valor de reventa..." className="w-full p-4 bg-slate-50 border-b-2 text-sm min-h-[100px] outline-none font-medium" />
            </div>

            <button disabled={!isReady} onClick={handleExecute} className="w-full py-6 bg-[#0A1F33] text-white font-montserrat font-black text-xs uppercase tracking-[5px] hover:bg-[#00BFFF] transition-colors disabled:opacity-20 shadow-xl">Generar Análisis Estratégico →</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="max-w-[1700px] mx-auto p-10 pb-40 animate-in fade-in duration-1000 space-y-12">
          
          <div className="bg-[#0A1F33] p-12 text-white border-l-8 border-[#00BFFF] shadow-2xl">
            <h2 className="font-montserrat font-black text-2xl uppercase tracking-tighter">
              {PEDIR_DATOS_USUARIO && formData.nombre !== 'Invitado' 
                ? `${formData.nombre.split(' ')[0]}, busca un auto con ${formData.atributos.join(', ')}.` 
                : `Buscás un auto con ${formData.atributos.join(', ')}.`}
            </h2>
            <p className="mt-4 text-slate-400 font-medium text-sm uppercase tracking-widest underline decoration-[#00BFFF] underline-offset-8">
              Inversión: ${formData.presupuestoMin.toLocaleString()} – ${formData.presupuestoMax.toLocaleString()} | 
              Origen: {formData.origen.length > 0 ? formData.origen.join(', ') : 'Todos'} | 
              Motor: {formData.motorizacion.length > 0 ? formData.motorizacion.join(', ') : 'Cualquiera'}
            </p>
          </div>

          {esRescate && (
            <div className="w-full bg-orange-100 border-l-4 border-orange-500 p-6 rounded-r-lg shadow-sm">
              <h3 className="text-orange-800 font-montserrat font-black text-sm uppercase tracking-widest">⚠️ El auto que buscas no lo encontramos</h3>
              <p className="text-orange-700 text-xs mt-1 font-medium">Pero estas opciones te podrían interesar según tu presupuesto y carrocería:</p>
            </div>
          )}

          <div className="relative z-30">
            <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">
              ¿Falta algún modelo? Buscalo y agregalo a la comparativa:
            </label>
            <input
              type="text"
              placeholder="Ej: Toyota Corolla, Kia Sportage..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-4 border-2 border-slate-100 bg-white outline-none focus:border-[#00BFFF] text-sm font-bold text-[#0A1F33] transition-colors shadow-sm"
            />
            {searchTerm.length >= 2 && (
              <div className="absolute top-full left-0 w-full bg-white border-2 border-slate-100 shadow-2xl mt-1 max-h-60 overflow-y-auto z-50">
                {isSearching ? (
                  <div className="p-4 text-xs font-bold text-slate-400 uppercase text-center animate-pulse">Buscando en el catálogo...</div>
                ) : searchResults.length > 0 ? (
                  searchResults.map(auto => (
                    <div 
                      key={auto.id} 
                      onClick={() => {
                        if (!manualSelections.find(a => a.id === auto.id) && !top10.find(a => a.id === auto.id)) {
                          setManualSelections(prev => [auto, ...prev]);
                        }
                        if (!compareIds.includes(auto.id) && compareIds.length < 3) {
                          setCompareIds(prev => [...prev, auto.id]);
                        } else if (!compareIds.includes(auto.id)) {
                          alert("Solo puedes comparar hasta 3 vehículos a la vez. Deselecciona uno de la grilla primero.");
                        }
                        setSearchTerm('');
                        setSearchResults([]);
                      }}
                      className="p-4 border-b border-slate-50 hover:bg-slate-50 cursor-pointer flex justify-between items-center transition-colors"
                    >
                      <div>
                        <span className="font-black text-[#0A1F33] uppercase">{auto.marca} {auto.modelo}</span>
                        <span className="text-[10px] text-slate-400 ml-2 font-bold">{auto.version}</span>
                      </div>
                      <span className="text-[#00BFFF] font-black text-xs">${auto.precioUsd?.toLocaleString()}</span>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-xs font-bold text-slate-400 uppercase text-center">No se encontraron resultados para "{searchTerm}"</div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-10">
            {displayedAutos.map((auto, idx) => {
              const currentAuto = activeVersions[auto.id] || auto;
              const promoValida = getPromocionValida(currentAuto.subsegmento);
              const isVIP = top3Ids.has(auto.id);

              return (
                <div key={auto.id} className={`flex flex-col transition-all relative overflow-hidden ${isVIP ? 'bg-gradient-to-b from-slate-100 to-white border-2 border-[#0A1F33] shadow-md' : 'bg-white border border-slate-100 shadow-sm'} ${compareIds.includes(auto.id) ? 'ring-4 ring-[#00BFFF]/20' : ''}`}>
                  
                  {/* HEADER VIP O ESPACIADOR FANTASMA PARA ALINEACIÓN PERFECTA */}
                  {isVIP && promoValida ? (
                    <div className="bg-[#0A1F33] w-full px-4 py-2.5 flex flex-col items-center justify-center relative z-20 border-b-2 border-[#00BFFF]">
                      <span className="text-slate-400 text-[6px] font-black uppercase tracking-[0.2em] mb-0.5">Sugerencia Patrocinada</span>
                      <span className="text-[#00BFFF] text-[10px] font-black uppercase tracking-widest text-center">{promoValida}</span>
                    </div>
                  ) : (
                    <div className="w-full px-4 py-2.5 flex flex-col items-center justify-center relative z-20 border-b-2 border-transparent invisible pointer-events-none">
                      <span className="text-[6px] mb-0.5">Spacer</span>
                      <span className="text-[10px]">Spacer</span>
                    </div>
                  )}

                  <div className="relative h-56 bg-slate-50 overflow-hidden border-b border-slate-100">
                    
                    {/* ETIQUETA DE PUESTO (Movida dentro de la imagen para respetar el header corporativo) */}
                    {auto.puesto ? (
                      <div className="absolute top-0 left-0 w-10 h-10 bg-[#0A1F33] text-white flex items-center justify-center font-black z-20 shadow-md">{auto.puesto}</div>
                    ) : (
                      <div className="absolute top-0 left-0 w-10 h-10 bg-[#0A1F33] text-white flex items-center justify-center font-black z-20 shadow-md text-lg">+</div>
                    )}

                    <img src={currentAuto.urlImagen} className="w-full h-full object-cover" alt={currentAuto.modelo} />
                    <button onClick={() => toggleCompare(auto.id)} className={`absolute top-4 right-4 px-3 py-1 text-[8px] font-black border transition-colors z-30 ${compareIds.includes(auto.id) ? 'bg-[#00BFFF] text-white border-[#00BFFF]' : 'bg-white/90 text-slate-500 border-slate-200 hover:text-[#0A1F33]'}`}>
                      {compareIds.includes(auto.id) ? '✓ SELECCIONADO' : '+ COMPARAR'}
                    </button>
                  </div>

                  <div className="px-10 -mt-6 mb-2 relative z-10">
                    <div className="bg-white border border-slate-100 border-l-4 border-l-[#00BFFF] p-3 shadow-md">
                      <p className="text-[10px] leading-relaxed text-[#3A3A3C] italic font-medium">
                        <span className="font-black text-[#0A1F33] not-italic text-[9px] uppercase tracking-tighter mr-2 block mb-1">Análisis Datacar:</span>
                        "{currentAuto.veredicto || (auto.puesto ? "Analizando configuración técnica..." : "Modelo en evaluación. Consúltanos para obtener el veredicto técnico completo.")}"
                      </p>
                    </div>
                  </div>
                  
                  <div className="p-10 pt-4 flex-1 flex flex-col gap-6">
                    <div className="space-y-4">
                      <h4 className="font-black text-lg text-[#0A1F33] uppercase leading-tight">{currentAuto.marca} <br/> <span className="font-medium text-slate-500">{currentAuto.modelo}</span></h4>
                      <div className="relative group">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Versión:</p>
                        <div className="bg-slate-50 border border-slate-100 p-2 text-[10px] font-bold text-[#0A1F33] flex justify-between items-center cursor-pointer hover:border-[#0A1F33] transition-colors">
                          <span className="truncate pr-2">{currentAuto.version}</span>
                          <span className="text-slate-400">▾</span>
                        </div>
                        <div className="absolute left-0 w-full bg-white border shadow-xl z-20 hidden group-hover:block max-h-40 overflow-y-auto">
                          {auto.versiones?.map((v: any) => (
                            <div key={v.id} onClick={() => setActiveVersions({ ...activeVersions, [auto.id]: v })} className={`p-2 text-[9px] border-b hover:bg-slate-50 cursor-pointer flex justify-between ${currentAuto.id === v.id ? 'bg-[#0A1F33]/5 text-[#0A1F33]' : 'text-slate-600'}`}>
                              <span className="font-black uppercase">{v.version}</span>
                              <span className="font-bold">${v.precioUsd?.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between border-y py-4 text-sm font-black uppercase">
                      <span className="text-slate-400">{currentAuto.match_percent ? `${currentAuto.match_percent}% Match` : 'Extra'}</span>
                      <span className="text-[#0A1F33]">${currentAuto.precioUsd?.toLocaleString()}</span>
                    </div>
                    
                    <button onClick={() => setExpandedId(expandedId === auto.id ? null : auto.id)} className="text-[9px] font-black text-[#0A1F33] text-left uppercase tracking-widest hover:text-[#00BFFF] transition-colors">+ Datos Técnicos</button>
                    
                    {expandedId === auto.id && (
                      <div className="text-[10px] space-y-3 text-slate-600 animate-in slide-in-from-top-1 duration-300 pt-2 font-medium">
                        <div className="space-y-1">
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Seguridad</p>
                          <p className="flex justify-between border-b pb-1"><span>ADAS:</span> <span className="font-bold text-[#0A1F33]">{currentAuto.adas || 'Estándar'}</span></p>
                          <p className="flex justify-between border-b pb-1"><span>Airbags:</span> <span className="font-bold text-[#0A1F33]">{currentAuto.airbags || 'Consultar'}</span></p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Tecnología</p>
                          <p className="flex justify-between border-b pb-1"><span>Pantalla:</span> <span className="font-bold text-[#0A1F33]">{currentAuto.tamanhoPantalla || 'Consultar'}</span></p>
                          <p className="flex justify-between border-b pb-1"><span>Cámaras:</span> <span className="font-bold text-[#0A1F33]">{currentAuto.camaras || 'Retroceso'}</span></p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Capacidad</p>
                          <p className="flex justify-between border-b pb-1"><span>Baulera:</span> <span className="font-bold text-[#0A1F33]">{currentAuto.bauleraLitros ? `${currentAuto.bauleraLitros} L` : 'Consultar'}</span></p>
                          <p className="flex justify-between border-b pb-1"><span>Plazas:</span> <span className="font-bold text-[#0A1F33]">{currentAuto.plazas || '5'}</span></p>
                        </div>
                      </div>
                    )}
                    <a href={`https://wa.me/595991244469?text=Me interesa el ${currentAuto.marca} ${currentAuto.modelo} versión ${currentAuto.version} del ranking Datacar.`} target="_blank" className="mt-auto block w-full py-4 bg-[#0A1F33] text-white text-center font-black text-[10px] uppercase tracking-widest hover:bg-[#00BFFF] transition-colors shadow-lg">Quiero Comprar</a>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Información Financiera */}
          <div className="mt-20 border-t-4 border-[#0A1F33] pt-12">
            <div className="bg-[#f8fafc] border border-slate-200 text-[#0A1F33] p-10 md:p-16 shadow-lg relative">
              <h2 className="text-3xl font-montserrat font-black uppercase mb-2">
                ¿Querés financiar? <span className="text-[#00BFFF]">Nosotros te ayudamos con todo.</span>
              </h2>
              <p className="text-[#3A3A3C] text-sm mb-10 font-medium max-w-3xl">
                Sabemos que el papeleo puede ser un dolor de cabeza. Te resumimos los documentos principales que suelen pedir las concesionarias y bancos para que te vayas preparando.
              </p>

              <div className="space-y-4 max-w-5xl">
                <details className="group bg-white border border-slate-200 p-6 cursor-pointer hover:border-[#0A1F33] transition-colors shadow-sm">
                  <summary className="font-black text-sm uppercase tracking-widest text-[#0A1F33] flex justify-between items-center list-none outline-none">
                    Requisitos: Financiación Propia (Garden, Automotor, etc.)
                    <span className="text-[#00BFFF] group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <div className="mt-6 text-[#3A3A3C] text-xs leading-relaxed space-y-2 border-t border-slate-100 pt-4 font-medium">
                    <ul className="list-disc pl-5 space-y-2">
                      <li><strong className="text-[#0A1F33] font-bold">Cédula de Identidad:</strong> Copia de ambos lados. (Si estás casado/a, también del cónyuge).</li>
                      <li><strong className="text-[#0A1F33] font-bold">Comprobantes de Ingreso:</strong> 3 últimas liquidaciones de salario (si sos dependiente) o últimas 6 declaraciones de IVA (si sos independiente).</li>
                      <li><strong className="text-[#0A1F33] font-bold">Validación de Domicilio:</strong> Factura de ANDE o NIS (no importa que no esté a tu nombre) y ubicación.</li>
                      <li><strong className="text-[#0A1F33] font-bold">Respaldos (Opcional pero recomendado):</strong> 3 a 6 últimos extractos bancarios. Si tenés inmuebles o vehículos a tu nombre, adjuntá el título/cédula verde.</li>
                      <li><strong className="text-[#0A1F33] font-bold">Referencias:</strong> Personales (nombre y celular) y Comerciales (nombre del comercio).</li>
                    </ul>
                  </div>
                </details>

                <details className="group bg-white border border-slate-200 p-6 cursor-pointer hover:border-[#0A1F33] transition-colors shadow-sm">
                  <summary className="font-black text-sm uppercase tracking-widest text-[#0A1F33] flex justify-between items-center list-none outline-none">
                    Requisitos: Préstamos Bancarios
                    <span className="text-[#00BFFF] group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <div className="mt-6 text-[#3A3A3C] text-xs leading-relaxed space-y-6 border-t border-slate-100 pt-4 font-medium">
                    <div>
                      <h4 className="font-black text-[#0A1F33] uppercase text-[11px] mb-2 bg-slate-100 inline-block px-2 py-1">Si ya sos cliente del Banco:</h4>
                      <p>Es rapidísimo. Solo necesitás tu Cédula, la Carta Oferta (Proforma) de la concesionaria, llenar la solicitud vía App/Home Banking y endosar el seguro del vehículo.</p>
                    </div>
                    <div>
                      <h4 className="font-black text-[#0A1F33] uppercase text-[11px] mb-2 bg-slate-100 inline-block px-2 py-1">Si NO sos cliente (Persona Física):</h4>
                      <ul className="list-disc pl-5 space-y-2">
                        <li>Cédula (autenticada o escaneo original) y Carta Oferta.</li>
                        <li>Factura de servicio público (ANDE, ESSAP, Copaco).</li>
                        <li><strong className="text-[#0A1F33] font-bold">Asalariados:</strong> Certificado de trabajo y últimas 3 liquidaciones.</li>
                        <li><strong className="text-[#0A1F33] font-bold">Independientes:</strong> Últimos 6 IVA y Certificado de Cumplimiento Tributario (CCT).</li>
                        <li>2 Referencias personales y 2 comerciales.</li>
                      </ul>
                    </div>
                  </div>
                </details>
              </div>
            </div>
          </div>
          
          {/* Barra Flotante Comparar */}
          {compareIds.length >= 1 && (
            <div className="fixed bottom-6 md:bottom-12 left-1/2 -translate-x-1/2 z-50 w-[95%] md:w-auto bg-[#0A1F33] text-white p-4 md:p-8 shadow-2xl flex items-center justify-between md:justify-center md:gap-10 border-t-4 border-[#00BFFF] rounded-sm animate-in slide-in-from-bottom-10 print:hidden">
              <div className="text-sm font-bold uppercase tracking-widest">{compareIds.length} <span className="text-slate-400 font-medium">seleccionados</span></div>
              {compareIds.length >= 2 ? (
                <button onClick={handleOpenComparison} className="bg-[#00BFFF] text-[#0A1F33] px-10 py-4 font-black text-[11px] uppercase tracking-widest hover:bg-white transition-all shadow-lg">Comparar Datos Duros</button>
              ) : (
                <p className="text-[10px] text-slate-500 italic tracking-widest px-4">Selecciona al menos 2...</p>
              )}
              <button onClick={() => setCompareIds([])} className="text-slate-400 text-[9px] uppercase font-black hover:text-white transition-colors">Limpiar</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
