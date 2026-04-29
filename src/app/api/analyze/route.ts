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

    // SQL CON JERARQUÍA DE PESOS
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
      airbags: catalogoMatriz.airbags,
      tipoCarroceria: catalogoMatriz.tipoCarroceria,
      score: sql<number>`
        -- 1. SUPER PRIORIDAD: TIPO DE CARROCERÍA (50.000 pts)
        -- Esto asegura que un Furgón NUNCA le gane a un SUV si el usuario pidió SUV.
        (CASE WHEN ${sTipos.length > 0} AND ${catalogoMatriz.tipoCarroceria} ILIKE ANY(ARRAY[${sTipos.length > 0 ? sTipos.map(t => '%' + t + '%') : ['%']}]) THEN 50000 ELSE 0 END) +
        
        -- 2. PRIORIDAD ALTA: MOTORIZACIÓN (20.000 pts)
        (CASE WHEN ${sMotorizaciones.length > 0} AND ${catalogoMatriz.combustible} ILIKE ANY(ARRAY[${sMotorizaciones.length > 0 ? sMotorizaciones.map(m => '%' + m + '%') : ['%']}]) THEN 20000 ELSE 0 END) +
        
        -- 3. PRIORIDAD MEDIA: ORIGEN (15.000 pts)
        (CASE WHEN ${origenesDB.length > 0} AND ${catalogoMatriz.origenMarca} ILIKE ANY(ARRAY[${origenesDB.length > 0 ? origenesDB.map(o => '%' + o + '%') : ['%']}]) THEN 15000 ELSE 0 END) +

        -- 4. PRIORIDAD BAJA: CONCESIONARIA (10.000 pts)
        (CASE WHEN ${sConcesionarias.length > 0} AND NOT ('Todas' = ANY(ARRAY[${sConcesionarias}])) AND ${catalogoMatriz.concesionaria} = ANY(ARRAY[${sConcesionarias.length > 0 ? sConcesionarias : ['']}]) THEN 10000 ELSE 0 END) +

        -- 5. BONUS: ATRIBUTOS TÉCNICOS (0 a 5.000 pts)
        (CASE WHEN ${attrs.includes('Seguridad')} THEN (COALESCE(NULLIF(${catalogoMatriz.airbags}, '')::int, 0) * 500) ELSE 0 END)
      `.as('score')
    })
    .from(catalogoMatriz)
    .where(and(
      gte(catalogoMatriz.precioUsd, leadData.presupuestoMin),
      lte(catalogoMatriz.precioUsd, leadData.presupuestoMax)
    ))
    .orderBy(sql`score DESC`, catalogoMatriz.precioUsd)
    .limit(100);

    // FILTRO DE MODELOS ÚNICOS (Garantiza 10)
    const vistos = new Set();
    const finalTop = [];
    for (const auto of candidatos) {
      if (!vistos.has(auto.modelo) && finalTop.length < 10) {
        vistos.add(auto.modelo);
        finalTop.push(auto);
      }
    }

    // CÁLCULO DE MATCH % BASADO EN LA JERARQUÍA (Para el Frontend)
    const calculateMatch = (v: any) => {
      let currentScore = 0;
      const totalPossible = 90000; // La suma de los pesos máximos

      if (sTipos.some(t => v.tipoCarroceria?.toLowerCase().includes(t.toLowerCase()))) currentScore += 50000;
      if (sMotorizaciones.some(m => v.combustible?.toLowerCase().includes(m.toLowerCase()))) currentScore += 20000;
      if (origenesDB.some(o => v.origenMarca?.toLowerCase().includes(o.toLowerCase()))) currentScore += 15000;
      
      // Si no coincide en la carrocería, el Match % debe ser bajo por definición (Relleno)
      const matchFinal = Math.round((currentScore / totalPossible) * 100);
      return Math.min(matchFinal, 99);
    };

    // IA: COMENTARIO SOBRE LOS 10 RESULTADOS
    let veredictosIA: string[] = [];
    try {
      const prompt = {
        contents: [{
          parts: [{
            text: `Eres un experto automotriz. Analiza estos 10 autos para un cliente que busca: ${attrs.join(', ')}. 
            Para CADA UNO escribe un veredicto de 15 palabras resaltando sus ventajas. No compares. 
            Lista:
            ${finalTop.map((a, i) => `${i+1}. ${a.marca} ${a.modelo}: ${a.airbags} airbags, ${a.combustible}, ${a.tipoCarroceria}`).join('\n')}`
          }]
        }]
      };
      const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash:generateContent?key=${process.env.GOOGLE_GENERATIVE_AI_API_KEY}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(prompt)
      });
      const aiData = await aiRes.json();
      if (aiData.candidates?.[0]?.content?.parts?.[0]?.text) {
        veredictosIA = aiData.candidates[0].content.parts[0].text.split('\n').filter((l: string) => l.trim().length > 5);
      }
    } catch (e) { console.error(e); }

    const top10 = await Promise.all(finalTop.map(async (auto, index) => {
      const vRaw = await db.query.catalogoMatriz.findMany({
        where: eq(catalogoMatriz.modelo, auto.modelo),
        orderBy: [catalogoMatriz.precioUsd]
      });
      const veredicto = veredictosIA[index]?.replace(/^\d+[\.\)\s]*/, '').trim() || "Opción seleccionada por rango de inversión y disponibilidad.";
      return { 
        ...auto, 
        match_percent: calculateMatch(auto), 
        veredicto, 
        versiones: vRaw.map(v => ({ ...v, match_percent: calculateMatch(v) })) 
      };
    }));

    return NextResponse.json({ success: true, top10 });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
