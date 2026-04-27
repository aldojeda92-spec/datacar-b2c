'use server';

import { db } from '@/lib/db';
import { leads } from '@/lib/schema';

export async function saveLeadAction(formData: any) {
  try {
    const [newLead] = await db.insert(leads).values({
      nombre: formData.nombre,
      celular: formData.celular,
      email: formData.email,
      presupuestoMin: formData.presupuestoMin,
      presupuestoMax: formData.presupuestoMax,
      atributos: formData.atributos,
      tipos: formData.tipos,
      filtros: formData.filtros,
      notas: formData.notasAdicionales,
    }).returning();

    return { success: true, leadId: newLead.id };
  } catch (error) {
    console.error("Error crítico al almacenar:", error);
    return { success: false };
  }
}
