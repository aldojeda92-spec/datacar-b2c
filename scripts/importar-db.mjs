import { createRequire } from 'module'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const require = createRequire(import.meta.url)
const __dirname = dirname(fileURLToPath(import.meta.url))

// Cargar .env.local manualmente
const envContent = readFileSync(join(__dirname, '../.env.local'), 'utf-8')

for (const line of envContent.split('\n')) {
  const t = line.trim()
  if (!t || t.startsWith('#')) continue
  const idx = t.indexOf('=')
  if (idx === -1) continue
  const k = t.slice(0, idx).trim()
  const v = t.slice(idx + 1).trim()
  if (!process.env[k]) process.env[k] = v
}

const XLSX = require('../node_modules/.pnpm/xlsx@0.18.5/node_modules/xlsx/xlsx.js')
const postgres = require('../node_modules/.pnpm/postgres@3.4.9/node_modules/postgres/cjs/src/index.js')

const MARCAS_TRADICIONALES = ['Toyota', 'Chevrolet', 'Hyundai', 'Kia', 'Nissan', 'Ford', 'Volkswagen', 'VW', 'Honda']

function mapTipo(raw) {
  if (!raw) return 'SUV'
  const r = raw.toLowerCase()
  if (r.includes('sedan') || r.includes('sedán')) return 'Sedan'
  if (r.includes('pickup') || r.includes('pick-up')) return 'Pickup'
  if (r.includes('hatchback')) return 'Hatchback'
  if (r.includes('van') || r.includes('furgón') || r.includes('minivan') || r.includes('minibus')) return 'Van'
  if (r.includes('suv')) return 'SUV'
  return 'SUV'
}

function mapTransmision(raw) {
  if (!raw) return null
  const r = raw.toUpperCase()
  if (r.startsWith('MT')) return 'Manual'
  return 'Automática'
}

function mapAdas(raw) {
  if (!raw) return 'Ninguno'
  const r = raw.toLowerCase()
  if (r.includes('full')) return 'Full'
  if (r.includes('intermedio')) return 'Intermedio'
  if (r.includes('básico') || r.includes('basico') || r.includes('bás')) return 'Básico'
  return 'Ninguno'
}

function parseMotor(raw) {
  if (!raw || typeof raw !== 'string') return { motor: String(raw || '').trim() || null, potencia_hp: null, torque_nm: null }
  const parts = raw.split('/').map(s => s.trim())
  const motor = parts[0] || null
  const hpMatch = (parts[1] || '').match(/(\d+)/)
  const nmMatch = (parts[2] || '').match(/(\d+)/)
  return {
    motor,
    potencia_hp: hpMatch ? parseInt(hpMatch[1]) : null,
    torque_nm: nmMatch ? parseInt(nmMatch[1]) : null,
  }
}

function parsePantalla(raw) {
  if (!raw) return null
  const m = String(raw).match(/(\d+\.?\d*)/)
  return m ? parseFloat(m[1]) : null
}

function parseAirbags(raw) {
  if (!raw) return 0
  const m = String(raw).match(/(\d+)/)
  return m ? parseInt(m[1]) : 0
}

const wb = XLSX.readFile('C:/Users/sam/Desktop/DESARROLLOS/DATACAR/DATACAR_Master_DB_v3_para IA.xlsx')
const sheet = wb.Sheets[wb.SheetNames[0]]
const rows = XLSX.utils.sheet_to_json(sheet, { defval: null })

console.log(`Total filas en Excel: ${rows.length}`)

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' })

let importados = 0
let actualizados = 0
let errores = 0

