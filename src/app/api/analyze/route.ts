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

    // 1. FILTROS DUROS (Precio y Tipo de Vehículo)
    const baseFilters = [
      gte(catalogoMatriz.precioUsd, leadData.presupuestoMin),
      lte(catalogoMatriz.precioUsd, leadData.presupuestoMax)
    ];

    // Solo filtramos por tipo si no es "Todos" (o similar)
    if (leadData.tipoVehiculo && leadData.tipoVehiculo !== 'Todos') {
      baseFilters.push(ilike(catalogoMatriz.tipoCarroceria, `%${leadData.tipoVehiculo}%`));
    }

    // 2. LÓGICA DE PRIORIZACIÓN (SCORING)
    const query = db.select({
      id: catalogoMatriz.id,
      marca: catalogoMatriz.marca,
      modelo: catalogoMatriz.modelo,
      version: catalogoMatriz.version,
      precioUsd: catalogoMatriz.precioUsd,
      origen: catalogoMatriz.origen,
      combustible: catalogoMatriz.combustible,
      concesionaria: catalogoMatriz.concesionaria,
      urlImagen: catalogoMatriz.urlImagen,
      // Sistema de puntos para ordenar
      score: sql<number>`
        (CASE WHEN ${catalogoMatriz.origen} ILIKE ${'%' + (leadData.origen === 'Todos' ? '' : leadData.origen) + '%'} THEN 10 ELSE 0 END) +
        (CASE WHEN ${catalogoMatriz.combustible} ILIKE ${'%' + (leadData.motorizacion === 'Todos' ? '' : leadData.motorizacion) + '%'} THEN 10 ELSE 0 END) +
        (CASE WHEN ${catalogoMatriz.concesionaria} ILIKE ${'%' + (leadData.concesionariaPreferencia === 'Todas' ? '' : leadData.concesionariaPreferencia) + '%'} THEN 10 ELSE 0 END)
      `.as('score')
    })
    .from(catalogoMatriz)
    .where(and(...baseFilters))
    .orderBy(sql`score DESC`, catalogoMatriz.precioUsd)
    .limit(100);

    const candidatos = await query;

    // 3. SELECCIÓN DE 10 MODELOS ÚNICOS
    const modelosUnicosVistos = new Set();
    const rankingFinal = [];

    for (const auto of candidatos) {
      if (!modelosUnicosVistos.has(auto.modelo) && rankingFinal.length < 10) {
        modelosUnicosVistos.add(auto.modelo);
        rankingFinal.push({
          ...auto,
          match_percent: auto.score > 0 ? 95 : 70
        });
      }
    }

    return NextResponse.json({ success: true, top10: rankingFinal });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
