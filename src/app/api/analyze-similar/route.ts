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
    // FASE 1: Extraer el ADN del Auto Ancla 
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

    // Intento 1: MISMA carrocería AND MISMO subsegmento, Precio +/- 15%
    let result = await db.execute(sql`
      SELECT * FROM catalogo_matriz 
      WHERE id != ${autoAnclaId}::uuid 
      AND precio_usd::numeric >= ${precioMin1} 
      AND precio_usd::numeric <= ${precioMax1} 
      AND tipo_carroceria = ${tipoCarroceria} 
      AND subsegmento = ${subsegmento}
    `);

    let resultRows: any[] = (result as any).rows || result;

    // Intento 2 (Modo Rescate): Ampliamos precio y subsegmento, pero MANTENEMOS la Carrocería estricta
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

      if (attrs.includes('Precio') && precioAuto <= precioBase) score += 15;
      
      if (attrs.includes('Espacio')) {
        if (bauleraAuto > bauleraAncla) score += 10;
        if (auto.largo > ancla.largo) score += 5;
      }
      
      if (attrs.includes('Seguridad')) {
        if (auto.airbags >= ancla.airbags) score += 10;
        if (auto.adas && auto.adas.toLowerCase() !== 'no') score += 5;
      }

      if (attrs.includes('Tecnología') || attrs.includes('Tecnologia')) {
        if (auto.tamanho_pantalla && auto.tamanho_pantalla.length > 3) score += 10;
        if (auto.camaras && auto.camaras.toLowerCase().includes('360')) score += 5;
      }

      score = Math.min(score, 99); 

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

    // ==========================================
    // FASE 3.5: AGRUPACIÓN POR MODELO
    // ==========================================
    
    // 1. Ordenamos TODOS los candidatos para que los mejores queden arriba
    candidatos.sort((a: any, b: any) => {
      if (b.match_percent !== a.match_percent) {
        return b.match_percent - a.match_percent;
      }
      return a.precioUsd - b.precioUsd; // Si empatan, prioriza el más barato
    });

    const modelosAgrupados = new Map();

    // 2. Agrupamos metiendo las versiones secundarias al array "versiones"
    candidatos.forEach((auto: any) => {
      const key = `${auto.marca}-${auto.modelo}`;
      
      if (!modelosAgrupados.has(key)) {
        // Es la primera vez que vemos este modelo (el representante)
        auto.versiones = [{ ...auto, versiones: [] }];
        modelosAgrupados.set(key, auto);
      } else {
        // Ya vimos este modelo, lo agregamos como versión alternativa
        modelosAgrupados.get(key).versiones.push({ ...auto, versiones: [] });
      }
    });

    // 3. Extraemos la lista limpia sin duplicados de modelo
    const candidatosUnicos = Array.from(modelosAgrupados.values());

    // ==========================================
    // FASE 4: Top 10 Final
    // ==========================================
    const top10 = candidatosUnicos.slice(0, 10).map((auto: any, index: number) => ({
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
