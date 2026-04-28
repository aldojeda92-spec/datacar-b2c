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
      concesionaria: row['Concesionaria'],
      marca: row['Marca'],
      modelo: row['Modelo'],
      version: row['Versión'],
      tipoCarroceria: row['Tipo Carrocería'],
      // Limpieza de precio: quita cualquier caracter que no sea numero
      precioUsd: parseInt(row['Precio (US$)']?.toString().replace(/[^0-9]/g, '') || '0'),
      combustible: row['Combustible'],
      motor: row['Motor (Cilindrada / HP / Torque)'],
      transmision: row['Transmisión (MT / AT / CVT y N° de marchas)'],
      traccion: row['Tracción'],
      bauleraLitros: parseInt(row['Baulera (Litros)']?.toString().replace(/[^0-9]/g, '') || '0'),
      origen: row['Origen'],
      origenMarca: row['origen_marca'], // Coincide con tu nueva columna
      urlImagen: row['URL de Imagen'],
      garantia: row['Garantía'],
      subsegmento: row['Subsegmento'],
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
