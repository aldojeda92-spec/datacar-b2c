'use server'

import { db } from '@/lib/db';
import { leads, vehiculos } from '@/lib/schema';

export async function saveLeadAction(formData: any) {
  try {
    const [newLead] = await db.insert(leads).values({
      nombre: formData.nombre,
      celular: formData.celular,
      email: formData.email,
      presupuestoMin: formData.presupuestoMin,
      presupuestoMax: formData.presupuestoMax,
      atributos: formData.atributos,
      tipos: formData.tipos, // <--- AHORA GUARDAMOS ESTO
      filtros: formData.filtros,
      notas: formData.notasAdicionales,
    }).returning();

    return { success: true, leadId: newLead.id };
  } catch (error) {
    console.error("Error al guardar lead:", error);
    return { success: false };
  }
}

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
