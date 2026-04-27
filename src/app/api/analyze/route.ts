import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { leads, catalogoMatriz } from '@/lib/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { GoogleGenerativeAI } from "@google/generative-ai";

export const maxDuration = 60; 

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '');

export async function POST(req: Request) {
  try {
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return NextResponse.json({ success: false, error: "API Key no configurada" }, { status: 500 });
    }

    const { leadId } = await req.json();

    const leadData = await db.query.leads.findFirst({
      where: eq(leads.id, leadId)
    });

    if (!leadData) return NextResponse.json({ error: "Lead no encontrado" }, { status: 404 });

    // FILTRADO AMPLIO EN SQL
    const candidatos = await db.query.catalogoMatriz.findMany({
      where: and(
        gte(catalogoMatriz.precioUsd, leadData.presupuestoMin - 3000),
        lte(catalogoMatriz.precioUsd, leadData.presupuestoMax + 3000)
      ),
      limit: 120 
    });

    // CONFIGURAR GEMINI FLASH PARA DATOS ESTRUCTURADOS
    const model = genAI.getGenerativeModel({ 
        model: "gemini-3-flash-preview", 
        generationConfig: { responseMimeType: "application/json" }
    });

    const systemPrompt = `Eres el Agente de Inteligencia Analítica Avanzada de DATACAR. 
    Tu tono es corporativo, premium, sobrio y basado estrictamente en métricas financieras y técnicas.

    MISIÓN: Analizar la matriz de activos y seleccionar el TOP 10 que represente la mejor inversión para el perfil del cliente.

    PERFIL DEL INVERSOR:
    - Rango Objetivo: USD ${leadData.presupuestoMin} a ${leadData.presupuestoMax}
    - Atributos Críticos Prioritarios (ORDEN DE IMPORTANCIA): ${JSON.stringify(leadData.atributos)}
    - Filtros Estratégicos: ${JSON.stringify(leadData.filtros)}
    - Requerimientos Específicos/Notas: "${leadData.notas}"

    MATRIZ DE DATOS (Muestra de candidatos):
    ${JSON.stringify(candidatos)}

    INSTRUCCIONES DE ANÁLISIS:
    1. Evalúa cada candidato contra los Atributos Críticos y el Rango de Precios.
    2. Selecciona los 10 mejores.
    3. Calcula un "Match %" (0-100) basado en la alineación con el perfil.
    4. Identifica la característica más relevante (Baúl, ADAS, Motor) como "etiqueta principal".
    5. No uses lenguaje emocional.

    RESPONDE EXCLUSIVAMENTE CON UN JSON EN ESTE FORMATO (Array de 10):
    { 
      "ranking": [ 
        { 
          "id": "uuid", 
          "puesto": 1, 
          "match_percent": 95, 
          "etiqueta_principal": "string (ej. 'ADAS Full', 'Motor Turbo', 'Baúl 450L')",
          "justificacion": "Resumen técnico corto...",
          // Y DEVOLVER LOS DATOS DE LA DB PARA EL FRONT:
          "marca": "...", "modelo": "...", "version": "...", "precio_usd": 12345, 
          "origen": "...", "url_imagen": "...", "baulera_litros": 123, "adas": "..."
        } 
      ] 
    }`;

    const result = await model.generateContent(systemPrompt);
    const response = await result.response;
    const text = response.text();
    
    // Limpiador de Markdown
    const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const resultadoIA = JSON.parse(cleanedText);

    return NextResponse.json({ success: true, top10: resultadoIA.ranking });

  } catch (error) {
    console.error("Error Crítico en Agente Gemini:", error);
    return NextResponse.json({ success: false, error: "Fallo en el procesamiento de IA" }, { status: 500 });
  }
}
