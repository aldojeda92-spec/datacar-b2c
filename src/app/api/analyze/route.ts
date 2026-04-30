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

    // 1. NORMALIZACIÓN DE ENTRADAS
    const ensureArray = (val: any): string[] => {
      if (!val) return [];
      if (Array.isArray(val)) return val;
      if (typeof val === 'string' && val.trim() !== '') return [val];
      return [];
    };

    const attrs = ensureArray(leadData.atributos);
    const sMotorizaciones = ensureArray(leadData.motorizacion);
    const sTipos = ensureArray(leadData.tipoVehiculo);
    const sOrigenes = ensureArray(leadData.origen);
    const sConcesionarias = ensureArray(leadData.concesionariaPreferencia);

    const mappingOrigen: Record<string, string> = {
      'Solo Chinos': 'China',
      'Solo Japoneses': 'Japón',
      'Solo Coreanos': 'Corea',
      'Solo Europeos': 'Europa',
    };
    const origenesDB = sOrigenes.map(o => mappingOrigen[o] || o).filter(Boolean);

    // 2. CONSULTA BASE (SEGURA Y RÁPIDA)
    const universoAutos = await db.select().from(catalogoMatriz).where(and(
      gte(catalogoMatriz.precioUsd, leadData.presupuestoMin),
      lte(catalogoMatriz.precioUsd, leadData.presupuestoMax)
    ));

    // 3. REGLA DE ORO: SCORING DE JERARQUÍA (PROCESADO EN JS)
    const rankingOrdenado = universoAutos.map(auto => {
      let score = 0;

      // SUPER PRIORIDAD: CARROCERÍA (50.000 pts)
      const matchesTipo = sTipos.length === 0 || sTipos.some(t => auto.tipoCarroceria?.toLowerCase().includes(t.toLowerCase()));
      if (matchesTipo && sTipos.length > 0) score += 50000;

      // PRIORIDAD ALTA: MOTORIZACIÓN (20.000 pts)
      const matchesMotor = sMotorizaciones.length === 0 || sMotorizaciones.some(m => auto.combustible?.toLowerCase().includes(m.toLowerCase()));
      if (matchesMotor && sMotorizaciones.length > 0) score += 20000;

      // PRIORIDAD MEDIA: ORIGEN (15.000 pts)
      const matchesOrigen = origenesDB.length === 0 || origenesDB.some(o => auto.origenMarca?.toLowerCase().includes(o.toLowerCase()));
      if (matchesOrigen && origenesDB.length > 0) score += 15000;

      // PRIORIDAD BAJA: CONCESIONARIA (10.000 pts)
      const matchesConce = sConcesionarias.includes('Todas') || sConcesionarias.length === 0 || sConcesionarias.includes(auto.concesionaria || '');
      if (matchesConce && sConcesionarias.length > 0 && !sConcesionarias.includes('Todas')) score += 10000;

      // BONUS: SEGURIDAD (Airbags * 500)
      if (attrs.includes('Seguridad')) {
        const airbags = parseInt(auto.airbags?.toString().replace(/\D/g, '') || '0');
        score += (airbags * 500);
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

    // 5. IA: ANÁLISIS DE ATRIBUTOS (GEMINI 3 FLASH)
    let veredictosIA: string[] = [];
    if (finalTop.length > 0) {
      try {
        const prompt = {
          contents: [{
            parts: [{
              text: `Eres un experto automotriz en Paraguay. Analiza estos 10 autos para un cliente que busca: ${attrs.join(', ')}.
              Para cada auto, escribe una conclusión técnica de máximo 15 palabras sobre por qué encaja con sus deseos.
              Lista de autos:
              ${finalTop.map((a, i) => `${i + 1}. ${a.marca} ${a.modelo}: ${a.airbags} airbags, combustible ${a.combustible}, baulera ${a.bauleraLitros}L`).join('\n')}`
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
        veredictosIA = rawText.split('\n').filter((l: string) => l.trim().length > 5);
      } catch (e) {
        console.error("Error IA:", e);
      }
    }

    // 6. CÁLCULO DE MATCH % GENEROSO Y DIFERENCIADO
    const calculateMatch = (v: any) => {
      let s = 0;
      if (sTipos.some(t => v.tipoCarroceria?.toLowerCase().includes(t.toLowerCase()))) s += 50000;
      if (sMotorizaciones.some(m => v.combustible?.toLowerCase().includes(m.toLowerCase()))) s += 15000;
      if (origenesDB.some(o => v.origenMarca?.toLowerCase().includes(o.toLowerCase()))) s += 10000;
      
      if (attrs.includes('Seguridad')) {
        const ab = parseInt(v.airbags?.toString().replace(/\D/g, '') || '0');
        s += (ab * 800);
      }

      const result = Math.round((s / 75000) * 100);
      return Math.min(result, 99);
    };

    // 7. FORMATEO FINAL
    const top10 = await Promise.all(finalTop.map(async (auto, index) => {
      const vRaw = await db.query.catalogoMatriz.findMany({
        where: eq(catalogoMatriz.modelo, auto.modelo),
        orderBy: [catalogoMatriz.precioUsd]
      });

      const veredicto = veredictosIA[index]?.replace(/^\d+[\.\)\s]*/, '').trim() || "Excelente equilibrio técnico basado en tus preferencias.";

      return {
        ...auto,
        match_percent: calculateMatch(auto),
        veredicto,
        versiones: vRaw.map(v => ({ ...v, match_percent: calculateMatch(v) }))
      };
    }));

    return NextResponse.json({ success: true, top10 });

  } catch (error: any) {
    console.error("CRITICAL ERROR:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
