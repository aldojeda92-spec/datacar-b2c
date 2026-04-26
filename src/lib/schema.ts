import { pgTable, uuid, text, integer, jsonb, timestamp } from 'drizzle-orm/pg-core';

// Tabla de Leads (Inversores)
export const leads = pgTable('leads', {
  id: uuid('id').primaryKey().defaultRandom(),
  nombre: text('nombre').notNull(),
  celular: text('celular').notNull(),
  presupuestoMin: integer('presupuesto_min').notNull(),
  presupuestoMax: integer('presupuesto_max').notNull(),
  atributos: jsonb('atributos').notNull(), // Aquí guardamos los 3 elegidos
  filtros: jsonb('filtros').notNull(),    // Aquí guardamos los ON/OFF
  notas: text('notas'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Tabla de Vehículos
export const vehiculos = pgTable('vehiculos', {
  id: uuid('id').primaryKey().defaultRandom(),
  leadId: uuid('lead_id').references(() => leads.id),
  patente: text('patente'),
  marca: text('marca').notNull(),
  modelo: text('modelo').notNull(),
  anio: integer('anio'),
  createdAt: timestamp('created_at').defaultNow(),
});
