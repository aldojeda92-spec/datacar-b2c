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

    // AUMENTAMOS EL FILTRADO SQL A 200 PARA DARLE MÁS MODELOS ÚNICOS A GEMINI
    const candidatos = await db.query.catalogoMatriz.findMany({
      where: and(
        gte(catalogoMatriz.precioUsd, leadData.presupuestoMin - 3000),
        lte(catalogoMatriz.precioUsd, leadData.presupuestoMax + 3000)
      ),
      limit: 200 
    });

    const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-pro", 
        generationConfig: { responseMimeType: "application/json" }
    });

    const systemPrompt = `Eres el Agente de Inteligencia Analítica Avanzada de DATACAR. 
    Tu tono es corporativo, premium, sobrio y basado estrictamente en métricas financieras y técnicas.

    MISIÓN: Analizar la matriz de activos y seleccionar el TOP 10 que represente la mejor inversión para el perfil del cliente.

    PERFIL DEL INVERSOR:
    - Rango Objetivo: USD ${leadData.presupuestoMin} a ${leadData.presupuestoMax}
    - Atributos Críticos Prioritarios: ${JSON.stringify(leadData.atributos)}
    - Filtros Estratégicos: ${JSON.stringify(leadData.filtros)}
    - Notas/Requerimientos: "${leadData.notas}"

    MATRIZ DE DATOS (Muestra de candidatos):
    ${JSON.stringify(candidatos)}

    REGLAS CRÍTICAS DE SELECCIÓN (URGENTE):
    1. Debes seleccionar exactamente 10 MODELOS ÚNICOS (DISTINTOS) de vehículos.
    2. Está PROHIBIDO duplicar un modelo (ej. no puedes incluir 'Toyota Hilux LX' y 'Toyota Hilux SRV' como dos puestos separados. La combinación 'Marca + Modelo' debe ser única en el ranking).
    3. Para cada MODELO ÚNICO seleccionado, elige la MEJOR VERSIÓN individual disponible en la matriz que maximice el match con el inversor. Esta versión será la 'representante' para los datos técnicos (precio, motor, etc.).
    4. La 'justificacion' debe ser un resumen ejecutivo del por qué ese MODELO es la mejor inversión, basándose en los datos de la VERSIÓN seleccionada.

    INSTRUCCIONES DE ANÁLISIS:
    - Evalúa contra Atributos Críticos y Rango de Precios.
    - Calcula "Match %" (0-100) y define una "etiqueta_principal" técnica (ej. 'ADAS Full', 'Motor Turbo').

    RESPONDE EXCLUSIVAMENTE CON UN JSON EN ESTE FORMATO (Array de 10 modelos únicos):
    { 
      "ranking": [ 
        { 
          "id": "uuid de la versión representante", 
          "puesto": 1, 
          "match_percent": 95, 
          "etiqueta_principal": "string technical tag",
          "justificacion": "Ejecutivo y técnico...",
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
