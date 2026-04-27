import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { leads, catalogoMatriz } from '@/lib/schema';
import { eq, and, gte, lte, or, ilike, notIlike, inArray } from 'drizzle-orm'; 
import { GoogleGenerativeAI } from "@google/generative-ai";

export const maxDuration = 60; 
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '');

export async function POST(req: Request) {
  try {
    const { leadId } = await req.json();
    const leadData = await db.query.leads.findFirst({ where: eq(leads.id, leadId) });
    if (!leadData) return NextResponse.json({ error: "Lead no encontrado" }, { status: 404 });

    // 1. FILTRO SQL
    const sqlFilters = [
      gte(catalogoMatriz.precioUsd, leadData.presupuestoMin - 2000),
      lte(catalogoMatriz.precioUsd, leadData.presupuestoMax + 2000)
    ];

    const tipos = leadData.tipos as string[]; 
    if (tipos && tipos.length > 0) {
      const condition = or(...tipos.map((t: string) => ilike(catalogoMatriz.tipoCarroceria, `%${t}%`)));
      if (condition) sqlFilters.push(condition);
    }

    const candidatos = await db.query.catalogoMatriz.findMany({ 
      where: and(...sqlFilters), 
      limit: 60 
    });

    if (candidatos.length === 0) return NextResponse.json({ success: false, error: "Sin resultados técnicos." }, { status: 400 });

    // 2. IA ELIGE (Gemini 1.5 Flash para velocidad)
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview", generationConfig: { responseMimeType: "application/json" } });
    const payload = candidatos.map(c => ({ id: c.id, m: c.marca, mod: c.modelo, p: c.precioUsd }));
    
    const systemPrompt = `Selecciona el TOP 10 de modelos ÚNICOS.
    Presupuesto: ${leadData.presupuestoMin}-${leadData.presupuestoMax}. Notas: ${leadData.notas}.
    Responde solo JSON: { "ranking": [ { "id": "uuid", "match_percent": 95, "etiqueta_principal": "Tag corto" } ] }`;

    const result = await model.generateContent(systemPrompt);
    const resultadoIA = JSON.parse(result.response.text().replace(/```json/g, '').replace(/```/g, '').trim());

    // 3. BUSCAMOS VERSIONES DE LOS ELEGIDOS
    const modelNames = Array.from(new Set(candidatos.filter(c => resultadoIA.ranking.map((r:any)=>r.id).includes(c.id)).map(a => a.modelo)));
    const todasLasVersiones = await db.query.catalogoMatriz.findMany({
      where: inArray(catalogoMatriz.modelo, modelNames)
    });

    const top10 = resultadoIA.ranking.map((item: any, index: number) => {
      const autoPrincipal = candidatos.find(c => c.id === item.id);
      if (!autoPrincipal) return null;
      return {
        ...item,
        puesto: index + 1,
        ...autoPrincipal,
        versiones: todasLasVersiones.filter(v => v.modelo === autoPrincipal.modelo).sort((a,b) => a.precioUsd - b.precioUsd)
      };
    }).filter(Boolean);

    return NextResponse.json({ success: true, top10 });

  } catch (e) { 
    return NextResponse.json({ success: false, error: "Fallo en motor" }, { status: 500 }); 
  }
}
