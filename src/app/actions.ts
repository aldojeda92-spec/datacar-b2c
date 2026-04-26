'use server'

import { db } from '@/lib/db';
import { leads, vehiculos } from '@/lib/schema';

export async function saveLeadAction(formData: any) {
  try {
    // 1. Insertamos el Lead con TODOS sus filtros y atributos
    const [newLead] = await db.insert(leads).values({
      nombre: formData.nombre,
      celular: formData.celular,
      email: formData.email || '',
      presupuestoMin: formData.presupuestoMin,
      presupuestoMax: formData.presupuestoMax,
      atributos: formData.atributos, // Almacena el array de los 3 clics
      filtros: formData.filtros,      // Almacena el estado de TODOS los botones ON/OFF
      notas: formData.notasAdicionales,
    }).returning();

    // 2. Insertamos cada vehículo del garaje
    if (formData.vehiculos && formData.vehiculos.length > 0) {
      await db.insert(vehiculos).values(
        formData.vehiculos.map((v: any) => ({
          leadId: newLead.id,
          patente: v.patente,
          marca: v.marca,
          modelo: v.modelo,
          anio: v.anio ? parseInt(v.anio) : null,
        }))
      );
    }

    return { success: true, leadId: newLead.id };
  } catch (error) {
    console.error("Error crítico al almacenar:", error);
    return { success: false };
  }
}
