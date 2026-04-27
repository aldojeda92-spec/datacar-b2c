import { pgTable, uuid, text, integer, jsonb, timestamp } from 'drizzle-orm/pg-core';

// Tabla de Leads (Inversores)
export const leads = pgTable('leads', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  nombre: text('nombre').notNull(),
  celular: text('celular').notNull(),
  email: text('email'),
  presupuestoMin: integer('presupuesto_min').notNull(),
  presupuestoMax: integer('presupuesto_max').notNull(),
  atributos: jsonb('atributos'), 
  tipos: jsonb('tipos'), // <--- SOLO AGREGA ESTA LÍNEA
  filtros: jsonb('filtros'),
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

// Tabla MATRIZ de Vehículos (El Catálogo)
export const catalogoMatriz = pgTable('catalogo_matriz', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Identificación
  concesionaria: text('concesionaria'),
  marca: text('marca').notNull(),
  modelo: text('modelo').notNull(),
  version: text('version'),
  
  // Filtrado Duro (SQL)
  precioUsd: integer('precio_usd').notNull(), // ¡Debe ser entero, sin el signo $!
  tipoCarroceria: text('tipo_carroceria'),
  combustible: text('combustible'),
  origen: text('origen'),
  
  // Ficha Técnica para la IA
  motor: text('motor'),
  transmision: text('transmision'),
  traccion: text('traccion'),
  largoMm: integer('largo_mm'),
  anchoMm: integer('ancho_mm'),
  altoMm: integer('alto_mm'),
  despejeMm: integer('despeje_mm'),
  bauleraLitros: integer('baulera_litros'),
  plazas: integer('plazas'),
  
  // Equipamiento para la IA
  adas: text('adas'),
  airbags: integer('airbags'),
  asientosCuero: text('asientos_cuero'),
  techo: text('techo'),
  pantalla: text('pantalla'),
  conectividad: text('conectividad'),
  camaras: text('camaras'),
  garantia: text('garantia'),
  
  // Multimedia (Para el Dossier)
  urlAuto: text('url_auto'),
  urlImagen: text('url_imagen'),
  
  createdAt: timestamp('created_at').defaultNow(),
});
