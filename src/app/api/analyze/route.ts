import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { leads, catalogoMatriz } from '@/lib/schema';
import { eq, and, gte, lte, or, ilike, inArray } from 'drizzle-orm'; 
import { GoogleGenerativeAI } from "@google/generative-ai";

export const maxDuration = 60; 
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '');

export async function POST(req: Request) {
  try {
    const { leadId } = await req.json();
    const leadData = await db.query.leads.findFirst({ where: eq(leads.id, leadId) });
    if (!leadData) return NextResponse.json({ error: "Lead no encontrado" }, { status: 404 });

    // 1. FILTRO SQL INICIAL (Rápido)
    const sqlFilters = [
      gte(catalogoMatriz.precioUsd, leadData.presupuestoMin - 2000),
      lte(catalogoMatriz.precioUsd, leadData.presupuestoMax + 2000)
    ];

    const tipos = leadData.tipos as string[]; 
    if (tipos?.length > 0) {
      const condition = or(...tipos.map((t: string) => ilike(catalogoMatriz.tipoCarroceria, `%${t}%`)));
      if (condition) sqlFilters.push(condition);
    }

    // 2. BUSCAMOS CANDIDATOS
    const candidatos = await db.query.catalogoMatriz.findMany({ 
      where: and(...sqlFilters), 
      limit: 60 
    });

    // 3. IA ELIGE LOS 10 MEJORES (Prompt ultra-corto para velocidad)
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
    const payload = candidatos.map(c => ({ id: c.id, m: c.marca, mod: c.modelo, p: c.precioUsd }));
    
    const systemPrompt = `Expert Analyst. Select TOP 10 UNIQUE models from list. 
    Profile: ${leadData.presupuestoMin}-${leadData.presupuestoMax} USD. Notes: ${leadData.notas}.
    Return ONLY JSON: { "ranking": [ { "id": "uuid", "match": 95, "tag": "tech_tag" } ] }`;

    const result = await model.generateContent(systemPrompt);
    const resultadoIA = JSON.parse(result.response.text().replace(/```json/g, '').replace(/```/g, '').trim());

    // 4. EL "MEGA-FETCH" (Buscamos todas las versiones de esos 10 modelos)
    const selectedIds = resultadoIA.ranking.map((r: any) => r.id);
    const selectedAutos = candidatos.filter(c => selectedIds.includes(c.id));
    const modelNames = Array.from(new Set(selectedAutos.map(a => a.modelo)));

    // Buscamos todas las versiones de estos modelos para el comparador
    const todasLasVersiones = await db.query.catalogoMatriz.findMany({
      where: inArray(catalogoMatriz.modelo, modelNames)
    });

    const top10Completo = resultadoIA.ranking.map((item: any, index: number) => {
      const autoPrincipal = candidatos.find(c => c.id === item.id);
      if (!autoPrincipal) return null;

      // Filtramos versiones de este modelo específico
      const versionesModelo = todasLasVersiones.filter(v => v.modelo === autoPrincipal.modelo);

      return {
        ...item,
        puesto: index + 1,
        ...autoPrincipal,
        versiones: versionesModelo.sort((a, b) => a.precioUsd - b.precioUsd)
      };
    }).filter(Boolean);

    return NextResponse.json({ success: true, top10: top10Completo });

  } catch (e) { 
    return NextResponse.json({ success: false, error: "Error de motor" }, { status: 500 }); 
  }
}
