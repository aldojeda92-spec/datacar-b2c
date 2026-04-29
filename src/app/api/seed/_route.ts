import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { db } from '@/lib/db';
import { catalogoMatriz } from '@/lib/schema';

export const maxDuration = 60;

export async function GET() {
  try {
    const results: any[] = [];
    const csvPath = path.join(process.cwd(), 'matriz2.csv');
    
    if (!fs.existsSync(csvPath)) {
      return NextResponse.json({ error: "No se encuentra matriz2.csv en la raiz" }, { status: 404 });
    }

    const promise = new Promise((resolve, reject) => {
      fs.createReadStream(csvPath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', resolve)
        .on('error', reject);
    });

    await promise;

    // Limpiamos la tabla antes de cargar
    await db.delete(catalogoMatriz);

  const toInsert = results.map((row) => ({
      concesionaria: row['concesionaria'],
      marca: row['marca'],
      modelo: row['modelo'],
      version: row['version'],
      tipoCarroceria: row['tipo_carroceria'],
      precioUsd: parseInt(row['precio']?.toString().replace(/[^0-9]/g, '') || '0'),
      combustible: row['combustible'],
      motor: row['motor'],
      transmision: row['transmision'],
      traccion: row['traccion'],
      largo: parseInt(row['largo']) || null,
      ancho: parseInt(row['ancho']) || null,
      alto: parseInt(row['alto']) || null,
      despejeSuelo: parseInt(row['despeje_suelo']) || null,
      bauleraLitros: parseInt(row['baulera']) || null,
      plazas: parseInt(row['plazas']) || null,
      adas: row['adas'],
      asientoCuero: row['asiento_cuero'],
      techoPanoramico: row['techo_panoramico'],
      tamanhoPantalla: row['tamanho_pantalla'],
      conectividad: row['conectividad'],
      camaras: row['camaras'],
      origen: row['origen'],
      origenMarca: row['origen_marca'],
      urlImagen: row['url_imagen'],
      garantia: row['garantia'],
      subsegmento: row['subsegmento'],
      airbags: row['airbags'],
    }));
    // Insertar en bloques de 50 para no saturar Neon
    for (let i = 0; i < toInsert.length; i += 50) {
      await db.insert(catalogoMatriz).values(toInsert.slice(i, i + 50));
    }

    return NextResponse.json({ 
      success: true, 
      message: `¡Éxito! Se cargaron ${toInsert.length} vehículos en la base de datos.` 
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
