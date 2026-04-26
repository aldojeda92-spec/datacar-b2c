{/* SECCIÓN 2: RANGO DE INVERSIÓN (DUAL) */}
<section>
  <h2 className="font-montserrat font-[900] text-[#0A1F33] text-xs uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">
    2. Margen de Inversión (USD)
  </h2>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
    <div>
      <label className="block text-[10px] font-bold text-[#3A3A3C]/60 uppercase mb-1">Mínimo sugerido</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#3A3A3C]/40 text-sm">$</span>
        <input 
          type="number" 
          name="presupuestoMin" 
          value={formData.presupuestoMin} 
          onChange={handleInputChange} 
          className="w-full p-3 pl-7 border border-[#3A3A3C]/20 outline-none focus:border-[#0A1F33] font-inter text-sm bg-slate-50"
          placeholder="10.000"
        />
      </div>
    </div>
    <div>
      <label className="block text-[10px] font-bold text-[#3A3A3C]/60 uppercase mb-1">Máximo disponible</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#3A3A3C]/40 text-sm">$</span>
        <input 
          type="number" 
          name="presupuestoMax" 
          value={formData.presupuestoMax} 
          onChange={handleInputChange} 
          className="w-full p-3 pl-7 border border-[#3A3A3C]/20 outline-none focus:border-[#0A1F33] font-inter text-sm bg-slate-50"
          placeholder="50.000"
        />
      </div>
    </div>
  </div>
  <p className="mt-3 text-[9px] text-[#3A3A3C]/50 font-medium italic">
    * Definir un rango ayuda a nuestro motor de IA a optimizar la selección de activos.
  </p>
</section>
