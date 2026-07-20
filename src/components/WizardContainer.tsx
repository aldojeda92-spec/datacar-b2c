'use client';

import { useState, useRef, useEffect } from 'react';
import { saveLeadAction, logComparisonAction } from '@/app/actions';

// --- SET DE ICONOS SVG INTEGRADOS (Cero dependencias) ---
const Icons = {
  User: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
  Phone: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>,
  WhatsApp: () => <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>,
  Money: () => <svg className="w-5 h-5 text-[#006837]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8v8m0-8V6m0 12v-2m0 0H9m11 11H4a2 2 0 01-2-2V5a2 2 0 012-2h16a2 2 0 012 2v14a2 2 0 01-2 2z" /></svg>,
  Engine: () => <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
  Car: () => <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h8a2 2 0 012 2v2m-6 4v-2m-4 2v-2m10 2h.01M5 11h14a2 2 0 012 2v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2a2 2 0 012-2z" /></svg>,
  Globe: () => <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  Building: () => <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
  Printer: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>,
  Document: () => <svg className="w-3 h-3 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
  Search: () => <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>,
  CheckCircle: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
};

interface IAAuto {
  id: string; puesto: number; match_percent: number; marca: string; modelo: string;
  version: string; precioUsd: number; origenMarca: string; combustible: string;
  urlImagen?: string; motor?: string; traccion?: string; transmision?: string;
  bauleraLitros?: number; garantia?: string; adas?: string; airbags?: string;
  tamanhoPantalla?: string; camaras?: string; plazas?: number; largo?: number;
  ancho?: number; alto?: number; despejeSuelo?: number; asientoCuero?: string;
  techoPanoramico?: string; conectividad?: string; concesionaria?: string;
  veredicto: string; versiones: any[];
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
  
