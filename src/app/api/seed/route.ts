import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { db } from '@/lib/db';
import { catalogoMatriz } from '@/lib/schema';

export const maxDuration = 60; // Damos tiempo para la carga

export async function GET() {
  try {
    const results: any[] = [];
    // Buscamos el archivo en la raíz del proyecto
    const csvPath = path.join(process.cwd(), 'matriz2.csv');
    
    if (!fs.existsSync(csvPath)) {
      return NextResponse.json({ error: "No encontré el archivo matriz2.csv en la raíz" }, { status: 404 });
    }

    // Leemos el CSV
    const promise = new Promise((resolve, reject) => {
      fs.createReadStream(csvPath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', resolve)
        .on('error', reject);
    });

    await promise;

    // Limpiamos y cargamos
    await db.delete(catalogoMatriz);

    const toInsert = results.map((row) => ({
      concesionaria: row['Concesionaria'],
      marca: row['Marca'],
      modelo: row['Modelo'],
      version: row['Versión'],
      tipoCarroceria: row['Tipo Carrocería'],
      precioUsd: parseInt(row['Precio (US$)']?.toString().replace(/[^0-9]/g, '') || '0'),
      combustible: row['Combustible'],
      motor: row['Motor (Cilindrada / HP / Torque)'],
      transmision: row['Transmisión (MT / AT / CVT y N° de marchas)'],
      traccion: row['Tracción'],
      bauleraLitros: parseInt(row['Baulera (Litros)']?.toString().replace(/[^0-9]/g, '') || '0'),
      origen: row['Origen'],
      origenMarca: row['origen_marca'],
      urlImagen: row['URL de Imagen'],
      garantia: row['Garantía'],
      subsegmento: row['Subsegmento'],
    }));

    // Insertar en bloques
    for (let i = 0; i < toInsert.length; i += 50) {
      await db.insert(catalogoMatriz).values(toInsert.slice(i, i + 50));
    }

    return NextResponse.json({ success: true, message: `Se cargaron ${toInsert.length} vehículos con éxito.` });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
