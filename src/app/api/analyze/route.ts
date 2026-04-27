import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { leads, catalogoMatriz } from '@/lib/schema';
import { eq, and, gte, lte, or, ilike } from 'drizzle-orm'; 
import { GoogleGenerativeAI } from "@google/generative-ai";

export const maxDuration = 60; 
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '');

export async function POST(req: Request) {
  try {
    const { leadId } = await req.json();

    const leadData = await db.query.leads.findFirst({
      where: eq(leads.id, leadId)
    });

    if (!leadData) return NextResponse.json({ error: "Lead no encontrado" }, { status: 404 });

    // --- ESTRATEGIA HÍBRIDA: PASO 1 - EL FILTRO DURO (SQL) ---
    const sqlFilters = [
      gte(catalogoMatriz.precioUsd, leadData.presupuestoMin - 2000),
      lte(catalogoMatriz.precioUsd, leadData.presupuestoMax + 2000)
    ];

    // Filtro por Tipo de Carrocería blindado para Drizzle ORM
    const tiposGuardados = leadData.tipos as string[]; 
    if (tiposGuardados && Array.isArray(tiposGuardados) && tiposGuardados.length > 0) {
      // Usamos tipoCarroceria (Cámbialo a tipo_carroceria si tu schema usa guiones bajos en el nombre de la variable)
      const condition = or(...tiposGuardados.map((t: string) => ilike(catalogoMatriz.tipoCarroceria, `%${t}%`)));
      if (condition) {
        sqlFilters.push(condition);
      }
    }

    // Filtros de Origen
    if (leadData.filtros.soloChinos) sqlFilters.push(ilike(catalogoMatriz.origen, '%China%'));
    if (leadData.filtros.soloJaponeses) sqlFilters.push(ilike(catalogoMatriz.origen, '%Japón%'));
    if (leadData.filtros.soloCoreanos) sqlFilters.push(ilike(catalogoMatriz.origen, '%Corea%'));

    // Filtros de Motor
    if (leadData.filtros.soloEV) sqlFilters.push(ilike(catalogoMatriz.motor, '%Eléctrico%'));
    if (leadData.filtros.soloHEV) sqlFilters.push(ilike(catalogoMatriz.motor, '%Híbrido%'));

    // Ejecutamos la búsqueda purgada
    const candidatosCompletos = await db.query.catalogoMatriz.findMany({
      where: and(...sqlFilters),
      limit: 100 
    });

    if (candidatosCompletos.length === 0) {
      return NextResponse.json({ success: false, error: "No hay vehículos que cumplan estos filtros." }, { status: 400 });
    }

    // --- PASO 2 - SELECCIÓN INTELIGENTE (GEMINI FLASH) ---
    const payloadLigero = candidatosCompletos.map(c => ({ id: c.id, marca: c.marca, modelo: c.modelo, precio_usd: c.precioUsd }));

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro", generationConfig: { responseMimeType: "application/json" } });

    const systemPrompt = `Eres el Agente de Inversión de DATACAR. 
    Selecciona los 10 mejores modelos ÚNICOS del catálogo purgado.
    Prioriza estos atributos: ${JSON.stringify(leadData.atributos)}.
    Nota del cliente: "${leadData.notas}"
    
    CATÁLOGO PRE-FILTRADO: ${JSON.stringify(payloadLigero)}

    Responde en JSON: { "ranking": [ { "id": "uuid", "puesto": 1, "match_percent": 95, "etiqueta_principal": "...", "justificacion": "..." } ] }`;

    const result = await model.generateContent(systemPrompt);
    const response = await result.response;
    const resultadoIA = JSON.parse(response.text().replace(/```json/g, '').replace(/```/g, '').trim());

    // Enriquecemos con los datos de la DB
    const top10 = resultadoIA.ranking.map((item: any) => {
      const dbAuto = candidatosCompletos.find(c => c.id === item.id);
      return dbAuto ? { ...item, marca: dbAuto.marca, modelo: dbAuto.modelo, version: dbAuto.version, precio_usd: dbAuto.precioUsd, origen: dbAuto.origen, url_imagen: dbAuto.urlImagen } : null;
    }).filter(Boolean);

    return NextResponse.json({ success: true, top10 });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
