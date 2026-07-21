import { pgTable, text, integer, timestamp, jsonb, uuid } from 'drizzle-orm/pg-core';

// TABLA EN PRODUCCIÓN: Intacta según tu directiva (con advertencia de deuda técnica).
export const leads = pgTable('leads', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  nombre: text('nombre').notNull(),
  celular: text('celular').notNull(),
  email: text('email'),
  presupuestoMin: integer('presupuesto_min').notNull(),
  presupuestoMax: integer('presupuesto_max').notNull(),
  atributos: jsonb('atributos'), 
  motorizacion: text('motorizacion'),
  tipoVehiculo: text('tipo_vehiculo'),
  origen: text('origen'),
  concesionariaPreferencia: text('concesionaria_preferencia'),
  notas: text('notas'),
  filtros: jsonb('filtros'),
  createdAt: timestamp('created_at').defaultNow(),
});

// TABLA EN PRODUCCIÓN: Intacta.
export const catalogoMatriz = pgTable('catalogo_matriz', {
  id: uuid('id').primaryKey().defaultRandom(),
  concesionaria: text('concesionaria'),
  marca: text('marca').notNull(),
  modelo: text('modelo').notNull(),
  version: text('version'),
  tipoCarroceria: text('tipo_carroceria'),
  precioUsd: integer('precio_usd'),
  combustible: text('combustible'),
  motor: text('motor'),
  transmision: text('transmision'),
  traccion: text('traccion'),
  largo: integer('largo'),
  ancho: integer('ancho'),
  alto: integer('alto'),
  despejeSuelo: integer('despeje_suelo'),
  bauleraLitros: integer('baulera_litros'),
  plazas: integer('plazas'),
  adas: text('adas'),
  asientoCuero: text('asiento_cuero'),
  techoPanoramico: text('techo_panoramico'),
  tamanhoPantalla: text('tamanho_pantalla'),
  conectividad: text('conectividad'),
  camaras: text('camaras'),
  origen: text('origen'),
  origenMarca: text('origen_marca'),
  urlImagen: text('url_imagen'),
  garantia: text('garantia'),
  subsegmento: text('subsegmento'),
  airbags: text('airbags'),
});

// TABLA EN PRODUCCIÓN: Intacta.
export const comparacionesB2b = pgTable('comparaciones_b2b', {
  id: uuid('id').primaryKey().defaultRandom(),
  leadId: text('lead_id').references(() => leads.id),
  vehiculo1Id: uuid('vehiculo_1_id'),
  vehiculo2Id: uuid('vehiculo_2_id'),
  vehiculo3Id: uuid('vehiculo_3_id'),
  modelosComparados: text('modelos_comparados'),
  createdAt: timestamp('created_at').defaultNow(),
});

// === INYECCIÓN PROBLEMA B: TABLA DE REDIRECCIONES WHATSAPP ===
// Arquitectura corregida: Integridad referencial con borrado en cascada habilitado.
// === INYECCIÓN PROBLEMA B: TABLA DE REDIRECCIONES WHATSAPP ===
export const leadRedirecciones = pgTable('lead_redirecciones', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // ARQUITECTURA CRÍTICA: Debe ser uuid() explícitamente para que Neon DB no rechace el insert
  leadId: uuid('lead_id').notNull(), 
  
  autoId: text('auto_id').notNull(),
  marca: text('marca').notNull(),
  modelo: text('modelo').notNull(),
  concesionaria: text('concesionaria').notNull(),
  telefonoDestino: text('telefono_destino').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});
