import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { catalogoMatriz, leads } from '@/lib/schema';
import { eq, and, gte, lte, ilike, sql, inArray } from 'drizzle-orm';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { leadId } = await req.json();
    const leadData = await db.query.leads.findFirst({ where: eq(leads.id, leadId) });
    if (!leadData) return NextResponse.json({ error: "Lead no encontrado" }, { status: 404 });

    // Mapeo exacto para origen_marca
    const mappingOrigen: Record<string, string> = {
      'Solo Chinos': 'China',
      'Solo Japoneses': 'Japón',
      'Solo Coreanos': 'Corea',
      'Solo europeos': 'Europa',
    };

    const sOrigen = mappingOrigen[leadData.origen || ''] || '';
    const sMotor = leadData.motorizacion === 'Todos' ? '' : leadData.motorizacion;
    const sConcesionaria = leadData.concesionariaPreferencia === 'Todas' ? '' : leadData.concesionariaPreferencia;

    const query = db.select({
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

    const candidatos = await query;

    // Unicidad de modelos
    const vistos = new Set();
    const ranking = [];

    for (const auto of candidatos) {
      if (!vistos.has(auto.modelo) && ranking.length < 10) {
        vistos.add(auto.modelo);
        ranking.push({ ...auto, match_percent: auto.score >= 10000 ? 99 : 75 });
      }
    }

    // Buscamos versiones para el botón "+"
    for (let auto of ranking) {
      auto.versiones = await db.query.catalogoMatriz.findMany({
        where: eq(catalogoMatriz.modelo, auto.modelo),
        orderBy: [catalogoMatriz.precioUsd]
      });
    }

    return NextResponse.json({ success: true, top10: ranking });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
