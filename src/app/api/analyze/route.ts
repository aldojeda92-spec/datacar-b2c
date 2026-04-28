import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { catalogoMatriz, leads } from '@/lib/schema';
import { eq, and, gte, lte, or, ilike, sql } from 'drizzle-orm';

export async function POST(req: Request) {
  try {
    const { leadId } = await req.json();
    const leadData = await db.query.leads.findFirst({ where: eq(leads.id, leadId) });
    if (!leadData) return NextResponse.json({ error: "Lead no encontrado" }, { status: 404 });

    // 1. FILTROS DUROS (Precio y Tipo de Vehículo)
    const baseFilters = [
      gte(catalogoMatriz.precioUsd, leadData.presupuestoMin),
      lte(catalogoMatriz.precioUsd, leadData.presupuestoMax),
      ilike(catalogoMatriz.tipoCarroceria, `%${leadData.tipoVehiculo}%`)
    ];

    // 2. LÓGICA DE PRIORIZACIÓN (SCORING)
    // Asignamos puntos si coincide con la preferencia del usuario
    const query = db.select({
      id: catalogoMatriz.id,
      marca: catalogoMatriz.marca,
      modelo: catalogoMatriz.modelo,
      version: catalogoMatriz.version,
      precioUsd: catalogoMatriz.precioUsd,
      origen: catalogoMatriz.origen,
      motor: catalogoMatriz.motor,
      combustible: catalogoMatriz.combustible,
      concesionaria: catalogoMatriz.concesionaria,
      urlImagen: catalogoMatriz.urlImagen,
      // Sistema de puntos
      score: sql<number>`
        (CASE WHEN ${catalogoMatriz.origen} ILIKE ${'%' + leadData.origen + '%'} THEN 10 ELSE 0 END) +
        (CASE WHEN ${catalogoMatriz.combustible} ILIKE ${'%' + leadData.motorizacion + '%'} THEN 10 ELSE 0 END) +
        (CASE WHEN ${catalogoMatriz.concesionaria} ILIKE ${'%' + leadData.concesionariaPreferencia + '%'} THEN 10 ELSE 0 END)
      `.as('score')
    })
    .from(catalogoMatriz)
    .where(and(...baseFilters))
    .orderBy(sql`score DESC`, catalogoMatriz.precioUsd); // Primero por puntaje, luego por precio

    const candidatos = await query;

    // 3. ASEGURAR 10 MODELOS ÚNICOS
    const modelosUnicosVistos = new Set();
    const rankingFinal: any[] = [];

    for (const auto of candidatos) {
      if (!modelosUnicosVistos.has(auto.modelo) && rankingFinal.length < 10) {
        modelosUnicosVistos.add(auto.modelo);
        
        // Buscamos versiones del modelo
        const versiones = await db.query.catalogoMatriz.findMany({
          where: eq(catalogoMatriz.modelo, auto.modelo),
          orderBy: [catalogoMatriz.precioUsd]
        });

        rankingFinal.push({
          ...auto,
          match_percent: auto.score > 0 ? 95 : 75, // Visualización de relevancia
          versiones: versiones
        });
      }
    }

    return NextResponse.json({ success: true, top10: rankingFinal });
  } catch (e) {
    return NextResponse.json({ success: false, error: "Error en el motor SQL" }, { status: 500 });
  }
}
