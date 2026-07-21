'use server';

import { db } from '@/lib/db';
import { leads, comparacionesB2b, leadRedirecciones } from '@/lib/schema';
import { eq } from 'drizzle-orm';

// === CONTRATO DE DATOS ESTRICTO (Reemplaza el "any" inseguro) ===
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
    // Sanitización básica para proteger Neon DB
    const payload = {
      nombre: formData.nombre || 'Invitado',
      celular: formData.celular || '0999999999',
      email: formData.email || null,
      presupuestoMin: Number(formData.presupuestoMin) || 0,
      presupuestoMax: Number(formData.presupuestoMax) || 0,
      atributos: formData.atributos || [],
      motorizacion: formData.motorizacion || [],
      tipoVehiculo: formData.tipoVehiculo || [],
      origen: formData.origen || [],
      concesionariaPreferencia: formData.concesionaria || [],
      notas: formData.notas || '',
    };

    // REGLA 3: Si recibimos un ID desde el frontend, ACTUALIZAMOS al invitado actual.
    if (formData.id) {
      const [updatedLead] = await db.update(leads)
        .set(payload)
        .where(eq(leads.id, formData.id))
        .returning({ id: leads.id }); // Optimización: Solo retornamos el ID, no toda la fila

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
    console.error("[Arquitectura] Error al guardar lead:", error);
    return { success: false };
  }
}

// REGLA 2: Motor de logging B2B. Saneado de casteos peligrosos ("as any").
export async function logComparisonAction(data: {
  leadId: string, 
  vIds: string[], 
  nombres: string 
}) {
  try {
    // Validación defensiva: Evita crashes si el frontend envía arrays vacíos
    if (!data.vIds || data.vIds.length < 2) {
      console.warn("[Arquitectura] Log de comparación abortado: Vehículos insuficientes.");
      return { success: false };
    }

    await db.insert(comparacionesB2b).values({
      leadId: data.leadId,
      vehiculo1Id: data.vIds[0],
      vehiculo2Id: data.vIds[1],
      vehiculo3Id: data.vIds[2] || null, // Fallback seguro si solo comparan 2
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
    // Fail-Fast: Si el payload viene roto desde el cliente, protegemos la BD.
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
    // Exponemos el error para evitar fallos silenciosos en la consola de Vercel
    console.error("[Arquitectura] ERROR CRÍTICO B2B AL INSERTAR EN NEON DB:");
    console.error(error);
    return { success: false };
  }
}
