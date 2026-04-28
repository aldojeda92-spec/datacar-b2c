'use server';
import { db } from '@/lib/db';
import { leads } from '@/lib/schema';

export async function saveLeadAction(formData: any) {
  try {
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
      // No enviamos "filtros" para evitar el error de NULL
    }).returning();

    return { success: true, leadId: newLead.id };
  } catch (error) {
    console.error("Error al guardar lead:", error);
    return { success: false };
  }
}
