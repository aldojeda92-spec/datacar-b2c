import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { leads, catalogoMatriz } from '@/lib/schema';
import { eq, and, gte, lte, or, ilike, notIlike, inArray } from 'drizzle-orm'; 
import { GoogleGenerativeAI } from "@google/generative-ai";

export const maxDuration = 60; 
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '');

interface FiltrosEstrategicos {
  soloChinos?: boolean;
  soloJaponeses?: boolean;
  soloCoreanos?: boolean;
  soloEV?: boolean;
  soloHEV?: boolean;
  soloCombustion?: boolean;
}

export async function POST(req: Request) {
  try {
    const { leadId } = await req.json();
    const leadData = await db.query.leads.findFirst({ where: eq(leads.id, leadId) });
    if (!leadData) return NextResponse.json({ error: "Lead no encontrado" }, { status: 404 });

    // 1. FILTRO DURO SQL
    const sqlFilters = [
      gte(catalogoMatriz.precioUsd, leadData.presupuestoMin - 2000),
      lte(catalogoMatriz.precioUsd, leadData.presupuestoMax + 2000)
    ];

    const tipos = leadData.tipos as string[]; 
    if (tipos && Array.isArray(tipos) && tipos.length > 0) {
      const condition = or(...tipos.map((t: string) => ilike(catalogoMatriz.tipoCarroceria, `%${t}%`)));
      if (condition) sqlFilters.push(condition);
    }

    const f = leadData.filtros as FiltrosEstrategicos;
    if (f) {
      if (f.soloChinos) sqlFilters.push(ilike(catalogoMatriz.origen, '%China%'));
      if (f.soloJaponeses) sqlFilters.push(ilike(catalogoMatriz.origen, '%Japón%'));
      if (f.soloCoreanos) sqlFilters.push(ilike(catalogoMatriz.origen, '%Corea%'));
      if (f.soloEV) sqlFilters.push(ilike(catalogoMatriz.motor, '%Eléctrico%'));
      if (f.soloHEV) sqlFilters.push(ilike(catalogoMatriz.motor, '%Híbrido%'));
      if (f.soloCombustion) {
        const comb = and(notIlike(catalogoMatriz.motor, '%Eléctrico%'), notIlike(catalogoMatriz.motor, '%Híbrido%'));
        if (comb) sqlFilters.push(comb);
      }
    }

    const candidatos = await db.query.catalogoMatriz.findMany({ 
      where: and(...sqlFilters), 
      limit: 100 
    });

    if (candidatos.length === 0) return NextResponse.json({ success: false, error: "Sin resultados técnicos." }, { status: 400 });

    // 2. SELECCIÓN IA (FLASH PARA VELOCIDAD)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", generationConfig: { responseMimeType: "application/json" } });
    const payload = candidatos.map(c => ({ id: c.id, m: c.marca, mod: c.modelo, p: c.precioUsd }));
    
    const systemPrompt = `Analyze cars and select TOP 10 UNIQUE models.
    Profile: ${leadData.presupuestoMin}-${leadData.presupuestoMax} USD. Notes: ${leadData.notas}.
    JSON response ONLY: { "ranking": [ { "id": "uuid", "match_percent": 95, "etiqueta_principal": "Tag corto" } ] }`;

    const result = await model.generateContent(systemPrompt);
    const resultadoIA = JSON.parse(result.response.text().replace(/```json/g, '').replace(/```/g, '').trim());

    // 3. ENRIQUECIMIENTO CON VERSIONES
    const selectedIds = resultadoIA.ranking.map((r: any) => r.id);
    const selectedAutos = candidatos.filter(c => selectedIds.includes(c.id));
    const modelNames = Array.from(new Set(selectedAutos.map(a => a.modelo)));
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
    return NextResponse.json({ success: false, error: "Fallo en motor de IA" }, { status: 500 }); 
  }
}
