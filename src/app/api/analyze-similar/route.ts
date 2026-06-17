// src/app/api/analyze-similar/route.ts
import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

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
    const anclaQuery = await pool.query('SELECT * FROM catalogo_matriz WHERE id = $1 LIMIT 1', [autoAnclaId]);
    
    if (anclaQuery.rowCount === 0) {
      return NextResponse.json({ success: false, error: 'Auto ancla no encontrado en la base de datos' }, { status: 404 });
    }

    const ancla = anclaQuery.rows[0];
    const precioBase = parseFloat(ancla.precio_usd) || 0;
    const tipoCarroceria = ancla.tipo_carroceria || '';
    const subsegmento = ancla.subsegmento || '';

    // ==========================================
    // FASE 2: El Colador Elástico (Búsqueda en Espiral)
    // ==========================================
    let esRescate = false;
    
    // Intento 1: Mismo subsegmento o carrocería, Precio +/- 15%
    let query = `
      SELECT * FROM catalogo_matriz 
      WHERE id != $1 
      AND precio_usd >= $2 AND precio_usd <= $3 
      AND (subsegmento = $4 OR tipo_carroceria = $5)
    `;
    let values = [autoAnclaId, precioBase * 0.85, precioBase * 1.15, subsegmento, tipoCarroceria];
    
    let result = await pool.query(query, values);

    // Intento 2 (Modo Rescate): Si hay menos de 3 competidores, ampliamos la espiral
    if (result.rowCount < 3) {
      esRescate = true;
      query = `
        SELECT * FROM catalogo_matriz 
        WHERE id != $1 
        AND precio_usd >= $2 AND precio_usd <= $3 
        AND tipo_carroceria = $4
      `;
      // Ampliamos el precio a +/- 30% y solo exigimos misma carrocería general
      values = [autoAnclaId, precioBase * 0.70, precioBase * 1.30, tipoCarroceria];
      result = await pool.query(query, values);
    }

    // ==========================================
    // FASE 3: Sistema de Puntuación Dinámica
    // ==========================================
    let candidatos = result.rows.map(auto => {
      let score = 70; // Puntaje base por pertenecer a la misma categoría/rango de precio

      const precioAuto = parseFloat(auto.precio_usd) || 0;
      const bauleraAuto = parseInt(auto.baulera_litros) || 0;
      const bauleraAncla = parseInt(ancla.baulera_litros) || 0;

      // Premio por PRECIO: Si es más barato que el ancla
      if (attrs.includes('Precio') && precioAuto <= precioBase) score += 15;
      
      // Premio por ESPACIO: Si tiene más baulera o es más largo
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

      score = Math.min(score, 99); // Tope máximo del 99%

      // ==========================================
      // FASE 4: Veredicto Comercial Automático
      // ==========================================
      let veredicto = `Sólida alternativa al ${ancla.marca} ${ancla.modelo}. `;
      if (precioAuto < precioBase) veredicto += `Destaca por requerir menor inversión. `;
      if (bauleraAuto > bauleraAncla) veredicto += `Supera al modelo de referencia en capacidad de baulera (${bauleraAuto}L). `;
      if (auto.adas && (!ancla.adas || ancla.adas.toLowerCase() === 'no')) veredicto += `Incluye asistencias avanzadas (ADAS) ausentes en el ancla. `;

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
        versiones: [] // Mantenemos compatibilidad con tu interfaz
      };
    });

    // Ordenamos por puntaje de mayor a menor
    candidatos.sort((a, b) => b.match_percent - a.match_percent);

    // Tomamos el Top 10 y asignamos el 'puesto'
    const top10 = candidatos.slice(0, 10).map((auto, index) => ({
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
