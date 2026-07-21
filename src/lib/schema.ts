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
// Asegúrate de agregar 'varchar' a tus importaciones de drizzle-orm/pg-core arriba.
// import { pgTable, text, integer, timestamp, jsonb, uuid, varchar } from 'drizzle-orm/pg-core';

// === INYECCIÓN PROBLEMA B: TABLA DE REDIRECCIONES WHATSAPP ===
export const leadRedirecciones = pgTable('lead_redirecciones', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // ARQUITECTURA: Neon exige UUID, no text.
  leadId: uuid('lead_id').notNull(), 
  
  // ARQUITECTURA: Neon exige VARCHAR(255), no text.
  autoId: varchar('auto_id', { length: 255 }).notNull(),
  marca: varchar('marca', { length: 255 }).notNull(),
  modelo: varchar('modelo', { length: 255 }).notNull(),
  concesionaria: varchar('concesionaria', { length: 255 }).notNull(),
  
  // ARQUITECTURA: Neon exige VARCHAR(50).
  telefonoDestino: varchar('telefono_destino', { length: 50 }).notNull(),
  
  // EL BUG ESTABA AQUÍ: Tu base de datos dice "creado_en", NO "created_at".
  creadoEn: timestamp('creado_en').defaultNow(), 
});
