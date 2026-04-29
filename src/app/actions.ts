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

// Añade esta función a tu archivo src/app/actions.ts
import { comparacionesB2b } from './lib/schema'; // Asegúrate de la ruta

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
