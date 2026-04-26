import fs from 'fs';
import csv from 'csv-parser';
import { db } from '../src/lib/db';
import { catalogoMatriz } from '../src/lib/schema';

const marcasChinas = ['haval', 'changan', 'geely', 'chery', 'byd', 'baic', 'jetour', 'jac', 'mg', 'dongfeng', 'zx auto'];
const marcasJaponesas = ['toyota', 'nissan', 'honda', 'mazda', 'subaru', 'suzuki', 'mitsubishi', 'lexus', 'isuzu'];
const marcasCoreanas = ['kia', 'hyundai', 'ssangyong', 'kgm'];

function clasificarOrigen(marca: string, origenOriginal: string) {
  const m = (marca || '').toLowerCase().trim();
  if (marcasChinas.includes(m)) return 'China';
  if (marcasJaponesas.includes(m)) return 'Japón';
  if (marcasCoreanas.includes(m)) return 'Corea';
  return origenOriginal || 'Otro';
}

function limpiarPrecio(precioStr: string) {
  if (!precioStr) return 0;
  const num = parseInt(precioStr.replace(/[^0-9]/g, ''), 10);
  return isNaN(num) ? 0 : num;
}

function clasificarMotorizacion(combustible: string) {
  if (!combustible) return 'Combustión';
  const c = combustible.toLowerCase();
  if (c.includes('eléctrico') || c.includes('electrico')) return 'EV';
  if (c.includes('híbrido') || c.includes('hibrido') || c.includes('hev') || c.includes('mhev')) return 'HEV';
  return combustible; 
}

// Función para limpiar números y evitar errores de "NaN"
const cleanInt = (val: any) => {
  const n = parseInt(val);
  return isNaN(n) ? null : n;
};

async function procesarMatriz() {
  console.log("--- INICIANDO SIEMBRA DE DATACAR MATRIZ ---");
  const vehiculos: any[] = [];

  fs.createReadStream('matriz.csv')
    .pipe(csv())
    .on('data', (row) => {
      const marca = row['Marca'] || '';
      
      vehiculos.push({
        concesionaria: row['Concesionaria'] || 'N/A',
        marca: marca,
        modelo: row['Modelo'] || 'N/A',
        version: row['Versión'] || '',
        precioUsd: limpiarPrecio(row['Precio (US$)']),
        tipoCarroceria: row['Tipo Carrocería'] || 'Otro',
        combustible: clasificarMotorizacion(row['Combustible']),
        origen: clasificarOrigen(marca, row['Origen']),
        motor: row['Motor (Cilindrada / HP / Torque)'] || '',
        transmision: row['Transmisión (MT / AT / CVT y N° de marchas)'] || '',
        traccion: row['Tracción'] || '',
        largoMm: cleanInt(row['Largo (mm)']),
        bauleraLitros: cleanInt(row['Baulera (Litros)']),
        airbags: cleanInt(row['Airbags']),
        adas: row['ADAS (Full, Intermedio, Sin ADAS)'] || 'Sin ADAS',
        pantalla: row['Tamaño Pantalla (Pulgadas)'] || '',
        urlAuto: row['URL del Auto'] || '',
        urlImagen: row['URL de Imagen'] || ''
      });
    })
    .on('end', async () => {
      console.log(`> CSV leído: ${vehiculos.length} registros.`);
      
      try {
        // PROCESAMIENTO POR CHUNKS (Grupos de 50 para no saturar SQL)
        const chunkSize = 50;
        for (let i = 0; i < vehiculos.length; i += chunkSize) {
          const chunk = vehiculos.slice(i, i + chunkSize);
          await db.insert(catalogoMatriz).values(chunk);
          console.log(`>> Inyectados ${i + chunk.length} de ${vehiculos.length}...`);
        }
        
        console.log("--- ¡ÉXITO TOTAL! MATRIZ CARGADA ---");
        process.exit(0);
      } catch (error) {
        console.error("--- ERROR CRÍTICO EN LA SIEMBRA ---");
        console.error(error);
        process.exit(1);
      }
    });
}

procesarMatriz();
