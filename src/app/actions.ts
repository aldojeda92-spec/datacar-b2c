'use server';

import { db } from '@/lib/db';
import { leads, comparacionesB2b, leadRedirecciones } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function saveLeadAction(formData: any): Promise<{ success: boolean; leadId?: string }> {
  try {
    // REGLA 3: Si recibimos un ID desde el frontend (Paso 3), ACTUALIZAMOS al invitado actual.
    if (formData.id) {
      const [updatedLead] = await db.update(leads)
        .set({
          nombre: formData.nombre,
          celular: formData.celular,
          email: formData.email || null,
          presupuestoMin: formData.presupuestoMin,
          presupuestoMax: formData.presupuestoMax,
          atributos: formData.atributos,
          motorizacion: formData.motorizacion,
          tipoVehiculo: formData.tipoVehiculo,
          origen: formData.origen,
          concesionariaPreferencia: formData.concesionaria,
          notas: formData.notas || '',
        })
        .where(eq(leads.id, formData.id))
        .returning();

      // Si se actualizó con éxito, devolvemos el mismo ID para mantener la sesión
      if (updatedLead) {
        return { success: true, leadId: updatedLead.id };
      }
    }

    // REGLA 1: Si no hay ID (Paso 1), CREAMOS SIEMPRE un Lead nuevo ("Invitado").
    const [newLead] = await db.insert(leads).values({
      nombre: formData.nombre,
      celular: formData.celular,
      email: formData.email || null,
      presupuestoMin: formData.presupuestoMin,
      presupuestoMax: formData.presupuestoMax,
      atributos: formData.atributos,
      motorizacion: formData.motorizacion,
      tipoVehiculo: formData.tipoVehiculo,
      origen: formData.origen,
      concesionariaPreferencia: formData.concesionaria,
      notas: formData.notas || '',
    }).returning();

    return { success: true, leadId: newLead.id };
  } catch (error) {
    console.error("Error al guardar lead:", error);
    return { success: false };
  }
}

// REGLA 2: Esta función queda intacta, ya asocia correctamente los autos al ID que le pases.
export async function logComparisonAction(data: {
  leadId: string, 
  vIds: string[], 
  nombres: string 
}) {
  try {
    await db.insert(comparacionesB2b).values({
      leadId: data.leadId,
      vehiculo1Id: data.vIds[0] as any,
      vehiculo2Id: data.vIds[1] as any,
      vehiculo3Id: data.vIds[2] as any || null,
      modelosComparados: data.nombres
    });
    return { success: true };
  } catch (error) {
    console.error("Error B2B Log:", error);
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
    // Validación Defensiva (Fail-fast): Evita consultas nulas a la BD
    if (!data.leadId || !data.autoId || !data.telefonoDestino) {
      console.warn("Intento de redirección B2B bloqueado: Faltan datos críticos en el payload.");
      return { success: false };
    }

    await db.insert(leadRedirecciones).values({
      leadId: data.leadId,
      autoId: data.autoId,
      marca: data.marca,
      modelo: data.modelo,
      concesionaria: data.concesionaria,
      telefonoDestino: data.telefonoDestino,
    });
    return { success: true };
  } catch (error) {
    console.error("Error registrando redirección de WhatsApp en Neon DB:", error);
    return { success: false };
  }
}
