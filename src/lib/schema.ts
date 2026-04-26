import { pgTable, uuid, text, integer, jsonb, timestamp } from 'drizzle-orm/pg-core';

// Tabla de Leads (Inversores)
export const leads = pgTable('leads', {
  id: uuid('id').primaryKey().defaultRandom(),
  nombre: text('nombre').notNull(),
  celular: text('celular').notNull(),
  email: text('email'), // <-- ESTA ES LA PIEZA QUE FALTABA
  presupuestoMin: integer('presupuesto_min').notNull(),
  presupuestoMax: integer('presupuesto_max').notNull(),
  atributos: jsonb('atributos').notNull(),
  filtros: jsonb('filtros').notNull(),
  notas: text('notas'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Tabla de Vehículos
export const vehiculos = pgTable('vehiculos', {
  id: uuid('id').primaryKey().defaultRandom(),
  leadId: uuid('lead_id').references(() => leads.id, { onDelete: 'cascade' }),
  patente: text('patente'),
  marca: text('marca').notNull(),
  modelo: text('modelo').notNull(),
  anio: integer('anio'),
  createdAt: timestamp('created_at').defaultNow(),
});
