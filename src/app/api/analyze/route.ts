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
    // Agregamos || '' al final para que nunca sea null
    const sMotor = (leadData.motorizacion === 'Todos' ? '' : leadData.motorizacion) || '';

    // Función para calcular score en JS para las versiones secundarias
    const calculateMatch = (auto: any) => {
      let score = 0;
      if (auto.origenMarca?.toLowerCase().includes(sOrigen.toLowerCase())) score += 3000;
      if (auto.combustible?.toLowerCase().includes(sMotor.toLowerCase())) score += 2000;
      
      if (quiereSeguridad) {
        const numAirbags = parseInt(auto.airbags) || 0;
        score += (numAirbags * 500);
        if (auto.adas?.includes('Full')) score += 2000;
        else if (auto.adas?.includes('Intermedio')) score += 1000;
      }
      if (quiereEspacio) {
        score += ((auto.bauleraLitros || 0) * 5);
        score += ((auto.despejeSuelo || 0) * 2);
      }
      if (quiereTecno) {
        if (auto.tamanhoPantalla?.includes('10') || auto.tamanhoPantalla?.includes('12')) score += 1500;
        if (auto.conectividad?.includes('Inalámbrica')) score += 1000;
      }
      if (quiereEficiencia && (auto.combustible?.includes('Hybrid') || auto.combustible?.includes('EV'))) {
        score += 4000;
      }
      return Math.min(Math.round((score / 12000) * 100), 99);
    };

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
      score: sql<number>`
        (CASE WHEN ${catalogoMatriz.origenMarca} ILIKE ${'%' + sOrigen + '%'} THEN 3000 ELSE 0 END) +
        (CASE WHEN ${catalogoMatriz.combustible} ILIKE ${'%' + sMotor + '%'} THEN 2000 ELSE 0 END) +
        (CASE WHEN ${quiereSeguridad} = true THEN 
          (CASE WHEN ${catalogoMatriz.airbags} ~ '^[0-9]+$' THEN CAST(${catalogoMatriz.airbags} AS INTEGER) ELSE 0 END * 500) + 
          (CASE WHEN ${catalogoMatriz.adas} ILIKE '%Full%' THEN 2000 WHEN ${catalogoMatriz.adas} ILIKE '%Intermedio%' THEN 1000 ELSE 0 END)
        ELSE 0 END) +
        (CASE WHEN ${quiereEspacio} = true THEN (COALESCE(${catalogoMatriz.bauleraLitros}, 0) * 5) + (COALESCE(${catalogoMatriz.despejeSuelo}, 0) * 2) ELSE 0 END)
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

    const vistos = new Set();
    const rankingPrevio = [];
    for (const auto of candidatos) {
      if (!vistos.has(auto.modelo) && rankingPrevio.length < 10) {
        vistos.add(auto.modelo);
        rankingPrevio.push(auto);
      }
    }

    const top10 = await Promise.all(rankingPrevio.map(async (auto) => {
      const vRaw = await db.query.catalogoMatriz.findMany({
        where: eq(catalogoMatriz.modelo, auto.modelo),
        orderBy: [catalogoMatriz.precioUsd]
      });
      
      // Cada versión ahora lleva su propio match_percent calculado
      const versiones = vRaw.map(v => ({ ...v, match_percent: calculateMatch(v) }));
      return { ...auto, match_percent: calculateMatch(auto), versiones };
    }));

    return NextResponse.json({ success: true, top10 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
