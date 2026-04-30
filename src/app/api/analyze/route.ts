import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { catalogoMatriz, leads } from '@/lib/schema';
import { eq, and, gte, lte } from 'drizzle-orm';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { leadId } = await req.json();
    const leadData = await db.query.leads.findFirst({ where: eq(leads.id, leadId) });
    
    if (!leadData) {
      return NextResponse.json({ error: "Lead no encontrado" }, { status: 404 });
    }

    // 1. NORMALIZACIÓN Y PREPARACIÓN DE DATOS
    const ensureArray = (val: any): string[] => {
      if (!val) return [];
      if (Array.isArray(val)) return val.map(v => String(v).toLowerCase().trim());
      if (typeof val === 'string' && val.trim() !== '') return [val.toLowerCase().trim()];
      return [];
    };

    const attrs = ensureArray(leadData.atributos);
    const sMotor = ensureArray(leadData.motorizacion);
    const sTipo = ensureArray(leadData.tipoVehiculo);
    const sOrigen = ensureArray(leadData.origen);
    const sConce = ensureArray(leadData.concesionariaPreferencia);

    const mappingOrigen: Record<string, string> = {
      'solo chinos': 'china',
      'solo japoneses': 'japón',
      'solo coreanos': 'corea',
      'solo europeos': 'europa',
    };
    const origenesTarget = sOrigen.map(o => mappingOrigen[o] || o);

    // 2. EXTRACCIÓN DEL UNIVERSO DE CANDIDATOS
    // Traemos un 15% extra del presupuesto máximo para permitir la Tier 5 (Flexibilidad de precio)
    const precioMaxReal = leadData.presupuestoMax || 0;
    const precioMaxConBuffer = precioMaxReal * 1.15;

    const universo = await db.select().from(catalogoMatriz).where(and(
      gte(catalogoMatriz.precioUsd, leadData.presupuestoMin || 0),
      lte(catalogoMatriz.precioUsd, precioMaxConBuffer)
    ));

    // 3. LÓGICA DE TIERS (Dureza Progresiva)
    // Esta lógica garantiza que siempre prioricemos lo que el usuario pidió
    const autosClasificados = universo.map(auto => {
      const cTipo = (auto.tipoCarroceria || "").toLowerCase();
      const cMotor = (auto.combustible || "").toLowerCase();
      const cOrigen = (auto.origenMarca || "").toLowerCase();
      const cConce = (auto.concesionaria || "").toLowerCase();
      const cPrecio = auto.precioUsd || 0;

      const matchesTipo = sTipo.length === 0 || sTipo.some(t => cTipo.includes(t));
      const matchesMotor = sMotor.length === 0 || sMotor.some(m => cMotor.includes(m));
      const matchesOrigen = origenesTarget.length === 0 || origenesTarget.some(o => cOrigen.includes(o));
      const matchesConce = sConce.length === 0 || sConce.includes('todas') || sConce.some(c => cConce.includes(c));
      const matchesPrecioDuro = cPrecio <= precioMaxReal;

      let tier = 99; // Fuera de criterio base

      // Tier 1: Perfección absoluta (5/5)
      if (matchesTipo && matchesMotor && matchesOrigen && matchesConce && matchesPrecioDuro) tier = 1;
      // Tier 2: Flexibilizamos Concesionaria (4/5)
      else if (matchesTipo && matchesMotor && matchesOrigen && matchesPrecioDuro) tier = 2;
      // Tier 3: Flexibilizamos Origen (3/5)
      else if (matchesTipo && matchesMotor && matchesPrecioDuro) tier = 3;
      // Tier 4: Flexibilizamos Motor (2/5)
      else if (matchesTipo && matchesPrecioDuro) tier = 4;
      // Tier 5: Flexibilizamos Precio (Carrocería es el único límite sagrado)
      else if (matchesTipo) tier = 5;

      return { ...auto, tier };
    });

    // 4. SELECCIÓN DE TOP 10 MODELOS ÚNICOS
    const ranking = autosClasificados
      .filter(a => a.tier <= 5)
      .sort((a, b) => a.tier - b.tier || a.precioUsd - b.precioUsd);

    const vistos = new Set();
    const finalTop = [];
    for (const auto of ranking) {
      if (!vistos.has(auto.modelo) && finalTop.length < 10) {
        vistos.add(auto.modelo);
        finalTop.push(auto);
      }
    }

    // 5. IA: JUSTIFICACIÓN ESTRATÉGICA (Gemini 3 Flash)
    let veredictosIA: string[] = [];
    if (finalTop.length > 0) {
      try {
        const prompt = `Actúa como consultor experto de DATACAR. Justifica estos 10 autos para un cliente que prioriza: ${attrs.join(', ')}.
        Para cada auto, escribe un veredicto de 15 palabras enfocado en beneficios técnicos reales. 
        IMPORTANTE: Devuelve solo las 10 frases, una por línea, sin nombres de marcas ni modelos.
        
        Datos de los autos:
        ${finalTop.map(a => `${a.marca} ${a.modelo}: ${a.airbags} airbags, combustible ${a.combustible}, baulera ${a.bauleraLitros}L`).join('\n')}`;

        const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash:generateContent?key=${process.env.GOOGLE_GENERATIVE_AI_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        const aiData = await aiRes.json();
        const rawText = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
        veredictosIA = rawText.split('\n').filter((line: string) => line.trim().length > 10);
      } catch (e) {
        console.error("Fallo crítico en IA:", e);
      }
    }

    // 6. FORMATEO Y MATCH % POR NIVEL DE CONFIANZA
    const top10 = await Promise.all(finalTop.map(async (auto, index) => {
      const vRaw = await db.query.catalogoMatriz.findMany({
        where: eq(catalogoMatriz.modelo, auto.modelo),
        orderBy: [catalogoMatriz.precioUsd]
      });

      // Mapeo de Match % según la Tier alcanzada
      const tierMatch: Record<number, number> = { 1: 99, 2: 88, 3: 75, 4: 60, 5: 45 };
      const baseMatch = tierMatch[auto.tier] || 30;

      return {
        ...auto,
        match_percent: baseMatch,
        veredicto: veredictosIA[index]?.trim() || "Opción seleccionada por robustez técnica y disponibilidad en mercado.",
        versiones: vRaw.map(v => ({ ...v, match_percent: baseMatch }))
      };
    }));

    return NextResponse.json({ success: true, top10 });

  } catch (error: any) {
    console.error("ARQUITECTO_LOG_ERROR:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
