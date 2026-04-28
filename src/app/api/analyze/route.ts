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

    // 1. MAPEO DE CRITERIOS
    const mappingOrigen: Record<string, string> = {
      'Solo Chinos': 'China',
      'Solo Japoneses': 'Japón',
      'Solo Coreanos': 'Corea',
      'Solo europeos': 'Europa',
    };

    const sOrigen = mappingOrigen[leadData.origen || ''] || '';
    const sMotor = leadData.motorizacion === 'Todos' ? '' : leadData.motorizacion;
    const sConcesionaria = leadData.concesionariaPreferencia === 'Todas' ? '' : leadData.concesionariaPreferencia;

    // 2. CONSULTA CON SCORING
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
      score: sql<number>`
        (CASE WHEN ${catalogoMatriz.origenMarca} ILIKE ${'%' + sOrigen + '%'} THEN 10000 ELSE 0 END) +
        (CASE WHEN ${catalogoMatriz.combustible} ILIKE ${'%' + sMotor + '%'} THEN 5000 ELSE 0 END) +
        (CASE WHEN ${catalogoMatriz.concesionaria} ILIKE ${'%' + sConcesionaria + '%'} THEN 2000 ELSE 0 END)
      `.as('score')
    })
    .from(catalogoMatriz)
    .where(and(
      gte(catalogoMatriz.precioUsd, leadData.presupuestoMin),
      lte(catalogoMatriz.precioUsd, leadData.presupuestoMax),
      ilike(catalogoMatriz.tipoCarroceria, `%${leadData.tipoVehiculo}%`)
    ))
    .orderBy(sql`score DESC`, catalogoMatriz.precioUsd)
    .limit(100);

    // 3. UNICIDAD DE MODELOS
    const vistos = new Set();
    const rankingPrevio = [];

    for (const auto of candidatos) {
      if (!vistos.has(auto.modelo) && rankingPrevio.length < 10) {
        vistos.add(auto.modelo);
        rankingPrevio.push(auto);
      }
    }

    // 4. BÚSQUEDA DE VERSIONES EN PARALELO (Soluciona el error de TypeScript y mejora velocidad)
    const top10 = await Promise.all(rankingPrevio.map(async (auto) => {
      const versiones = await db.query.catalogoMatriz.findMany({
        where: eq(catalogoMatriz.modelo, auto.modelo),
        orderBy: [catalogoMatriz.precioUsd]
      });

      return {
        ...auto,
        match_percent: auto.score >= 10000 ? 99 : 75,
        versiones: versiones // Ahora TypeScript entiende que esto es parte del nuevo objeto
      };
    }));

    return NextResponse.json({ success: true, top10 });

  } catch (error: any) {
    console.error("Error en analyze:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
