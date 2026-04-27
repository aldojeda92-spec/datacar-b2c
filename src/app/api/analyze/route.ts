import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { leads, catalogoMatriz } from '@/lib/schema';
import { eq, and, gte, lte, or, ilike, notIlike, sql } from 'drizzle-orm'; 
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

    // --- FILTRO SQL (DETERMINISTA Y RÁPIDO) ---
    const sqlFilters = [
      gte(catalogoMatriz.precioUsd, leadData.presupuestoMin - 1500),
      lte(catalogoMatriz.precioUsd, leadData.presupuestoMax + 1500)
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

    // Ordenamos por relevancia de precio antes de enviar a la IA (Más velocidad)
    const candidatos = await db.query.catalogoMatriz.findMany({ 
      where: and(...sqlFilters), 
      orderBy: [sql`ABS(precio_usd - ${(leadData.presupuestoMin + leadData.presupuestoMax) / 2})`],
      limit: 50 // Bajamos de 120 a 50 para que la IA responda instantáneo
    });

    if (candidatos.length === 0) return NextResponse.json({ success: false, error: "Sin resultados." }, { status: 400 });

    // --- ANÁLISIS IA (VELOCIDAD FLASH) ---
    const payload = candidatos.map(c => ({ id: c.id, m: c.marca, mod: c.modelo, p: c.precioUsd }));
    
    // CAMBIO CLAVE: Usamos gemini-1.5-flash para velocidad de producción
    const model = genAI.getGenerativeModel({ 
        model: "gemini-3-flash-preview", 
        generationConfig: { 
            responseMimeType: "application/json",
            temperature: 0.1 // Menos creatividad = más velocidad y precisión
        } 
    });

    const systemPrompt = `Analyze car data. Select TOP 10 UNIQUE models.
    Profile: Price ${leadData.presupuestoMin}-${leadData.presupuestoMax}, Priority: ${JSON.stringify(leadData.atributos)}.
    Notes: "${leadData.notas}".
    Return JSON: { "ranking": [ { "id": "uuid", "puesto": 1, "match_percent": 95, "etiqueta_principal": "short_tech_tag" } ] }`;

    const result = await model.generateContent(systemPrompt);
    const resultadoIA = JSON.parse(result.response.text().replace(/```json/g, '').replace(/```/g, '').trim());

    // Merge final
    const top10 = resultadoIA.ranking.map((item: any) => {
      const dbAuto = candidatos.find(c => c.id === item.id);
      return dbAuto ? { ...item, marca: dbAuto.marca, modelo: dbAuto.modelo, version: dbAuto.version, precio_usd: dbAuto.precioUsd, origen: dbAuto.origen, url_imagen: dbAuto.urlImagen } : null;
    }).filter(Boolean);

    return NextResponse.json({ success: true, top10 });

  } catch (e) { 
    return NextResponse.json({ success: false }, { status: 500 }); 
  }
}
