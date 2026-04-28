import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { db } from '../src/lib/db';
import { catalogoMatriz } from '../src/lib/schema';

// Usamos el nuevo archivo
const CSV_PATH = path.join(__dirname, '../matriz2.csv');

async function main() {
  const results: any[] = [];
  console.log("--- Iniciando Carga de Matriz2.csv ---");

  fs.createReadStream(CSV_PATH)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      try {
        await db.delete(catalogoMatriz);
        console.log("Base de datos purgada.");

        const toInsert = results.map((row) => ({
          concesionaria: row['Concesionaria'],
          marca: row['Marca'],
          modelo: row['Modelo'],
          version: row['Versión'],
          tipoCarroceria: row['Tipo Carrocería'],
          precioUsd: parseInt(row['Precio (US$)']) || 0,
          combustible: row['Combustible'],
          motor: row['Motor (Cilindrada / HP / Torque)'],
          transmision: row['Transmisión (MT / AT / CVT y N° de marchas)'],
          traccion: row['Tracción'],
          bauleraLitros: parseInt(row['Baulera (Litros)']) || 0,
          origen: row['Origen'],
          origenMarca: row['origen_marca'],
          urlImagen: row['URL de Imagen'],
          garantia: row['Garantía'],
          subsegmento: row['Subsegmento'],
        }));

        // Inserción por lotes
        for (let i = 0; i < toInsert.length; i += 50) {
          await db.insert(catalogoMatriz).values(toInsert.slice(i, i + 50));
          console.log(`Cargados ${i + 50} vehículos...`);
        }

        console.log("--- Proceso Finalizado con Éxito ---");
        process.exit(0);
      } catch (error) {
        console.error("Error en la carga:", error);
        process.exit(1);
      }
    });
}

main();
