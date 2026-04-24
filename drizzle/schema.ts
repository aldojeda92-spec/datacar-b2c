import { pgTable, uuid, text, integer, jsonb, boolean, timestamp, pgEnum } from 'drizzle-orm/pg-core';

// 1. Definimos los Enums (las listas de opciones cerradas)
export const tipoVehiculoEnum = pgEnum('tipo_vehiculo', ['SUV', 'sedan', 'hatch', 'pickup', 'van', 'indistinto']);
export const usoEnum = pgEnum('uso_principal', ['ciudad', 'ruta', 'mixto', 'trabajo']);
export const familiaEnum = pgEnum('composicion_familiar', ['soltero', 'pareja', 'con_hijos', 'familia_numerosa']);

// 2. Definimos la tabla principal
export const clientes = pgTable('clientes', {
  id: uuid('id').primaryKey().defaultRandom(),
  nombre: text('nombre').notNull(),
  telefono: text('telefono'),
  email: text('email'),
  presupuesto_min: integer('presupuesto_min').notNull(),
  presupuesto_max: integer('presupuesto_max').notNull(),
  
  tipo_vehiculo: tipoVehiculoEnum('tipo_vehiculo').notNull(),
  
  // Usamos jsonb para guardar un array de prioridades ["Seguridad", "Espacio"]
  prioridades: jsonb('prioridades').notNull(), 
  
  uso_principal: usoEnum('uso_principal').notNull(),
  composicion_familiar: familiaEnum('composicion_familiar').notNull(),
  prefiere_marca_tradicional: boolean('prefiere_marca_tradicional').default(false),
  
  created_at: timestamp('created_at').defaultNow(),
});
