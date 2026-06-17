// src/app/api/analyze-similar/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { autoAnclaId, atributos } = body;

    if (!autoAnclaId) {
      return NextResponse.json({ success: false, error: 'Se requiere el ID del auto ancla' }, { status: 400 });
    }

    const attrs = atributos || [];

    // ==========================================
    // FASE 1: Extraer el ADN del Auto Ancla (Forzamos UUID)
    // ==========================================
    const anclaResult = await db.execute(sql`
      SELECT * FROM catalogo_matriz 
      WHERE id = ${autoAnclaId}::uuid 
      LIMIT 1
    `);
    
    const anclaRows: any[] = (anclaResult as any).rows || anclaResult;

    if (!anclaRows || anclaRows.length === 0) {
      return NextResponse.json({ success: false, error: 'Auto ancla no encontrado en la base de datos' }, { status: 404 });
    }

    const ancla = anclaRows[0];
    const precioBase = parseFloat(ancla.precio_usd) || 0;
    const tipoCarroceria = ancla.tipo_carroceria || '';
    const subsegmento = ancla.subsegmento || '';

    // ==========================================
    // FASE 2: El Colador Elástico (Búsqueda en Espiral)
    // ==========================================
    let esRescate = false;
    
    const precioMin1 = precioBase * 0.85;
    const precioMax1 = precioBase * 1.15;

    // Intento 1: Mismo subsegmento o carrocería, Precio +/- 15%
    // Convertimos precio_usd a numeric para que no falle si la columna es texto
    let result = await db.execute(sql`
      SELECT * FROM catalogo_matriz 
      WHERE id != ${autoAnclaId}::uuid 
      AND precio_usd::numeric >= ${precioMin1} 
      AND precio_usd::numeric <= ${precioMax1} 
      AND (subsegmento = ${subsegmento} OR tipo_carroceria = ${tipoCarroceria})
    `);

    let resultRows: any[] = (result as any).rows || result;

    // Intento 2 (Modo Rescate): Si hay menos de 3 competidores, ampliamos la espiral
    if (resultRows.length < 3) {
      esRescate = true;
      const precioMin2 = precioBase * 0.70;
      const precioMax2 = precioBase * 1.30;
      
      result = await db.execute(sql`
        SELECT * FROM catalogo_matriz 
        WHERE id != ${autoAnclaId}::uuid 
        AND precio_usd::numeric >= ${precioMin2} 
        AND precio_usd::numeric <= ${precioMax2} 
        AND tipo_carroceria = ${tipoCarroceria}
      `);
      resultRows = (result as any).rows || result;
    }

    // ==========================================
    // FASE 3: Sistema de Puntuación Dinámica
    // ==========================================
    let candidatos = resultRows.map((auto: any) => {
      let score = 70; // Puntaje base

      const precioAuto = parseFloat(auto.precio_usd) || 0;
      const bauleraAuto = parseInt(auto.baulera_litros) || 0;
      const bauleraAncla = parseInt(ancla.baulera_litros) || 0;

      // Premio por PRECIO
      if (attrs.includes('Precio') && precioAuto <= precioBase) score += 15;
      
      // Premio por ESPACIO
      if (attrs.includes('Espacio')) {
        if (bauleraAuto > bauleraAncla) score += 10;
        if (auto.largo > ancla.largo) score += 5;
      }
      
      // Premio por SEGURIDAD
      if (attrs.includes('Seguridad')) {
        if (auto.airbags >= ancla.airbags) score += 10;
        if (auto.adas && auto.adas.toLowerCase() !== 'no') score += 5;
      }

      // Premio por TECNOLOGÍA
      if (attrs.includes('Tecnología') || attrs.includes('Tecnologia')) {
        if (auto.tamanho_pantalla && auto.tamanho_pantalla.length > 3) score += 10;
        if (auto.camaras && auto.camaras.toLowerCase().includes('360')) score += 5;
      }

      score = Math.min(score, 99); 

      // ==========================================
      // FASE 4: Veredicto Comercial Automático
      // ==========================================
      let veredicto = `Sólida alternativa al ${ancla.marca} ${ancla.modelo}. `;
      if (precioAuto < precioBase) veredicto += `Destaca por requerir menor inversión. `;
      if (bauleraAuto > bauleraAncla) veredicto += `Supera al modelo de referencia en capacidad de baulera (${bauleraAuto}L). `;
      if (auto.adas && (!ancla.adas || String(ancla.adas).toLowerCase() === 'no')) veredicto += `Incluye asistencias avanzadas (ADAS) ausentes en el ancla. `;

      return {
        id: auto.id,
        match_percent: score,
        marca: auto.marca,
        modelo: auto.modelo,
        version: auto.version,
        precioUsd: precioAuto,
        origenMarca: auto.origen_marca,
        combustible: auto.combustible,
        urlImagen: auto.url_imagen,
        motor: auto.motor,
        traccion: auto.traccion,
        transmision: auto.transmision,
        bauleraLitros: bauleraAuto,
        garantia: auto.garantia,
        adas: auto.adas,
        airbags: auto.airbags,
        tamanhoPantalla: auto.tamanho_pantalla,
        camaras: auto.camaras,
        plazas: auto.plazas,
        largo: auto.largo,
        ancho: auto.ancho,
        alto: auto.alto,
        despejeSuelo: auto.despeje_suelo,
        asientoCuero: auto.asiento_cuero,
        techoPanoramico: auto.techo_panoramico,
        conectividad: auto.conectividad,
        concesionaria: auto.concesionaria,
        subsegmento: auto.subsegmento,
        veredicto: veredicto.trim(),
        versiones: []
      };
    });

    candidatos.sort((a: any, b: any) => b.match_percent - a.match_percent);

    const top10 = candidatos.slice(0, 10).map((auto: any, index: number) => ({
      ...auto,
      puesto: index + 1
    }));

    return NextResponse.json({ 
      success: true, 
      esRescate: esRescate,
      top10: top10 
    });

  } catch (error: any) {
    console.error("Error en API Similitud:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
