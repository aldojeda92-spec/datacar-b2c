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

    // --- MAPEO DE CRITERIOS (Para que coincida con tu CSV) ---
    // Si el usuario elige "Solo Chinos", buscamos "China"
    const mappingOrigen: Record<string, string> = {
      'Solo Chinos': 'China',
      'Solo Japoneses': 'Japón',
      'Solo Coreanos': 'Corea',
      'Solo europeos': 'Europa', // O países específicos si tu CSV los tiene
    };

    const searchOrigen = mappingOrigen[leadData.origen || ''] || '';
    const searchMotor = leadData.motorizacion === 'Todos' ? '' : leadData.motorizacion;
    const searchConcesionaria = leadData.concesionariaPreferencia === 'Todas' ? '' : leadData.concesionariaPreferencia;

    // 1. FILTROS DUROS (Lo que NO puede faltar)
    // Filtramos por precio y por el tipo de vehículo (SUV, Sedan, etc)
    const baseFilters = [
      gte(catalogoMatriz.precioUsd, leadData.presupuestoMin),
      lte(catalogoMatriz.precioUsd, leadData.presupuestoMax),
    ];

    if (leadData.tipoVehiculo && leadData.tipoVehiculo !== 'Todos') {
      baseFilters.push(ilike(catalogoMatriz.tipoCarroceria, `%${leadData.tipoVehiculo}%`));
    }

    // 2. QUERY CON SCORING AGRESIVO
    // Usamos multiplicadores grandes para que el criterio mande sobre el precio
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
      // Sistema de puntos: Si coincide el origen, 10000 puntos. Si no, 0.
      score: sql<number>`
        (CASE WHEN ${catalogoMatriz.origen} ILIKE ${'%' + searchOrigen + '%'} THEN 10000 ELSE 0 END) +
        (CASE WHEN ${catalogoMatriz.combustible} ILIKE ${'%' + searchMotor + '%'} THEN 5000 ELSE 0 END) +
        (CASE WHEN ${catalogoMatriz.concesionaria} ILIKE ${'%' + searchConcesionaria + '%'} THEN 2000 ELSE 0 END)
      `.as('score')
    })
    .from(catalogoMatriz)
    .where(and(...baseFilters))
    .orderBy(sql`score DESC`, catalogoMatriz.precioUsd) // EL SCORE MANDA
    .limit(100);

    const candidatos = await query;

    // 3. SELECCIÓN DE 10 MODELOS ÚNICOS
    const modelosVistos = new Set();
    const ranking = [];

    for (const auto of candidatos) {
      if (!modelosVistos.has(auto.modelo) && ranking.length < 10) {
        modelosVistos.add(auto.modelo);
        ranking.push({
          ...auto,
          // Si el score es alto, el match es casi perfecto
          match_percent: auto.score >= 10000 ? 99 : auto.score >= 5000 ? 90 : 75
        });
      }
    }

    return NextResponse.json({ success: true, top10: ranking });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
