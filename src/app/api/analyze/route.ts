import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { catalogoMatriz, leads } from '@/lib/schema';
import { eq, and, gte, lte, ilike, or, inArray } from 'drizzle-orm';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { leadId } = await req.json();
    const leadData = await db.query.leads.findFirst({ where: eq(leads.id, leadId) });
    if (!leadData) return NextResponse.json({ error: "Lead no encontrado" }, { status: 404 });

    // --- NORMALIZACIÓN DE DATOS ---
    const ensureArray = (val: any): string[] => {
      if (!val) return [];
      if (Array.isArray(val)) return val;
      if (typeof val === 'string' && val.trim() !== '') return [val];
      return [];
    };

    const attrs = ensureArray(leadData.atributos); // Los 3 atributos (Seguridad, etc.)
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

    // --- 1. SQL: FILTRO DURO (Regla de Oro) ---
    const conditions = [
      gte(catalogoMatriz.precioUsd, leadData.presupuestoMin),
      lte(catalogoMatriz.precioUsd, leadData.presupuestoMax)
    ];

    // Filtro estricto de Carrocería
    if (sTipos.length > 0) {
      conditions.push(or(...sTipos.map(t => ilike(catalogoMatriz.tipoCarroceria, `%${t}%`)))!);
    }

    // Filtro estricto de Motorización
    if (sMotorizaciones.length > 0) {
      conditions.push(or(...sMotorizaciones.map(m => ilike(catalogoMatriz.combustible, `%${m}%`)))!);
    }

    // Filtro estricto de Origen
    if (origenesDB.length > 0) {
      conditions.push(or(...origenesDB.map(o => ilike(catalogoMatriz.origenMarca, `%${o}%`)))!);
    }

    // Filtro estricto de Concesionaria
    if (sConcesionarias.length > 0 && !sConcesionarias.includes('Todas')) {
      conditions.push(inArray(catalogoMatriz.concesionaria, sConcesionarias));
    }

    const candidatos = await db.select().from(catalogoMatriz)
      .where(and(...conditions))
      .limit(50);

    // Agrupación por modelo (Máximo 10)
    const vistos = new Set();
    const finalTop = [];
    for (const auto of candidatos) {
      if (!vistos.has(auto.modelo) && finalTop.length < 10) {
        vistos.add(auto.modelo);
        finalTop.push(auto);
      }
    }

    // --- 2. IA: JUSTIFICACIÓN POR ATRIBUTOS ---
    let veredictosIA: string[] = [];
    if (finalTop.length > 0) {
      try {
        const prompt = `Actúa como consultor automotriz. El cliente busca estas 3 prioridades: ${attrs.join(', ')}.
        Para cada uno de los siguientes 10 autos, justifica por qué es la opción ideal basándote EXCLUSIVAMENTE en esos 3 atributos y sus datos técnicos.
        
        REGLA: Devuelve solo las justificaciones, una por línea, máximo 18 palabras por cada una. No nombres el auto.
        
        Lista de autos:
        ${finalTop.map(a => `${a.marca} ${a.modelo}: ${a.airbags} airbags, combustible ${a.combustible}, baulera ${a.bauleraLitros}L, ADAS: ${a.adas}`).join('\n')}`;

        const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash:generateContent?key=${process.env.GOOGLE_GENERATIVE_AI_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        const aiData = await aiRes.json();
        const rawText = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
        veredictosIA = rawText.split('\n').filter((line: string) => line.trim().length > 5);
      } catch (e) {
        console.error("Error IA:", e);
      }
    }

    // --- MATCH % Y FORMATEO ---
    const calculateMatch = (v: any) => {
      // Como ya pasaron el filtro duro, el match depende de los atributos (Seguridad/Espacio)
      let score = 80; // Base por cumplir todos los filtros estrictos
      if (attrs.includes('Seguridad') && (parseInt(v.airbags) >= 6 || v.adas?.includes('Full'))) score += 10;
      if (attrs.includes('Espacio') && parseInt(v.bauleraLitros) > 450) score += 9;
      return Math.min(score, 99);
    };

    const top10 = await Promise.all(finalTop.map(async (auto, index) => {
      const vRaw = await db.query.catalogoMatriz.findMany({
        where: eq(catalogoMatriz.modelo, auto.modelo),
        orderBy: [catalogoMatriz.precioUsd]
      });

      return {
        ...auto,
        match_percent: calculateMatch(auto),
        veredicto: veredictosIA[index]?.trim() || "Cumple estrictamente con tu configuración de motor, carrocería y presupuesto.",
        versiones: vRaw.map(v => ({ ...v, match_percent: calculateMatch(v) }))
      };
    }));

    return NextResponse.json({ success: true, top10 });

  } catch (error: any) {
    console.error("CRITICAL ERROR:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
