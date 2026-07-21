'use server';

import { db } from '@/lib/db';
import { leads, comparacionesB2b, leadRedirecciones } from '@/lib/schema';
import { eq } from 'drizzle-orm';

// === INTERFAZ DE CONTRATO ESTRICTO PARA EL LEAD ===
// Esto reemplaza el "any" y protege la base de datos.
interface LeadFormData {
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

export async function saveLeadAction(formData: LeadFormData): Promise<{ success: boolean; leadId?: string }> {
  try {
    // 1. Sanitización Básica y Protección de Tipos
    const payload = {
      nombre: formData.nombre?.trim() || 'Invitado',
      celular: formData.celular?.trim() || '0999999999',
      email: formData.email?.trim() || null,
      // Forzamos numéricos para evitar SQL Type Errors
      presupuestoMin: Number(formData.presupuestoMin) || 0,
      presupuestoMax: Number(formData.presupuestoMax) || 0,
      // Aseguramos que los arrays viajen limpios
      atributos: Array.isArray(formData.atributos) ? formData.atributos : [],
      motorizacion: Array.isArray(formData.motorizacion) ? formData.motorizacion : [],
      tipoVehiculo: Array.isArray(formData.tipoVehiculo) ? formData.tipoVehiculo : [],
      origen: Array.isArray(formData.origen) ? formData.origen : [],
      concesionariaPreferencia: Array.isArray(formData.concesionaria) ? formData.concesionaria : [],
      notas: formData.notas?.trim() || '',
    };

    // REGLA 3: Si recibimos un ID desde el frontend (Paso 3), ACTUALIZAMOS al invitado actual.
    if (formData.id) {
      const [updatedLead] = await db.update(leads)
        .set(payload)
        .where(eq(leads.id, formData.id))
        .returning({ id: leads.id }); // Solo retornamos el ID por performance

      if (updatedLead) {
        return { success: true, leadId: updatedLead.id };
      }
    }

    // REGLA 1: Si no hay ID (o la actualización falló), CREAMOS un Lead nuevo.
    const [newLead] = await db.insert(leads)
      .values(payload)
      .returning({ id: leads.id });

    return { success: true, leadId: newLead.id };
  } catch (error) {
    console.error("[Arquitectura] Error al procesar Lead en DB:", error);
    return { success: false };
  }
}

// === MOTOR DE B2B COMPARACIONES ===
export async function logComparisonAction(data: {
  leadId: string, 
  vIds: string[], 
  nombres: string 
}) {
  try {
    if (!data.leadId || !data.vIds || data.vIds.length < 2) {
       throw new Error("Payload inválido para log de comparación");
    }

    await db.insert(comparacionesB2b).values({
      leadId: data.leadId,
      // Asumimos que vehiculoXId espera un string/UUID en el schema
      vehiculo1Id: String(data.vIds[0]),
      vehiculo2Id: String(data.vIds[1]),
      vehiculo3Id: data.vIds[2] ? String(data.vIds[2]) : null,
      modelosComparados: data.nombres
    });
    
    return { success: true };
  } catch (error) {
    console.error("[Arquitectura] Error en B2B Log de Comparación:", error);
    return { success: false };
  }
}

// === INYECCIÓN PROBLEMA B: MOTOR DE TRAZABILIDAD WHATSAPP ===
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
      throw new Error("Faltan identificadores críticos para el registro de redirección");
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
    console.error("[Arquitectura] Error Crítico B2B - Fuga de Lead en Redirección:", error);
    return { success: false };
  }
}
