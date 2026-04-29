import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { catalogoMatriz, leads } from '@/lib/schema';
import { eq, and, gte, lte, ilike, sql, inArray, or } from 'drizzle-orm';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { leadId } = await req.json();
    const leadData = await db.query.leads.findFirst({ where: eq(leads.id, leadId) });
    if (!leadData) return NextResponse.json({ error: "Lead no encontrado" }, { status: 404 });

    // --- FUNCIÓN TRADUCTORA ---
    const ensureArray = (val: any): string[] => {
      if (Array.isArray(val)) return val;
      if (typeof val === 'string' && val.trim() !== '') return [val];
      return [];
    };

    const attrs = ensureArray(leadData.atributos);
    const sMotorizaciones = ensureArray(leadData.motorizacion);
    const sTipos = ensureArray(leadData.tipoVehiculo);
    const sOrigenes = ensureArray(leadData.origen);
    const sConcesionarias = ensureArray(leadData.concesionariaPreferencia);

    const quiereSeguridad = attrs.includes('Seguridad');
    const quiereEspacio = attrs.includes('Espacio');
    const quiereTecno = attrs.includes('Tecnología');
    const quiereEficiencia = attrs.includes('Eficiencia');

    const mappingOrigen: Record<string, string> = {
      'Solo Chinos': 'China',
      'Solo Japoneses': 'Japón',
      'Solo Coreanos': 'Corea',
      'Solo Europeos': 'Europa',
    };

    const origenesDB = sOrigenes.map(o => mappingOrigen[o]).filter(Boolean);

    // --- SCORING DINÁMICO ---
    const calculateMatch = (auto: any) => {
      let score = 0;
      if (origenesDB.length === 0 || origenesDB.some(o => auto.origenMarca?.includes(o))) score += 3000;
      if (sMotorizaciones.length === 0 || sMotorizaciones.some(m => auto.combustible?.includes(m))) score += 2000;
      
      if (quiereSeguridad) {
        const numAirbags = parseInt(auto.airbags) || 0;
        score += (numAirbags * 500);
        if (auto.adas?.includes('Full')) score += 2000;
      }
      if (quiereEspacio) score += ((auto.bauleraLitros || 0) * 5) + ((auto.despejeSuelo || 0) * 2);
      
      return Math.min(Math.round((score / 8500) * 100), 99);
    };

    // --- FILTROS SQL SEGUROS ---
    const conditions = [
      gte(catalogoMatriz.precioUsd, leadData.presupuestoMin),
      lte(catalogoMatriz.precioUsd, leadData.presupuestoMax),
    ];

    if (sTipos.length > 0) {
      conditions.push(or(...sTipos.map(t => ilike(catalogoMatriz.tipoCarroceria, `%${t}%`)))!);
    }
    
    if (sConcesionarias.length > 0 && !sConcesionarias.includes('Todas')) {
      conditions.push(inArray(catalogoMatriz.concesionaria, sConcesionarias));
    }

    const candidatos = await db.select({
      id: catalogoMatriz.id,
      marca: catalogoMatriz.marca,
      modelo: catalogoMatriz.modelo,
      version: catalogoMatriz.version,
      precioUsd: catalogoMatriz.precioUsd,
      origenMarca: catalogoMatriz.origenMarca,
      combustible: catalogoMatriz.combustible,
      concesionaria: catalogoMatriz.concesionaria,
      urlImagen: catalogoMatriz.urlImagen,
      bauleraLitros: catalogoMatriz.bauleraLitros,
      despejeSuelo: catalogoMatriz.despejeSuelo,
      adas: catalogoMatriz.adas,
      airbags: catalogoMatriz.airbags,
    })
    .from(catalogoMatriz)
    .where(and(...conditions))
    .limit(100);

    // --- ORDENAMIENTO Y RANKING ---
    const rankingPrevio = candidatos
      .map(c => ({ ...c, internalScore: calculateMatch(c) }))
      .sort((a, b) => b.internalScore - a.internalScore);

    const vistos = new Set();
    const finalTop = [];
    for (const auto of rankingPrevio) {
      if (!vistos.has(auto.modelo) && finalTop.length < 10) {
        vistos.add(auto.modelo);
        finalTop.push(auto);
      }
    }

    // --- 3. IA: GENERACIÓN DE DESTACADOS (CORREGIDO) ---
    let veredictosIA: string[] = [];
    try {
      const prompt = {
        contents: [{
          parts: [{
            text: `Eres un consultor automotriz en Paraguay. Analiza estos 10 autos para un cliente que busca: ${attrs.join(', ')}.
            Para CADA UNO, escribe un veredicto de 15 palabras resaltando sus ventajas técnicas. No los compares entre sí.
            Lista:
            ${finalTop.map((a, i) => `${i+1}. ${a.marca} ${a.modelo}: ${a.airbags} airbags, baulera ${a.bauleraLitros}L`).join('\n')}`
          }]
        }]
      };

      const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GOOGLE_GENERATIVE_AI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prompt)
      });
      
      const aiData = await aiRes.json();

      if (aiData.candidates && aiData.candidates[0] && aiData.candidates[0].content) {
        const rawText = aiData.candidates[0].content.parts[0].text;
        veredictosIA = rawText.split('\n').filter((l: string) => l.trim().length > 5);
      } else {
        console.error("Error en respuesta de IA:", aiData);
        veredictosIA = new Array(finalTop.length).fill("Excelente opción por su configuración técnica.");
      }
    } catch (e) {
      console.error("Error IA:", e);
      veredictosIA = new Array(finalTop.length).fill("Análisis técnico basado en especificaciones.");
    }

    // --- MAPEO FINAL DE RESULTADOS ---
    const top10 = await Promise.all(finalTop.map(async (auto, index) => {
      const vRaw = await db.query.catalogoMatriz.findMany({
        where: eq(catalogoMatriz.modelo, auto.modelo),
        orderBy: [catalogoMatriz.precioUsd]
      });
      
      const versiones = vRaw.map(v => ({ ...v, match_percent: calculateMatch(v) }));
      const veredictoFinal = veredictosIA[index]?.replace(/^\d+[\.\)\s]*/, '').trim() || "Excelente equilibrio técnico.";

      return { 
        ...auto, 
        match_percent: calculateMatch(auto), 
        veredicto: veredictoFinal, 
        versiones 
      };
    }));

    return NextResponse.json({ success: true, top10 });

  } catch (error: any) {
    console.error("CRITICAL ERROR:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
