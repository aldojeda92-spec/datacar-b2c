import { pgTable, text, integer, timestamp, jsonb, uuid } from 'drizzle-orm/pg-core';

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
  createdAt: timestamp('created_at').defaultNow(),
});

export const catalogoMatriz = pgTable('catalogo_matriz', {
  id: uuid('id').primaryKey().defaultRandom(),
  concesionaria: text('concesionaria'),
  marca: text('marca').notNull(),
  modelo: text('modelo').notNull(),
  version: text('version'),
  tipoCarroceria: text('tipo_carroceria'),
  precioUsd: integer('precio_usd'),
  combustible: text('combustible'), // Aquí va tu motorización unificada
  motor: text('motor'),
  transmision: text('transmision'),
  traccion: text('traccion'),
  bauleraLitros: integer('baulera_litros'),
  origen: text('origen'),
  origenMarca: text('origen_marca'), // La nueva columna estratégica
  urlImagen: text('url_imagen'),
  garantia: text('garantia'),
  subsegmento: text('subsegmento'),
});

// Añade esto al final de tu archivo src/lib/schema.ts
export const comparacionesB2b = pgTable('comparaciones_b2b', {
  id: uuid('id').primaryKey().defaultRandom(),
  leadId: text('lead_id').references(() => leads.id),
  vehiculo1Id: uuid('vehiculo_1_id'),
  vehiculo2Id: uuid('vehiculo_2_id'),
  vehiculo3Id: uuid('vehiculo_3_id'),
  modelosComparados: text('modelos_comparados'),
  createdAt: timestamp('created_at').defaultNow(),
});
