import { pgTable, text, integer, timestamp, jsonb, uuid } from 'drizzle-orm/pg-core';

// 1. TABLA DE LEADS (Tus clientes y sus filtros)
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

// 2. TABLA DEL CATÁLOGO (Donde se cargan los autos de matriz.csv)
// ASEGÚRATE DE QUE ESTÉ EXPORTADA (export const ...)
export const catalogoMatriz = pgTable('catalogo_matriz', {
  id: uuid('id').primaryKey().defaultRandom(),
  concesionaria: text('concesionaria'),
  marca: text('marca').notNull(),
  modelo: text('modelo').notNull(),
  version: text('version'),
  tipoCarroceria: text('tipo_carroceria'), // Mapeado a "Tipo Carrocería" en CSV
  precioUsd: integer('precio_usd'),       // Mapeado a "Precio (US$)"
  combustible: text('combustible'),
  motor: text('motor'),                   // Mapeado a "Motor (Cilindrada / HP / Torque)"
  transmision: text('transmision'),
  traccion: text('traccion'),
  bauleraLitros: integer('baulera_litros'), // Mapeado a "Baulera (Litros)"
  origen: text('origen'),
  urlImagen: text('url_imagen'),          // Mapeado a "URL de Imagen"
  garantia: text('garantia'),
  subsegmento: text('subsegmento'),
  createdAt: timestamp('created_at').defaultNow(),
});
