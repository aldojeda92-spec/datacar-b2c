// En tu schema.ts
export const clientes = pgTable('clientes', {
  id: uuid('id').primaryKey().defaultRandom(),
  nombre: text('nombre').notNull(),
  telefono: text('telefono'),
  email: text('email'),
  presupuesto_min: integer('presupuesto_min').notNull(),
  presupuesto_max: integer('presupuesto_max').notNull(),
  tipo_vehiculo: tipoVehiculoEnum('tipo_vehiculo').notNull(),
  // CAMBIO AQUÍ: Usamos jsonb para guardar un array de prioridades ["Seguridad", "Espacio"]
  prioridades: jsonb('prioridades').notNull(), 
  uso_principal: usoEnum('uso_principal').notNull(),
  composicion_familiar: familiaEnum('composicion_familiar').notNull(),
  prefiere_marca_tradicional: boolean('prefiere_marca_tradicional').default(false),
  created_at: timestamp('created_at').defaultNow(),
})