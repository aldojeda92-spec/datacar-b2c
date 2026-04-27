import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { leads, catalogoMatriz } from '@/lib/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { GoogleGenerativeAI } from "@google/generative-ai";

// Forzamos a Vercel a permitir que la IA piense por más tiempo (máximo 60 segundos)
export const maxDuration = 60; 

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '');

export async function POST(req: Request) {
  try {
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      console.error("FALTA API KEY DE GOOGLE EN VERCEL");
      return NextResponse.json({ success: false, error: "API Key no configurada" }, { status: 500 });
    }

    const { leadId } = await req.json();

    const leadData = await db.query.leads.findFirst({
      where: eq(leads.id, leadId)
    });

    if (!leadData) return NextResponse.json({ error: "Lead no encontrado" }, { status: 404 });

    const candidatos = await db.query.catalogoMatriz.findMany({
      where: and(
        gte(catalogoMatriz.precioUsd, leadData.presupuestoMin - 2000),
        lte(catalogoMatriz.precioUsd, leadData.presupuestoMax + 2000)
      ),
      limit: 100 
    });

    const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-pro",
        generationConfig: { responseMimeType: "application/json" }
    });

    const systemPrompt = `Eres el Agente de Inteligencia Analítica de DATACAR. 
    Tu tono es corporativo, de alta jerarquía, sobrio y basado estrictamente en métricas.

    MISIÓN: Analizar la matriz de activos y seleccionar el TOP 10 que represente la mejor inversión.

    PERFIL DEL INVERSOR:
    - Rango: USD ${leadData.presupuestoMin} a ${leadData.presupuestoMax}
    - Atributos Críticos: ${JSON.stringify(leadData.atributos)}
    - Filtros del Cliente: ${JSON.stringify(leadData.filtros)}
    - Notas Estratégicas: ${leadData.notas}

    MATRIZ DE DATOS (Candidatos):
    ${JSON.stringify(candidatos)}

    REGLAS TÉCNICAS:
    1. El ranking debe ser de exactamente 10 vehículos (si hay menos candidatos, incluye los que haya).
    2. Cada "justificacion" debe mencionar datos técnicos (Motor, ADAS, Origen o Precio) para validar la inversión.
    3. No uses lenguaje emocional. Usa lenguaje de consultoría automotriz.

    RESPONDE ÚNICAMENTE EN ESTE FORMATO JSON:
    { "ranking": [ { "id": "uuid", "puesto": 1, "marca": "...", "modelo": "...", "justificacion": "..." } ] }`;

    const result = await model.generateContent(systemPrompt);
    const response = await result.response;
    const text = response.text();
    
    // LIMPIADOR DE MARKDOWN: Quitamos las comillas invertidas si Gemini las envía por error
    const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const resultadoIA = JSON.parse(cleanedText);

    return NextResponse.json({ success: true, top10: resultadoIA.ranking });

  } catch (error) {
    console.error("Error Crítico en Agente Gemini:", error);
    return NextResponse.json({ success: false, error: "Fallo en el procesamiento de IA" }, { status: 500 });
  }
}
