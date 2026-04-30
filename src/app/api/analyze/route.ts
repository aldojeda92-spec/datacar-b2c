import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { catalogoMatriz, leads } from '@/lib/schema';
import { eq, and, gte, lte } from 'drizzle-orm';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { leadId } = await req.json();
    const leadData = await db.query.leads.findFirst({ where: eq(leads.id, leadId) });
    if (!leadData) return NextResponse.json({ error: "Lead no encontrado" }, { status: 404 });

    // 1. NORMALIZACIÓN DE ENTRADAS (Robustez total)
    const ensureArray = (val: any): string[] => {
      if (!val) return [];
      if (Array.isArray(val)) return val.map(v => String(v).toLowerCase().trim());
      if (typeof val === 'string' && val.trim() !== '') return [val.toLowerCase().trim()];
      return [];
    };

    const attrs = ensureArray(leadData.atributos); // Prioridades (Seguridad, Espacio, etc.)
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
    const origenesDB = sOrigenes.map(o => mappingOrigen[o] || o).filter(Boolean);

    // 2. CONSULTA BASE (Solo precio para evitar errores de sintaxis SQL)
    const universoAutos = await db.select().from(catalogoMatriz).where(and(
      gte(catalogoMatriz.precioUsd, leadData.presupuestoMin),
      lte(catalogoMatriz.precioUsd, leadData.presupuestoMax)
    ));

    // 3. REGLA DE ORO: SCORING DE JERARQUÍA EN JAVASCRIPT
    const rankingOrdenado = universoAutos.map(auto => {
      let score = 0;
      const carroceria = (auto.tipoCarroceria || "").toLowerCase();
      const motor = (auto.combustible || "").toLowerCase();
      const origen = (auto.origenMarca || "").toLowerCase();
      const conce = (auto.concesionaria || "").toLowerCase();

      // CARROCERÍA (50.000 pts) - Si el usuario pidió el tipo, es prioridad absoluta
      if (sTipos.length > 0 && sTipos.some(t => carroceria.includes(t))) score += 50000;
      
      // MOTORIZACIÓN (20.000 pts)
      if (sMotorizaciones.length > 0 && sMotorizaciones.some(m => motor.includes(m))) score += 20000;
      
      // ORIGEN (15.000 pts)
      if (origenesDB.length > 0 && origenesDB.some(o => origen.includes(o))) score += 15000;

      // CONCESIONARIA (10.000 pts)
      if (sConcesionarias.length > 0 && !sConcesionarias.includes('todas')) {
        if (sConcesionarias.some(c => conce.includes(c))) score += 10000;
      }

      // SEGURIDAD (Bonus basado en airbags reales)
      if (attrs.includes('seguridad')) {
        const ab = parseInt(auto.airbags?.toString().replace(/\D/g, '') || '0');
        score += (ab * 500);
      }

      return { ...auto, score };
    }).sort((a, b) => b.score - a.score);

    // 4. SELECCIÓN DE 10 MODELOS ÚNICOS
    const vistos = new Set();
    const finalTop = [];
    for (const auto of rankingOrdenado) {
      if (!vistos.has(auto.modelo) && finalTop.length < 10) {
        vistos.add(auto.modelo);
        finalTop.push(auto);
      }
    }

    // 5. IA: ANÁLISIS BASADO EN LOS 3 ATRIBUTOS SELECCIONADOS
    let veredictosIA: string[] = [];
    if (finalTop.length > 0) {
      try {
        const prompt = {
          contents: [{
            parts: [{
              text: `Eres un experto automotriz. El cliente prioriza estos atributos: ${attrs.join(', ')}.
              Analiza los siguientes 10 autos y escribe para cada uno una conclusión de 15 palabras justificando por qué encaja con sus prioridades.
              IMPORTANTE: Devuelve solo las conclusiones, una por línea, sin nombres de autos.
              Lista:
              ${finalTop.map(a => `${a.marca} ${a.modelo}: ${a.airbags} airbags, combustible ${a.combustible}, baulera ${a.bauleraLitros}L`).join('\n')}`
            }]
          }]
        };

        const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash:generateContent?key=${process.env.GOOGLE_GENERATIVE_AI_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(prompt)
        });

        const aiData = await aiRes.json();
        const rawText = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
        veredictosIA = rawText.split('\n').filter((line: string) => line.trim().length > 10);
      } catch (e) {
        console.error("Error IA:", e);
      }
    }

    // 6. CÁLCULO DE MATCH % GENEROSO
    const calculateMatch = (v: any) => {
      let s = 15; // Base por estar en presupuesto
      const carroceria = (v.tipoCarroceria || "").toLowerCase();
      const motor = (v.combustible || "").toLowerCase();
      const origen = (v.origenMarca || "").toLowerCase();

      if (sTipos.some(t => carroceria.includes(t))) s += 45;
      if (sMotorizaciones.some(m => motor.includes(m))) s += 20;
      if (origenesDB.some(o => origen.includes(o))) s += 15;
      
      if (attrs.includes('seguridad')) {
        const ab = parseInt(v.airbags?.toString().replace(/\D/g, '') || '0');
        if (ab >= 6) s += 4;
      }
      return Math.min(s, 99);
    };

    // 7. MAPEO FINAL
    const top10 = await Promise.all(finalTop.map(async (auto, index) => {
      const vRaw = await db.query.catalogoMatriz.findMany({
        where: eq(catalogoMatriz.modelo, auto.modelo),
        orderBy: [catalogoMatriz.precioUsd]
      });

      const veredicto = veredictosIA[index]?.trim() || "Excelente equilibrio técnico basado en tus preferencias.";

      return {
        ...auto,
        match_percent: calculateMatch(auto),
        veredicto,
        versiones: vRaw.map(v => ({ ...v, match_percent: calculateMatch(v) }))
      };
    }));

    return NextResponse.json({ success: true, top10 });

  } catch (error: any) {
    console.error("ERROR CRÍTICO:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