  // === INYECCIÓN: Estado Financiero ===
  const [paymentMode, setPaymentMode] = useState<'cash' | 'financed'>('cash');
  const [financeParams, setFinanceParams] = useState({ delivery: 0, installment: 400, term: 60 });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<IAAuto[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [manualSelections, setManualSelections] = useState<IAAuto[]>([]);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [isSavingLead, setIsSavingLead] = useState(false);

  const [formData, setFormData] = useState({
    nombre: PEDIR_DATOS_USUARIO ? '' : 'Socio Universitario (Invitado)', 
    celular: PEDIR_DATOS_USUARIO ? '' : '0999999999', 
    email: '', 
    presupuestoMin: 15000, 
    presupuestoMax: 45000,
    atributos: [] as string[], 
    motorizacion: [] as string[], 
    tipoVehiculo: [] as string[],
    origen: [] as string[], 
    concesionaria: [] as string[], 
    notas: ''
  });

  // === INYECCIÓN: Lógica financiera ===
  const calculateBudgetFromQuota = () => {
    const r = 0.09 / 12; // 9% Anual
    const n = financeParams.term;
    const q = financeParams.installment;
    // P_gross = Cuota * ((1 - (1+r)^-n) / r)
    const p_gross = q * ((1 - Math.pow(1 + r, -n)) / r);
    // Factor de retención 2.7% (1 - 0.027 = 0.973)
    const p_net = p_gross * 0.973; 
    const total = p_net + financeParams.delivery;
    return { min: total * 0.9, max: total * 1.1 };
  };

  const calculateEstimatedInstallment = (price: number) => {
    const r = 0.09 / 12;
    const n = financeParams.term;
    // Principal real = (Precio - Entrega) / 0.973 (Gross-up de retenciones)
    const principal = (price - financeParams.delivery) / 0.973;
    if (principal <= 0) return 0;
    return principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  };
  
  const isCelularValid = formData.celular.startsWith('09') && formData.celular.length === 10;
  const isReady = PEDIR_DATOS_USUARIO ? formData.nombre && isCelularValid && formData.atributos.length === 3 : formData.atributos.length === 3; 

  const toggleArrayItem = (key: 'motorizacion' | 'tipoVehiculo' | 'origen' | 'concesionaria', value: string) => {
    setFormData(prev => {
      const current = prev[key] as string[];
      const exists = current.includes(value);
      return { ...prev, [key]: exists ? current.filter(i => i !== value) : [...current, value] };
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
    // === INYECCIÓN: Overwrite de presupuesto si es financiado ===
    let finalData = { ...formData };
    if (paymentMode === 'financed') {
      const range = calculateBudgetFromQuota();
      finalData.presupuestoMin = range.min;
      finalData.presupuestoMax = range.max;
    }
    
    try {
      const result = await saveLeadAction(finalData);
      if (result.success && result.leadId) {
        setCurrentLeadId(result.leadId);
        localStorage.setItem('universitaria_lead_id', result.leadId);
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
    } catch (e) { alert("Error de conexión con el sistema cooperativo."); } finally { setIsAnalyzing(false); }
  };

  const handleOpenComparison = async () => {
    const selected = displayedAutos.filter(a => compareIds.includes(a.id));
    const nombres = selected.map(a => `${a.marca} ${a.modelo}`).join(' vs ');
    const leadIdToUse = currentLeadId || localStorage.getItem('universitaria_lead_id');
    if (leadIdToUse && compareIds.length >= 2) {
      await logComparisonAction({ leadId: leadIdToUse, vIds: compareIds, nombres: nombres });
    }
    setShowComparison(true);
    window.scrollTo(0, 0);
  };

  const handlePrintRequest = () => {
    if (formData.nombre.includes('Invitado')) {
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
        console.error("Error al buscar en el catálogo automotor", e);
      } finally {
        setIsSearching(false);
      }
    }, 400); 
    return () => clearTimeout(delayFn);
  }, [searchTerm]);

  const displayedAutos = [...manualSelections, ...top10].filter((auto, index, self) =>
    index === self.findIndex((a) => a.id === auto.id)
  );

  const MultiSelect = ({ label, items, value, storeKey, icon: Icon, descriptions }: { label: string, items: string[], value: string[], storeKey: any, icon: any, descriptions?: Record<string, string> }) => (
    <div className="space-y-1 relative">
      <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wide flex items-center gap-1">
        <Icon /> {label}
      </label>
      <div 
        onClick={() => setOpenFilter(openFilter === label ? null : label)}
        className="w-full p-3 bg-white border border-slate-200 text-sm cursor-pointer flex justify-between items-center hover:border-[#006837] transition-all rounded shadow-sm"
      >
        <span className="truncate pr-4 font-medium text-slate-800">
          {value.length > 0 ? value.join(', ') : 'Cualquier opción'}
        </span>
        <span className="text-[#006837] text-[10px]">{openFilter === label ? '▲' : '▼'}</span>
      </div>
      {openFilter === label && (
        <div className="absolute z-50 w-full bg-white border border-slate-200 shadow-2xl max-h-60 overflow-y-auto p-1 mt-1 rounded animate-in fade-in zoom-in duration-150">
          {items.map(item => (
            <label key={item} className="flex items-start gap-3 p-2.5 hover:bg-slate-50 cursor-pointer rounded transition-colors">
              <input 
                type="checkbox" 
                checked={value.includes(item)} 
                onChange={() => toggleArrayItem(storeKey, item)}
                className="w-4 h-4 mt-0.5 accent-[#006837] rounded border-slate-300"
              />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">{item}</span>
                {descriptions && descriptions[item] && <span className="text-[9px] font-medium text-slate-400 mt-0.5">{descriptions[item]}</span>}
              </div>
            </label>
          ))}
        </div>
      )}
    </div>
  );

  if (isAnalyzing) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white font-sans text-center px-6">
      <div className="w-12 h-12 border-4 border-slate-100 border-t-[#006837] rounded-full animate-spin mb-6"></div>
      <p className="font-semibold text-base tracking-normal text-[#006837] mb-2">Buscando las mejores oportunidades para su crecimiento...</p>
      <p className="text-sm text-slate-500">Procesando datos del mercado automotor con respaldo Cooperativo.</p>
    </div>
  );

