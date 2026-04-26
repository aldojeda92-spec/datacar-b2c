import fs from 'fs';
import csv from 'csv-parser';
import { db } from '../src/lib/db';
import { catalogoMatriz } from '../src/lib/schema';

// 1. DICCIONARIOS DE INTELIGENCIA
const marcasChinas = ['haval', 'changan', 'geely', 'chery', 'byd', 'baic', 'jetour', 'jac', 'mg', 'dongfeng', 'zx auto'];
const marcasJaponesas = ['toyota', 'nissan', 'honda', 'mazda', 'subaru', 'suzuki', 'mitsubishi', 'lexus', 'isuzu'];
const marcasCoreanas = ['kia', 'hyundai', 'ssangyong', 'kgm'];

function clasificarOrigen(marca: string, origenOriginal: string) {
  const m = marca.toLowerCase();
  if (marcasChinas.includes(m)) return 'China';
  if (marcasJaponesas.includes(m)) return 'Japón';
  if (marcasCoreanas.includes(m)) return 'Corea';
  return origenOriginal; // Si no es ninguna de esas, usa el que traía el CSV
}

function limpiarPrecio(precioStr: string) {
  if (!precioStr) return 0;
  // Quita el signo $, los puntos, y cualquier letra. Convierte "$12.990" en 12990
  return parseInt(precioStr.replace(/[^0-9]/g, ''), 10); 
}

function clasificarMotorizacion(combustible: string) {
  if (!combustible) return 'Combustión';
  const c = combustible.toLowerCase();
  if (c.includes('eléctrico') || c.includes('electrico')) return 'EV';
  if (c.includes('híbrido') || c.includes('hibrido') || c.includes('hev') || c.includes('mhev')) return 'HEV';
  return combustible; 
}

// 2. PROCESAMIENTO DEL CSV
async function procesarMatriz() {
  console.log("Iniciando escaneo de matriz.csv...");
  const vehiculos: any[] = [];

  fs.createReadStream('matriz.csv')
    .pipe(csv())
    .on('data', (row) => {
      // Aplicamos la lógica de limpieza y clasificación
      const marca = row['Marca'] || '';
      const precioLimpio = limpiarPrecio(row['Precio (US$)']);
      const origenInteligente = clasificarOrigen(marca, row['Origen']);
      const tipoMotor = clasificarMotorizacion(row['Combustible']);

      vehiculos.push({
        concesionaria: row['Concesionaria'],
        marca: marca,
        modelo: row['Modelo'],
        version: row['Versión'],
        precioUsd: precioLimpio,
        tipoCarroceria: row['Tipo Carrocería'],
        combustible: tipoMotor,
        origen: origenInteligente,
        motor: row['Motor (Cilindrada / HP / Torque)'],
        transmision: row['Transmisión (MT / AT / CVT y N° de marchas)'],
        traccion: row['Tracción'],
        largoMm: parseInt(row['Largo (mm)']) || null,
        bauleraLitros: parseInt(row['Baulera (Litros)']) || null,
        airbags: parseInt(row['Airbags']) || null,
        adas: row['ADAS (Full, Intermedio, Sin ADAS)'],
        pantalla: row['Tamaño Pantalla (Pulgadas)'],
        urlAuto: row['URL del Auto'],
        urlImagen: row['URL de Imagen']
      });
    })
    .on('end', async () => {
      console.log(`CSV procesado. Se encontraron ${vehiculos.length} vehículos.`);
      console.log("Inyectando en la base de datos de Neon...");
      
      try {
        // Insertamos en lotes para no saturar la base de datos
        await db.insert(catalogoMatriz).values(vehiculos);
        console.log("¡Éxito! La MATRIZ ha sido cargada y estructurada.");
        process.exit(0);
      } catch (error) {
        console.error("Error al guardar en la base de datos:", error);
        process.exit(1);
      }
    });
}

procesarMatriz();
