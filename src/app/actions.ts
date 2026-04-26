'use server'

import { db } from '@/lib/db';
import { leads, vehiculos } from '@/lib/schema';

export async function saveLeadAction(formData: any) {
  try {
    // 1. Guardar el Lead y obtener su ID
    const [newLead] = await db.insert(leads).values({
      nombre: formData.nombre,
      celular: formData.celular,
      presupuestoMin: formData.presupuestoMin,
      presupuestoMax: formData.presupuestoMax,
      atributos: formData.atributos,
      filtros: formData.filtros,
      notas: formData.notasAdicionales,
    }).returning();

    // 2. Guardar los vehículos asociados
    if (formData.vehiculos.length > 0) {
      await db.insert(vehiculos).values(
        formData.vehiculos.map((v: any) => ({
          leadId: newLead.id,
          patente: v.patente,
          marca: v.marca,
          modelo: v.modelo,
          anio: parseInt(v.anio) || null,
        }))
      );
    }

    return { success: true, leadId: newLead.id };
  } catch (error) {
    console.error("Error saving lead:", error);
    return { success: false };
  }
}