  if (showComparison) {
    const selected = displayedAutos.filter(a => compareIds.includes(a.id));
    const autoRecomendado = selected.length > 0 ? (activeVersions[selected[0].id] || selected[0]) : null;
    const opcionesExtra = top10.filter(a => !compareIds.includes(a.id)).slice(0, 3);

    return (
      <div className="font-sans bg-slate-50 text-slate-900 min-h-screen p-4">
         <div className="text-center"><h1 className="text-xl font-bold">Vista de Matriz</h1><button onClick={() => setShowComparison(false)} className="mt-4 bg-[#006837] text-white px-4 py-2 rounded">Volver</button></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen font-sans ${step === 2 ? 'bg-slate-50' : 'bg-white'}`}>
      <div className="max-w-[1600px] mx-auto p-6 md:p-8 flex justify-between items-center border-b border-slate-100 bg-white">
        <div className="flex items-center gap-4"><div className="bg-[#006837] text-white font-sans font-extrabold text-2xl px-3.5 py-1.5 rounded-full">CU</div>
          <h1 className="text-sm font-extrabold uppercase text-[#006837]">Portal de Consultas</h1>
        </div>
        {step === 2 && <button onClick={() => setStep(1)} className="text-[10px] font-bold uppercase border-b-2 border-[#FFD100] pb-1 text-slate-600 hover:text-[#006837]">← Nueva Consulta</button>}
      </div>

      {step === 1 && (
        <div className="max-w-4xl mx-auto p-6 md:p-10">
          <div className="bg-white border border-slate-100 p-8 md:p-12 shadow-xl rounded-xl space-y-10">
            
            {/* === INYECCIÓN: SELECTOR DE MODO === */}
            <div className="grid grid-cols-2 gap-4 p-1 bg-slate-100 rounded-lg">
                <button onClick={() => setPaymentMode('cash')} className={`py-3 text-xs font-bold uppercase tracking-wide rounded-md transition-all ${paymentMode === 'cash' ? 'bg-white shadow text-[#006837]' : 'text-slate-500'}`}>Precio Contado</button>
                <button onClick={() => setPaymentMode('financed')} className={`py-3 text-xs font-bold uppercase tracking-wide rounded-md transition-all ${paymentMode === 'financed' ? 'bg-white shadow text-[#006837]' : 'text-slate-500'}`}>Financiamiento</button>
            </div>

            {/* === INYECCIÓN: CALCULADORA FINANCIERA === */}
            {paymentMode === 'financed' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-[#006837]/5 p-6 rounded-lg border border-[#006837]/10 animate-in fade-in">
                <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-500">Entrega Inicial (USD)</label>
                    <input type="number" value={financeParams.delivery} onChange={(e) => setFinanceParams({...financeParams, delivery: Number(e.target.value)})} className="w-full p-3 border border-slate-200 rounded shadow-sm text-sm font-bold" />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-500">Cuota Mensual (USD)</label>
                    <input type="number" value={financeParams.installment} onChange={(e) => setFinanceParams({...financeParams, installment: Number(e.target.value)})} className="w-full p-3 border border-slate-200 rounded shadow-sm text-sm font-bold" />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-500">Plazo (Meses)</label>
                    <select value={financeParams.term} onChange={(e) => setFinanceParams({...financeParams, term: Number(e.target.value)})} className="w-full p-3 border border-slate-200 rounded shadow-sm text-sm font-bold bg-white">
                        {[12, 24, 36, 48, 60].map(m => <option key={m} value={m}>{m} meses</option>)}
                    </select>
                </div>
              </div>
            )}

            <div className={`space-y-10 bg-slate-50/50 p-6 rounded-lg border border-slate-100 shadow-inner ${paymentMode === 'financed' ? 'opacity-50 pointer-events-none' : ''}`}>
               <div className="flex justify-between items-center gap-4">
                <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wide flex items-center gap-1.5"><Icons.Money /> Rango de Inversión Estimada (USD)</label>
                <div className="flex gap-2 font-extrabold text-[#006837] text-sm tracking-tight bg-white px-4 py-1.5 rounded-full border border-slate-100 shadow-sm">
                  <span>${formData.presupuestoMin.toLocaleString()}</span> — <span>${formData.presupuestoMax.toLocaleString()}</span>
                </div>
              </div>
              <div className="relative w-full h-1.5 bg-slate-200 rounded-full">
                <div className="absolute h-full bg-[#006837] rounded-full" style={{ left: `${(formData.presupuestoMin / 150000) * 100}%`, right: `${100 - (formData.presupuestoMax / 150000) * 100}%` }} />
                <input type="range" min="0" max="150000" step="1000" value={formData.presupuestoMin} onChange={handleMinChange} className="absolute w-full -top-1 h-3 appearance-none bg-transparent pointer-events-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-slate-800 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow" />
                <input type="range" min="0" max="150000" step="1000" value={formData.presupuestoMax} onChange={handleMaxChange} className="absolute w-full -top-1 h-3 appearance-none bg-transparent pointer-events-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-[#FFD100] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow" />
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wide flex items-center gap-1.5"><Icons.CheckCircle /> Atributos Prioritarios (Seleccionar 3) *</label>
              <div className="flex flex-wrap gap-2.5">
                {['Seguridad', 'Tecnología', 'Espacio', 'Precio', 'Eficiencia'].map(at => (
                  <button key={at} onClick={() => toggleAtributo(at)} className={`px-6 py-2.5 text-[11px] font-bold border-2 rounded-md transition-all tracking-wider flex items-center gap-2 ${formData.atributos.includes(at) ? 'bg-[#006837] text-white border-[#006837]' : 'bg-white text-slate-500 border-slate-100 hover:border-slate-200 hover:text-slate-700'}`}>
                    {formData.atributos.includes(at) && <Icons.CheckCircle />} {at}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <MultiSelect 
                  label="Preferencia Motorización" 
                  items={['Nafta', 'Flex', 'Diesel', 'MHEV', 'HEV', 'PHEV', 'EV', 'REEV']} 
                  value={formData.motorizacion} 
                  storeKey="motorizacion" 
                  icon={Icons.Engine}
                  descriptions={{
                      'MHEV': 'Híbrido Suave',
                      'HEV': 'Híbrido Autorrecargable',
                      'PHEV': 'Híbrido Enchufable',
                      'EV': '100% Eléctrico',
                      'REEV': 'Eléctrico Rango Extendido'
                  }}
              />
              <MultiSelect label="Tipo de Carrocería" items={['SUV', 'Sedan', 'Hatchback', 'Pickup']} value={formData.tipoVehiculo} storeKey="tipoVehiculo" icon={Icons.Car} />
              <MultiSelect label="País de Origen de la Marca" items={['Solo Coreanos', 'Solo Japoneses', 'Solo Europeos', 'Solo Chinos']} value={formData.origen} storeKey="origen" icon={Icons.Globe} />
              <MultiSelect label="Concesionaria Asociada" items={['Garden', 'Automotor', 'Santa Rosa', 'Chacomer', 'Toyotoshi', 'Condor', 'Gorostiaga', 'Automaq', 'De La Sobera', 'Vicar', 'Diesa']} value={formData.concesionaria} storeKey="concesionaria" icon={Icons.Building} />
            </div>

            <button disabled={!isReady} onClick={handleExecute} className="w-full py-5 bg-[#006837] text-white font-extrabold text-xs uppercase tracking-[3px] hover:bg-[#004a7a] transition-all disabled:opacity-30 shadow-lg rounded-md border-b-4 border-[#FFD100] flex items-center justify-center gap-2">
              Iniciar Análisis Técnico de Mercado <Icons.Search />
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="max-w-[1700px] mx-auto p-4 md:p-8 pb-40 animate-in fade-in duration-700 space-y-10">
          <div className="bg-[#006837] p-8 md:p-10 text-white rounded-lg shadow-2xl border-l-8 border-[#FFD100]">
            <h2 className="font-extrabold text-xl uppercase tracking-tight flex items-center gap-3">
              Análisis de Mercado Homologado
            </h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
            {displayedAutos.map((auto) => {
              const currentAuto = activeVersions[auto.id] || auto;
              
              // INYECCIÓN: Cálculo estimado cuota
              const estimatedInstallment = paymentMode === 'financed' 
                ? calculateEstimatedInstallment(currentAuto.precioUsd) 
                : null;

              return (
                <div key={auto.id} className="bg-white border border-slate-100 rounded-lg shadow-sm p-5 space-y-4">
                  <img src={currentAuto.urlImagen} className="h-32 mx-auto object-contain" />
                  <h4 className="font-extrabold text-base text-gray-950 uppercase">{currentAuto.marca} {currentAuto.modelo}</h4>
                  
                  <div className="py-3 border-y border-slate-100">
                    {paymentMode === 'financed' && estimatedInstallment ? (
                      <div className="text-center">
                        <span className="block text-[9px] font-bold text-slate-500 uppercase">Cuota Estimada</span>
                        <span className="text-[#006837] font-extrabold text-lg">${estimatedInstallment.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                      </div>
                    ) : (
                      <div className="text-center">
                        <span className="block text-[9px] font-bold text-slate-500 uppercase">Precio</span>
                        <span className="text-[#006837] font-extrabold text-lg">${currentAuto.precioUsd.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                  <a href={`https://wa.me/595216170000?text=Solicito propuesta comercial formal para el ${currentAuto.marca} ${currentAuto.modelo} versión ${currentAuto.version} validado por la Cooperativa Universitaria.`} target="_blank" className="block w-full py-2 bg-[#006837] text-white text-center font-bold text-[10px] uppercase tracking-widest rounded-sm">Solicitar Crédito</a>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
