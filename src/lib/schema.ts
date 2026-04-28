export const leads = pgTable('leads', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  nombre: text('nombre').notNull(),
  celular: text('celular').notNull(),
  email: text('email'),
  presupuestoMin: integer('presupuesto_min').notNull(),
  presupuestoMax: integer('presupuesto_max').notNull(),
  atributos: jsonb('atributos'), 
  motorizacion: text('motorizacion'), // Nueva
  tipoVehiculo: text('tipo_vehiculo'), // Nueva
  origen: text('origen'), // Nueva
  concesionariaPreferencia: text('concesionaria_preferencia'), // Nueva
  notas: text('notas'),
  createdAt: timestamp('created_at').defaultNow(),
});
