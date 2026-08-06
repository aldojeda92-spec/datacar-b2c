'use server';

import { db } from '@/lib/db';
import { leads, comparacionesB2b, leadRedirecciones } from '@/lib/schema';
import { eq } from 'drizzle-orm';

// === CONTRATO DE DATOS ESTRICTO ===
interface LeadPayload {
  id?: string;
  nombre: string;
  celular: string;
  email?: string;
  presupuestoMin: number;
  presupuestoMax: number;
  atributos: string[];
  motorizacion: string[];
  tipoVehiculo: string[];
  origen: string[];
  concesionaria: string[];
  notas?: string;
}

export async function saveLeadAction(formData: LeadPayload): Promise<{ success: boolean; leadId?: string }> {
  try {
    // === SANITIZACIÓN Y SERIALIZACIÓN ===
    // Drizzle espera strings para columnas text(), no arrays. 
    // Serializamos los arreglos usando .join(', ') para no romper el esquema en producción.
    const payload = {
      nombre: formData.nombre?.trim() || 'Invitado',
      celular: formData.celular?.trim() || '0999999999',
      email: formData.email?.trim() || null,
      presupuestoMin: Number(formData.presupuestoMin) || 0,
      presupuestoMax: Number(formData.presupuestoMax) || 0,
      
      // JSONB: Drizzle acepta el array directamente sin quejarse
      atributos: Array.isArray(formData.atributos) ? formData.atributos : [],
      
      // TEXT: Obligamos la conversión de Array a String para evitar colisión de tipos en Postgres
      motorizacion: Array.isArray(formData.motorizacion) && formData.motorizacion.length > 0 ? formData.motorizacion.join(', ') : null,
      tipoVehiculo: Array.isArray(formData.tipoVehiculo) && formData.tipoVehiculo.length > 0 ? formData.tipoVehiculo.join(', ') : null,
      origen: Array.isArray(formData.origen) && formData.origen.length > 0 ? formData.origen.join(', ') : null,
      concesionariaPreferencia: Array.isArray(formData.concesionaria) && formData.concesionaria.length > 0 ? formData.concesionaria.join(', ') : null,
      
      notas: formData.notas?.trim() || '',
    };

    // REGLA 3: Si recibimos un ID desde el frontend, ACTUALIZAMOS al invitado actual.
    if (formData.id) {
      const [updatedLead] = await db.update(leads)
        .set(payload)
        .where(eq(leads.id, formData.id))
        .returning({ id: leads.id });

      if (updatedLead) {
        return { success: true, leadId: updatedLead.id };
      }
    }

    // REGLA 1: Si no hay ID o falló la actualización, CREAMOS un Lead nuevo.
    const [newLead] = await db.insert(leads)
      .values(payload)
      .returning({ id: leads.id });

    return { success: true, leadId: newLead.id };
  } catch (error) {
    console.error("[Arquitectura] Error al guardar lead en DB:", error);
    return { success: false };
  }
}

// REGLA 2: Motor de logging B2B.
export async function logComparisonAction(data: {
  leadId: string, 
  vIds: string[], 
  nombres: string 
}) {
  try {
    if (!data.vIds || data.vIds.length < 2) {
      console.warn("[Arquitectura] Log de comparación abortado: Vehículos insuficientes.");
      return { success: false };
    }

    await db.insert(comparacionesB2b).values({
      leadId: data.leadId,
      vehiculo1Id: data.vIds[0],
      vehiculo2Id: data.vIds[1],
      vehiculo3Id: data.vIds[2] || null,
      modelosComparados: data.nombres
    });
    return { success: true };
  } catch (error) {
    console.error("[Arquitectura] Error en B2B Log:", error);
    return { success: false };
  }
}

// === INYECCIÓN PROBLEMA B: REGISTRO DE CLICS A WHATSAPP ===
export async function logWhatsAppRedirectAction(data: {
  leadId: string;
  autoId: string;
  marca: string;
  modelo: string;
  concesionaria: string;
  telefonoDestino: string;
}) {
  try {
    if (!data.leadId || !data.autoId) {
      console.warn("[Arquitectura] Intento B2B bloqueado: Identificadores nulos.", data);
      return { success: false };
    }

    console.log(`[Arquitectura] Guardando Lead B2B: ${data.leadId} -> ${data.marca} ${data.modelo}`);

    await db.insert(leadRedirecciones).values({
      leadId: data.leadId,
      autoId: data.autoId,
      marca: data.marca,
      modelo: data.modelo,
      concesionaria: data.concesionaria,
      telefonoDestino: data.telefonoDestino,
    });
    
    console.log("[Arquitectura] ÉXITO: Lead guardado en Neon DB.");
    return { success: true };
    
  } catch (error) {
    console.error("[Arquitectura] ERROR CRÍTICO B2B AL INSERTAR EN NEON DB:");
    console.error(error);
    return { success: false };
  }
}
