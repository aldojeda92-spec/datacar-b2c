import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { catalogoMatriz, leads } from '@/lib/schema';
import { eq, and, gte, lte, ilike, sql, or } from 'drizzle-orm';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { leadId } = await req.json();
    const leadData = await db.query.leads.findFirst({ where: eq(leads.id, leadId) });
    if (!leadData) return NextResponse.json({ error: "Lead no encontrado" }, { status: 404 });

    // 1. NORMALIZACIÓN DE FILTROS (Manejo de arrays/checklists)
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

    const quiereSeguridad = attrs.includes('Seguridad');
    const quiereEspacio = attrs.includes('Espacio');

    const mappingOrigen: Record<string, string> = {
      'Solo Chinos': 'China',
      'Solo Japoneses': 'Japón',
      'Solo Coreanos': 'Corea',
      'Solo Europeos': 'Europa',
    };
    const origenesDB = sOrigenes.map(o => mappingOrigen[o] || o).filter(Boolean);

    // 2. SELECCIÓN POR PESOS (Filtro Inteligente)
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
      airbags: catalogoMatriz.airbags,
      adas: catalogoMatriz.adas,
      score: sql<number>`
        -- Prioridad por Tipo de Carrocería (4000 pts)
        (CASE WHEN ${sTipos.length > 0} AND ${catalogoMatriz.tipoCarroceria} ILIKE ANY(ARRAY[${sTipos.length > 0 ? sTipos.map(t => '%' + t + '%') : ['%']}]) THEN 4000 ELSE 0 END) +
        
        -- Prioridad por Origen (3000 pts)
        (CASE WHEN ${origenesDB.length > 0} AND ${catalogoMatriz.origenMarca} ILIKE ANY(ARRAY[${origenesDB.length > 0 ? origenesDB.map(o => '%' + o + '%') : ['%']}]) THEN 3000 ELSE 0 END) +
        
        -- Prioridad por Motorización (2000 pts)
        (CASE WHEN ${sMotorizaciones.length > 0} AND ${catalogoMatriz.combustible} ILIKE ANY(ARRAY[${sMotorizaciones.length > 0 ? sMotorizaciones.map(m => '%' + m + '%') : ['%']}]) THEN 2000 ELSE 0 END) +

        -- Seguridad (Airbags * 500 + ADAS)
        (CASE WHEN ${quiereSeguridad} = true THEN 
          (CASE WHEN ${catalogoMatriz.airbags} ~ '^[0-9]+$' THEN CAST(${catalogoMatriz.airbags} AS INTEGER) ELSE 0 END * 500) + 
          (CASE WHEN ${catalogoMatriz.adas} ILIKE '%Full%' THEN 2000 WHEN ${catalogoMatriz.adas} ILIKE '%Intermedio%' THEN 1000 ELSE 0 END)
        ELSE 0 END) +

        -- Espacio (Baulera * 5 + Despeje * 2)
        (CASE WHEN ${quiereEspacio} = true THEN (COALESCE(${catalogoMatriz.bauleraLitros}, 0) * 5) + (COALESCE(${catalogoMatriz.despejeSuelo}, 0) * 2) ELSE 0 END)
      `.as('score')
    })
    .from(catalogoMatriz)
    .where(and(
      gte(catalogoMatriz.precioUsd, leadData.presupuestoMin),
      lte(catalogoMatriz.precioUsd, leadData.presupuestoMax)
    ))
    .orderBy(sql`score DESC`, catalogoMatriz.precioUsd)
    .limit(100);

    // 3. AGRUPACIÓN POR MODELO (Top 10 Únicos)
    const vistos = new Set();
    const finalTop = [];
    for (const auto of candidatos) {
      if (!vistos.has(auto.modelo) && finalTop.length < 10) {
        vistos.add(auto.modelo);
        finalTop.push(auto);
      }
    }

    // 4. IA: ANÁLISIS TÉCNICO SOBRE LOS 10 RESULTADOS
    let veredictosIA: string[] = [];
    try {
      const prompt = {
        contents: [{
          parts: [{
            text: `Eres un consultor automotriz en Paraguay. Analiza estos 10 autos para un cliente que busca: ${attrs.join(', ')}.
            Para CADA UNO, escribe un veredicto de 15 palabras resaltando sus ventajas técnicas. No los compares entre sí. No uses negritas ni listas.
            Lista:
            ${finalTop.map((a, i) => `${i+1}. ${a.marca} ${a.modelo}: ${a.airbags} airbags, baulera ${a.bauleraLitros}L`).join('\n')}`
          }]
        }]
      };

      const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash:generateContent?key=${process.env.GOOGLE_GENERATIVE_AI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prompt)
      });
      
      const aiData = await aiRes.json();
      if (aiData.candidates?.[0]?.content?.parts?.[0]?.text) {
        veredictosIA = aiData.candidates[0].content.parts[0].text.split('\n').filter((l: string) => l.trim().length > 5);
      }
    } catch (e) {
      console.error("Error IA:", e);
    }

    // 5. CÁLCULO DE MATCH % (Basado en tu lógica de pesos original)
    const calculateMatch = (v: any) => {
      let s = 0;
      if (origenesDB.some(o => v.origenMarca?.includes(o))) s += 3000;
      if (sMotorizaciones.some(m => v.combustible?.includes(m))) s += 2000;
      if (quiereSeguridad) {
        s += (parseInt(v.airbags) || 0) * 500;
        if (v.adas?.includes('Full')) s += 2000;
      }
      if (quiereEspacio) s += ((v.bauleraLitros || 0) * 5) + ((v.despejeSuelo || 0) * 2);
      return Math.min(Math.round((s / 12000) * 100), 99);
    };

    // 6. MAPEO FINAL DE RESULTADOS
    const top10 = await Promise.all(finalTop.map(async (auto, index) => {
      const vRaw = await db.query.catalogoMatriz.findMany({
        where: eq(catalogoMatriz.modelo, auto.modelo),
        orderBy: [catalogoMatriz.precioUsd]
      });
      const versiones = vRaw.map(v => ({ ...v, match_percent: calculateMatch(v) }));
      const veredictoFinal = veredictosIA[index]?.replace(/^\d+[\.\)\s]*/, '').trim() || "Excelente equilibrio técnico para tu perfil.";

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
