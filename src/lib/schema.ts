import { pgTable, text, integer, timestamp, jsonb, uuid } from 'drizzle-orm/pg-core';

export const leads = pgTable('leads', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  nombre: text('nombre').notNull(),
  celular: text('celular').notNull(),
  email: text('email'),
  presupuestoMin: integer('presupuesto_min').notNull(),
  presupuestoMax: integer('presupuesto_max').notNull(),
  atributos: jsonb('atributos'), 
  
  // ARQUITECTURA: Estos campos son arrays en tu frontend. 
  // En Postgres DEBEN ser definidos como .array() para no romper la inserción.
  motorizacion: text('motorizacion').array(),
  tipoVehiculo: text('tipo_vehiculo').array(),
  origen: text('origen').array(),
  concesionariaPreferencia: text('concesionaria_preferencia').array(),
  
  notas: text('notas'),
  filtros: jsonb('filtros'),
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

export const comparacionesB2b = pgTable('comparaciones_b2b', {
  id: uuid('id').primaryKey().defaultRandom(),
  // ARQUITECTURA: Borrado en cascada. Si borras un lead, se borran sus logs.
  leadId: text('lead_id').references(() => leads.id, { onDelete: 'cascade' }),
  
  // ARQUITECTURA: Aseguramos la integridad referencial hacia el catálogo.
  vehiculo1Id: uuid('vehiculo_1_id').references(() => catalogoMatriz.id),
  vehiculo2Id: uuid('vehiculo_2_id').references(() => catalogoMatriz.id),
  vehiculo3Id: uuid('vehiculo_3_id').references(() => catalogoMatriz.id),
  
  modelosComparados: text('modelos_comparados'),
  createdAt: timestamp('created_at').defaultNow(),
});

// === INYECCIÓN PROBLEMA B: TABLA DE TRAZABILIDAD (LA CAJA REGISTRADORA) ===
export const leadRedirecciones = pgTable('lead_redirecciones', {
  id: uuid('id').primaryKey().defaultRandom(),
  // Vínculo directo con el usuario que hizo el clic
  leadId: text('lead_id').references(() => leads.id, { onDelete: 'cascade' }).notNull(),
  
  // Vínculo (opcional pero recomendado) con el auto exacto del catálogo
  autoId: text('auto_id').notNull(), // Usamos text() por si el ID del frontend llega como string
  
  // Datos duros de la transacción para auditoría rápida B2B sin necesidad de JOINs complejos
  marca: text('marca').notNull(),
  modelo: text('modelo').notNull(),
  concesionaria: text('concesionaria').notNull(),
  telefonoDestino: text('telefono_destino').notNull(),
  
  // Timestamp exacto del momento en que se envió a WhatsApp
  createdAt: timestamp('created_at').defaultNow(),
});
