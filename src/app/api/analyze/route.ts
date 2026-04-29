import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { catalogoMatriz, leads } from '@/lib/schema';
import { eq, and, gte, lte, ilike, sql } from 'drizzle-orm';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { leadId } = await req.json();
    const leadData = await db.query.leads.findFirst({ where: eq(leads.id, leadId) });
    if (!leadData) return NextResponse.json({ error: "Lead no encontrado" }, { status: 404 });

   // 1. ANALIZAMOS LOS ATRIBUTOS SELECCIONADOS POR EL USUARIO
    // Añadimos "as string[]" para que TypeScript sepa que es una lista de textos
    const attrs = (leadData.atributos as string[]) || [];
    const quiereSeguridad = attrs.includes('Seguridad');
    const quiereEspacio = attrs.includes('Espacio');
    const quiereTecno = attrs.includes('Tecnología');
    const quiereEficiencia = attrs.includes('Eficiencia');

    const mappingOrigen: Record<string, string> = {
      'Solo Chinos': 'China',
      'Solo Japoneses': 'Japón',
      'Solo Coreanos': 'Corea',
      'Solo europeos': 'Europa',
    };

    const sOrigen = mappingOrigen[leadData.origen || ''] || '';
    const sMotor = leadData.motorizacion === 'Todos' ? '' : leadData.motorizacion;
    const sConcesionaria = leadData.concesionariaPreferencia === 'Todas' ? '' : leadData.concesionariaPreferencia;

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
      motor: catalogoMatriz.motor,
      traccion: catalogoMatriz.traccion,
      transmision: catalogoMatriz.transmision,
      bauleraLitros: catalogoMatriz.bauleraLitros,
      largo: catalogoMatriz.largo,
      ancho: catalogoMatriz.ancho,
      alto: catalogoMatriz.alto,
      despejeSuelo: catalogoMatriz.despejeSuelo,
      plazas: catalogoMatriz.plazas,
      adas: catalogoMatriz.adas,
      asientoCuero: catalogoMatriz.asientoCuero,
      techoPanoramico: catalogoMatriz.techoPanoramico,
      tamanhoPantalla: catalogoMatriz.tamanhoPantalla,
      conectividad: catalogoMatriz.conectividad,
      camaras: catalogoMatriz.camaras,
      garantia: catalogoMatriz.garantia,
      airbags: catalogoMatriz.airbags,
      // 2. EL ALGORITMO DE SCORING DINÁMICO
      // 2. EL ALGORITMO DE SCORING DINÁMICO (CORREGIDO)
      score: sql<number>`
        -- Puntaje Base por Origen y Motor
        (CASE WHEN ${catalogoMatriz.origenMarca} ILIKE ${'%' + sOrigen + '%'} THEN 3000 ELSE 0 END) +
        (CASE WHEN ${catalogoMatriz.combustible} ILIKE ${'%' + sMotor + '%'} THEN 2000 ELSE 0 END) +
        
        -- Puntaje por SEGURIDAD (Blindado contra textos vacíos en airbags)
        (CASE WHEN ${quiereSeguridad} = true THEN 
          (CASE 
            WHEN ${catalogoMatriz.airbags} ~ '^[0-9]+$' THEN CAST(${catalogoMatriz.airbags} AS INTEGER) 
            ELSE 0 
          END * 500) + 
          (CASE WHEN ${catalogoMatriz.adas} ILIKE '%Full%' THEN 2000 WHEN ${catalogoMatriz.adas} ILIKE '%Intermedio%' THEN 1000 ELSE 0 END)
        ELSE 0 END) +

        -- Puntaje por ESPACIO
        (CASE WHEN ${quiereEspacio} = true THEN 
          (COALESCE(${catalogoMatriz.bauleraLitros}, 0) * 5) + 
          (COALESCE(${catalogoMatriz.despejeSuelo}, 0) * 2)
        ELSE 0 END) +

        -- Puntaje por TECNOLOGÍA
        (CASE WHEN ${quiereTecno} = true THEN 
          (CASE WHEN ${catalogoMatriz.tamanhoPantalla} ILIKE '%10%' OR ${catalogoMatriz.tamanhoPantalla} ILIKE '%12%' THEN 1500 ELSE 0 END) +
          (CASE WHEN ${catalogoMatriz.conectividad} ILIKE '%Inalámbrica%' THEN 1000 ELSE 0 END)
        ELSE 0 END) +

        -- Puntaje por EFICIENCIA
        (CASE WHEN ${quiereEficiencia} = true AND (${catalogoMatriz.combustible} ILIKE '%Hybrid%' OR ${catalogoMatriz.combustible} ILIKE '%EV%') THEN 4000 ELSE 0 END)
      `.as('score')
    .from(catalogoMatriz)
    .where(and(
      gte(catalogoMatriz.precioUsd, leadData.presupuestoMin),
      lte(catalogoMatriz.precioUsd, leadData.presupuestoMax),
      ilike(catalogoMatriz.tipoCarroceria, `%${leadData.tipoVehiculo}%`)
    ))
    .orderBy(sql`score DESC`, catalogoMatriz.precioUsd)
    .limit(100);

    // 3. AGRUPACIÓN POR MODELO (Evita mostrar 10 versiones del mismo auto)
    const vistos = new Set();
    const rankingPrevio = [];
    for (const auto of candidatos) {
      if (!vistos.has(auto.modelo) && rankingPrevio.length < 10) {
        vistos.add(auto.modelo);
        rankingPrevio.push(auto);
      }
    }

    const top10 = await Promise.all(rankingPrevio.map(async (auto) => {
      const versiones = await db.query.catalogoMatriz.findMany({
        where: eq(catalogoMatriz.modelo, auto.modelo),
        orderBy: [catalogoMatriz.precioUsd]
      });
      
      // Normalizamos el Score a un porcentaje de Match (Max estimado 15000)
      const match_percent = Math.min(Math.round((auto.score / 12000) * 100), 99);

      return { ...auto, match_percent, versiones };
    }));

    return NextResponse.json({ success: true, top10 });
  } catch (error: any) {
    console.error("Error en análisis:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
