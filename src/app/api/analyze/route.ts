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

  // 1. PREPARACIÓN DE FILTROS (ARRAYS) - Corregido con "as unknown"
    const attrs = (leadData.atributos as unknown as string[]) || [];
    const sMotorizaciones = (leadData.motorizacion as unknown as string[]) || [];
    const sTipos = (leadData.tipoVehiculo as unknown as string[]) || [];
    const sOrigenes = (leadData.origen as unknown as string[]) || [];
    const sConcesionarias = (leadData.concesionariaPreferencia as unknown as string[]) || [];

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

    // Convertimos los orígenes seleccionados a sus valores de base de datos
    const origenesDB = sOrigenes.map(o => mappingOrigen[o]).filter(Boolean);

    // --- FUNCIÓN DE SCORING INTERNO (Para Versiones) ---
    const calculateMatch = (auto: any) => {
      let score = 0;
      
      // Puntaje por Origen (si coincide con alguno de la lista)
      if (origenesDB.length === 0 || origenesDB.some(o => auto.origenMarca?.includes(o))) score += 3000;
      
      // Puntaje por Motorización
      if (sMotorizaciones.length === 0 || sMotorizaciones.some(m => auto.combustible?.includes(m))) score += 2000;
      
      if (quiereSeguridad) {
        const numAirbags = parseInt(auto.airbags) || 0;
        score += (numAirbags * 500);
        if (auto.adas?.includes('Full')) score += 2000;
        else if (auto.adas?.includes('Intermedio')) score += 1000;
      }
      if (quiereEspacio) {
        score += ((auto.bauleraLitros || 0) * 5) + ((auto.despejeSuelo || 0) * 2);
      }
      if (quiereTecno) {
        if (auto.tamanhoPantalla?.includes('10') || auto.tamanhoPantalla?.includes('12')) score += 1500;
        if (auto.conectividad?.includes('Inalámbrica')) score += 1000;
      }
      if (quiereEficiencia && (auto.combustible?.includes('Hybrid') || auto.combustible?.includes('EV'))) {
        score += 4000;
      }
      // DIVISOR CALIBRADO A 8500 para mejores %
      return Math.min(Math.round((score / 8500) * 100), 99);
    };

    // 2. FILTRADO DINÁMICO SQL
    // Construimos las condiciones WHERE según si hay selecciones o no
    const conditions = [
      gte(catalogoMatriz.precioUsd, leadData.presupuestoMin),
      lte(catalogoMatriz.precioUsd, leadData.presupuestoMax),
    ];

    if (sTipos.length > 0) {
      conditions.push(or(...sTipos.map(t => ilike(catalogoMatriz.tipoCarroceria, `%${t}%`)))!);
    }
    if (sConcesionarias.length > 0) {
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
      tamanhoPantalla: catalogoMatriz.tamanhoPantalla,
      conectividad: catalogoMatriz.conectividad,
      score: sql<number>`
        (CASE WHEN ${origenesDB.length === 0} OR ${catalogoMatriz.origenMarca} ILIKE ANY(ARRAY[${origenesDB.length > 0 ? origenesDB.map(o => '%' + o + '%') : ['%']}]) THEN 3000 ELSE 0 END) +
        (CASE WHEN ${sMotorizaciones.length === 0} OR ${catalogoMatriz.combustible} ILIKE ANY(ARRAY[${sMotorizaciones.length > 0 ? sMotorizaciones.map(m => '%' + m + '%') : ['%']}]) THEN 2000 ELSE 0 END) +
        (CASE WHEN ${quiereSeguridad} = true THEN 
          (CASE WHEN ${catalogoMatriz.airbags} ~ '^[0-9]+$' THEN CAST(${catalogoMatriz.airbags} AS INTEGER) ELSE 0 END * 500) + 
          (CASE WHEN ${catalogoMatriz.adas} ILIKE '%Full%' THEN 2000 WHEN ${catalogoMatriz.adas} ILIKE '%Intermedio%' THEN 1000 ELSE 0 END)
        ELSE 0 END) +
        (CASE WHEN ${quiereEspacio} = true THEN (COALESCE(${catalogoMatriz.bauleraLitros}, 0) * 5) + (COALESCE(${catalogoMatriz.despejeSuelo}, 0) * 2) ELSE 0 END)
      `.as('score')
    })
    .from(catalogoMatriz)
    .where(and(...conditions))
    .orderBy(sql`score DESC`, catalogoMatriz.precioUsd)
    .limit(100);

    const vistos = new Set();
    const rankingPrevio = [];
    for (const auto of candidatos) {
      if (!vistos.has(auto.modelo) && rankingPrevio.length < 10) {
        vistos.add(auto.modelo);
        rankingPrevio.push(auto);
      }
    }

    // 3. IA: GENERACIÓN DE DESTACADOS
    let veredictosIA: string[] = [];
    try {
      const prompt = {
        contents: [{
          parts: [{
            text: `Eres un experto automotriz en Paraguay. Analiza estos 10 autos para un cliente que prioriza: ${attrs.join(', ')}.
            Sus preferencias adicionales son: Origen(${sOrigenes.join(', ')}), Motores(${sMotorizaciones.join(', ')}).
            Escribe una frase de máximo 15 palabras para CADA UNO resaltando sus virtudes según esos datos. 
            No los compares entre sí. No uses negritas ni asteriscos. Devuelve solo las frases.

            Lista:
            ${rankingPrevio.map((a, i) => `${i+1}. ${a.marca} ${a.modelo}: ${a.airbags} airbags, baulera ${a.bauleraLitros}L, ADAS: ${a.adas}`).join('\n')}`
          }]
        }]
      };

      const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${process.env.GOOGLE_GENERATIVE_AI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prompt)
      });
      const aiData = await aiRes.json();
      const rawText = aiData.candidates[0].content.parts[0].text;
      veredictosIA = rawText.split('\n').filter((l: string) => l.trim().length > 5);
    } catch (e) { console.error("Error IA:", e); }

    const top10 = await Promise.all(rankingPrevio.map(async (auto, index) => {
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
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
