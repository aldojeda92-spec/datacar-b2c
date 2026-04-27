import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { leads, catalogoMatriz } from '@/lib/schema';
import { eq, and, gte, lte, or, ilike, notIlike } from 'drizzle-orm'; 
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

    // --- FILTRO DURO SQL ---
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

    const candidatos = await db.query.catalogoMatriz.findMany({ where: and(...sqlFilters), limit: 120 });
    if (candidatos.length === 0) return NextResponse.json({ success: false, error: "Sin resultados para estos filtros." }, { status: 400 });

    // --- ANÁLISIS IA ---
    const payload = candidatos.map(c => ({ id: c.id, marca: c.marca, modelo: c.modelo, precio: c.precioUsd, motor: c.motor }));
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro", generationConfig: { responseMimeType: "application/json" } });

    const systemPrompt = `Eres el Agente Analítico de DATACAR. Selecciona el TOP 10 de modelos ÚNICOS.
    Presupuesto: ${leadData.presupuestoMin}-${leadData.presupuestoMax}. Prioridades: ${JSON.stringify(leadData.atributos)}.
    NOTAS: "${leadData.notas}".
    REGLA: Máximo 10 modelos distintos. Responde solo JSON: { "ranking": [ { "id": "uuid", "puesto": 1, "match_percent": 95, "etiqueta_principal": "...", "justificacion": "..." } ] }`;

    const result = await model.generateContent(systemPrompt);
    const resultadoIA = JSON.parse(result.response.text().replace(/```json/g, '').replace(/```/g, '').trim());

    const top10 = resultadoIA.ranking.map((item: any) => {
      const dbAuto = candidatos.find(c => c.id === item.id);
      return dbAuto ? { ...item, marca: dbAuto.marca, modelo: dbAuto.modelo, version: dbAuto.version, precio_usd: dbAuto.precioUsd, origen: dbAuto.origen, url_imagen: dbAuto.urlImagen } : null;
    }).filter(Boolean);

    return NextResponse.json({ success: true, top10 });

  } catch (e) { return NextResponse.json({ success: false }, { status: 500 }); }
}
