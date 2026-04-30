import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { catalogoMatriz, leads } from '@/lib/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { leadId } = await req.json();
    const leadData = await db.query.leads.findFirst({ where: eq(leads.id, leadId) });
    if (!leadData) return NextResponse.json({ error: "Lead no encontrado" }, { status: 404 });

    const ensureArray = (val: any): string[] => {
      if (!val) return [];
      if (Array.isArray(val)) return val.map(v => v.toLowerCase().trim());
      if (typeof val === 'string' && val.trim() !== '') return [val.toLowerCase().trim()];
      return [];
    };

    // 1. NORMALIZACIÓN (Todo a minúsculas para comparar fácil)
    const attrs = ensureArray(leadData.atributos);
    const sMotorizaciones = ensureArray(leadData.motorizacion);
    const sTipos = ensureArray(leadData.tipoVehiculo);
    const sOrigenes = ensureArray(leadData.origen);
    const sConcesionarias = ensureArray(leadData.concesionariaPreferencia);

    const mappingOrigen: Record<string, string> = {
      'solo chinos': 'china',
      'solo japoneses': 'japón',
      'solo coreanos': 'corea',
      'solo europeos': 'europa',
    };
    const origenesDB = sOrigenes.map(o => mappingOrigen[o] || o);

    // 2. CONSULTA BASE POR PRECIO
    const universoAutos = await db.select().from(catalogoMatriz).where(and(
      gte(catalogoMatriz.precioUsd, leadData.presupuestoMin),
      lte(catalogoMatriz.precioUsd, leadData.presupuestoMax)
    ));

    // 3. SCORING DE JERARQUÍA (REGLA DE ORO)
    const rankingOrdenado = universoAutos.map(auto => {
      let score = 0;
      const carroceriaAuto = (auto.tipoCarroceria || "").toLowerCase();
      const combustibleAuto = (auto.combustible || "").toLowerCase();
      const origenAuto = (auto.origenMarca || "").toLowerCase();

      // REGLA DE ORO: Carrocería (50.000 pts) - Uso .includes para mayor flexibilidad
      if (sTipos.length > 0 && sTipos.some(t => carroceriaAuto.includes(t))) score += 50000;
      
      // Motorización (20.000 pts)
      if (sMotorizaciones.length > 0 && sMotorizaciones.some(m => combustibleAuto.includes(m))) score += 20000;
      
      // Origen (15.000 pts)
      if (origenesDB.length > 0 && origenesDB.some(o => origenAuto.includes(o))) score += 15000;

      // Atributos (Bonus)
      if (attrs.includes('seguridad')) {
        const ab = parseInt(auto.airbags?.toString().replace(/\D/g, '') || '0');
        score += (ab * 500);
      }

      return { ...auto, score };
    }).sort((a, b) => b.score - a.score);

    // 4. TOP 10 MODELOS ÚNICOS
    const vistos = new Set();
    const finalTop = [];
    for (const auto of rankingOrdenado) {
      if (!vistos.has(auto.modelo) && finalTop.length < 10) {
        vistos.add(auto.modelo);
        finalTop.push(auto);
      }
    }

    // 5. IA: ANÁLISIS PERSONALIZADO
    let veredictosIA: string[] = [];
    if (finalTop.length > 0) {
      try {
        const prompt = `Eres un experto automotriz. Para cada uno de estos 10 autos, escribe una frase de 15 palabras que explique por qué es ideal para alguien que busca: ${attrs.join(', ')}. 
        IMPORTANTE: Devuelve SOLO las 10 frases, una por línea, sin números ni nombres de autos.
        Lista:
        ${finalTop.map(a => `${a.marca} ${a.modelo} (${a.combustible}, ${a.airbags} airbags)`).join('\n')}`;

        const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash:generateContent?key=${process.env.GOOGLE_GENERATIVE_AI_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        const aiData = await aiRes.json();
        const rawText = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
        veredictosIA = rawText.split('\n').filter(line => line.trim().length > 10);
      } catch (e) {
        console.error("Error IA:", e);
      }
    }

    // 6. CÁLCULO DE MATCH % CALIBRADO (Misma lógica que el Score)
    const calculateMatch = (v: any) => {
      let s = 15; // Empezamos con un 15% base por estar en presupuesto
      const carroceria = (v.tipoCarroceria || "").toLowerCase();
      const combustible = (v.combustible || "").toLowerCase();
      const origen = (v.origenMarca || "").toLowerCase();

      if (sTipos.some(t => carroceria.includes(t))) s += 45; // +45% si es el tipo correcto
      if (sMotorizaciones.some(m => combustible.includes(m))) s += 20; // +20% motor
      if (origenesDB.some(o => origen.includes(o))) s += 15; // +15% origen
      
      if (attrs.includes('seguridad')) {
        const ab = parseInt(v.airbags?.toString().replace(/\D/g, '') || '0');
        if (ab >= 6) s += 4;
      }

      return Math.min(s, 99);
    };

    // 7. FORMATEO FINAL
    const top10 = await Promise.all(finalTop.map(async (auto, index) => {
      const vRaw = await db.query.catalogoMatriz.findMany({
        where: eq(catalogoMatriz.modelo, auto.modelo),
        orderBy: [catalogoMatriz.precioUsd]
      });

      return {
        ...auto,
        match_percent: calculateMatch(auto),
        veredicto: veredictosIA[index]?.trim() || "Excelente opción equilibrada según tu presupuesto y preferencias.",
        versiones: vRaw.map(v => ({ ...v, match_percent: calculateMatch(v) }))
      };
    }));

    return NextResponse.json({ success: true, top10 });

  } catch (error: any) {
    console.error("CRITICAL:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