for (const row of rows) {
  try {
    const marca = String(row['Marca'] || '').trim()
    const modelo = String(row['Modelo'] || '').trim()
    const version = String(row['Versión'] || '').trim()
    const precio_usd = parseInt(row['Precio (US$)'] || 0)
    const concesionaria = String(row['Concesionaria'] || '').trim()

    if (!marca || !modelo || !version || !precio_usd || !concesionaria) {
      errores++
      continue
    }

    const { motor, potencia_hp, torque_nm } = parseMotor(row['Motor (Cilindrada / HP / Torque)'])
    const nivel_adas_raw = mapAdas(row['ADAS (Full, Intermedio, Sin ADAS)'])
    const conectividad = String(row['Conectividad (Inalámbrico/Cable)'] || '').toLowerCase()
    const camaras = String(row['Cámaras (Retroceso / 360)'] || '').toLowerCase()

    const vehiculo = {
      marca,
      modelo,
      version,
      año: 2026,
      precio_usd,
      concesionaria,
      tipo_vehiculo: mapTipo(row['Tipo Carrocería']),
      imagen_url: row['URL de Imagen'] ? String(row['URL de Imagen']).trim() : null,
      motor,
      potencia_hp,
      torque_nm,
      transmision: mapTransmision(row['Transmisión (MT / AT / CVT y N° de marchas)']),
      airbags: 0,
      tiene_adas: nivel_adas_raw !== 'Ninguno',
      nivel_adas: nivel_adas_raw,
      baul_litros: row['Baulera (Litros)'] && !isNaN(parseInt(row['Baulera (Litros)'])) ? parseInt(row['Baulera (Litros)']) : null,
      pantalla_pulgadas: parsePantalla(row['Tamaño Pantalla (Pulgadas)']),
      tiene_wifi: conectividad.includes('inalámbrico') || conectividad.includes('wireless') || conectividad.includes('inalambrico'),
      tiene_camara_reversa: camaras.includes('retroceso') || camaras.includes('360'),
      tiene_onstar: marca.toLowerCase() === 'chevrolet',
      marca_tradicional: MARCAS_TRADICIONALES.some(m => marca.toLowerCase().includes(m.toLowerCase())),
      activo: true,
      notas_internas: null,
    }

    // Verificar duplicado
    const [existente] = await sql`
      SELECT id FROM vehiculos
      WHERE marca = ${vehiculo.marca} AND modelo = ${vehiculo.modelo}
        AND version = ${vehiculo.version} AND año = ${vehiculo.año}
      LIMIT 1
    `

    if (existente) {
      await sql`
        UPDATE vehiculos SET
          precio_usd = ${vehiculo.precio_usd},
          imagen_url = ${vehiculo.imagen_url},
          motor = ${vehiculo.motor},
          potencia_hp = ${vehiculo.potencia_hp},
          torque_nm = ${vehiculo.torque_nm},
          transmision = ${vehiculo.transmision},
          tiene_adas = ${vehiculo.tiene_adas},
          nivel_adas = ${vehiculo.nivel_adas},
          baul_litros = ${vehiculo.baul_litros},
          pantalla_pulgadas = ${vehiculo.pantalla_pulgadas},
          tiene_wifi = ${vehiculo.tiene_wifi},
          tiene_camara_reversa = ${vehiculo.tiene_camara_reversa},
          activo = true,
          updated_at = NOW()
        WHERE id = ${existente.id}
      `
      actualizados++
    } else {
      await sql`
        INSERT INTO vehiculos (
          marca, modelo, version, año, precio_usd, concesionaria, tipo_vehiculo,
          imagen_url, motor, potencia_hp, torque_nm, transmision, airbags,
          tiene_adas, nivel_adas, baul_litros, pantalla_pulgadas, tiene_wifi,
          tiene_camara_reversa, tiene_onstar, marca_tradicional, activo
        ) VALUES (
          ${vehiculo.marca}, ${vehiculo.modelo}, ${vehiculo.version}, ${vehiculo.año},
          ${vehiculo.precio_usd}, ${vehiculo.concesionaria}, ${vehiculo.tipo_vehiculo},
          ${vehiculo.imagen_url}, ${vehiculo.motor}, ${vehiculo.potencia_hp},
          ${vehiculo.torque_nm}, ${vehiculo.transmision}, ${vehiculo.airbags},
          ${vehiculo.tiene_adas}, ${vehiculo.nivel_adas}, ${vehiculo.baul_litros},
          ${vehiculo.pantalla_pulgadas}, ${vehiculo.tiene_wifi}, ${vehiculo.tiene_camara_reversa},
          ${vehiculo.tiene_onstar}, ${vehiculo.marca_tradicional}, true
        )
      `
      importados++
    }
  } catch (e) {
    console.error('Error fila:', e.message)
    errores++
  }
}

await sql.end()
console.log(`✅ Importados: ${importados} | Actualizados: ${actualizados} | Errores: ${errores}`)
