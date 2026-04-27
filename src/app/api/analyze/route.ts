import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { leads, catalogoMatriz } from '@/lib/schema';
import { eq, and, gte, lte, or, ilike, notIlike } from 'drizzle-orm'; 
import { GoogleGenerativeAI } from "@google/generative-ai";

export const maxDuration = 60; 
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '');

// Interfaz para el casting de filtros guardados en JSONB
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

    const leadData = await db.query.leads.findFirst({
      where: eq(leads.id, leadId)
    });

    if (!leadData) return NextResponse.json({ error: "Lead no encontrado" }, { status: 404 });

    // --- ESTRATEGIA HÍBRIDA: PASO 1 - EL FILTRO DURO (SQL) ---
    const sqlFilters = [
      gte(catalogoMatriz.precioUsd, leadData.presupuestoMin - 2000),
      lte(catalogoMatriz.precioUsd, leadData.presupuestoMax + 2000)
    ];

    // Filtro de Carrocería (SUV, Pickup, etc.)
    const tipos = leadData.tipos as string[]; 
    if (tipos && Array.isArray(tipos) && tipos.length > 0) {
      const condition = or(...tipos.map((t: string) => ilike(catalogoMatriz.tipoCarroceria, `%${t}%`)));
      if (condition) sqlFilters.push(condition);
    }

    // Filtros Estratégicos (Origen y Motor)
    const f = leadData.filtros as FiltrosEstrategicos;
    if (f) {
      if (f.soloChinos) sqlFilters.push(ilike(catalogoMatriz.origen, '%China%'));
      if (f.soloJaponeses) sqlFilters.push(ilike(catalogoMatriz.origen, '%Japón%'));
      if (f.soloCoreanos) sqlFilters.push(ilike(catalogoMatriz.origen, '%Corea%'));
      if (f.soloEV) sqlFilters.push(ilike(catalogoMatriz.motor, '%Eléctrico%'));
      if (f.soloHEV) sqlFilters.push(ilike(catalogoMatriz.motor, '%Híbrido%'));
      if (f.soloCombustion) {
        sqlFilters.push(and(
          notIlike(catalogoMatriz.motor, '%Eléctrico%'),
          notIlike(catalogoMatriz.motor, '%Híbrido%')
        ));
      }
    }

    // Ejecutamos la búsqueda purgada (Limitamos a 100 para eficiencia de tokens)
    const candidatos = await db.query.catalogoMatriz.findMany({
      where: and(...sqlFilters),
      limit: 100 
    });

    if (candidatos.length === 0) {
      return NextResponse.json({ success: false, error: "No se encontraron vehículos con estos filtros técnicos. Intenta ampliar el rango o cambiar la categoría." }, { status: 400 });
    }

    // --- PASO 2 - SELECCIÓN INTELIGENTE (GEMINI 2.5 PRO) ---
    // Payload ligero para ahorrar tokens y latencia
    const payload = candidatos.map(c => ({ 
      id: c.id, 
      marca: c.marca, 
      modelo: c.modelo, 
      precio: c.precioUsd,
      motor: c.motor
    }));

    const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-pro", // El modelo solicitado
        generationConfig: { responseMimeType: "application/json" } 
    });

    const systemPrompt = `Eres el Agente Analítico Senior de DATACAR. 
    Tu misión es seleccionar el TOP 10 de modelos ÚNICOS para un inversor.
    
    PERFIL DEL CLIENTE:
    - Presupuesto: USD ${leadData.presupuestoMin} a ${leadData.presupuestoMax}
    - Prioridades Técnicas: ${JSON.stringify(leadData.atributos)}
    - NOTAS ESTRATÉGICAS: "${leadData.notas}"
    
    REGLAS DE RANKING:
    1. Debes devolver exactamente 10 puestos (si hay menos candidatos, devuélvelos todos).
    2. NO repitas Modelos. Solo 1 versión representante por cada modelo.
    3. Calcula el 'match_percent' basado en las notas del cliente y sus prioridades.
    4. La 'etiqueta_principal' debe ser técnica (ej: 'Motor Turbo', 'ADAS Nivel 2', 'Bajo Consumo').
    5. 'justificacion' es un análisis de máximo 15 palabras del por qué es una buena inversión.

    DATOS DISPONIBLES:
    ${JSON.stringify(payload)}

    RESPONDE EXCLUSIVAMENTE CON ESTE JSON:
    { "ranking": [ { "id": "uuid", "puesto": 1, "match_percent": 95, "etiqueta_principal": "...", "justificacion": "..." } ] }`;

    const result = await model.generateContent(systemPrompt);
    const responseText = result.response.text();
    const cleanedJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const resultadoIA = JSON.parse(cleanedJson);

    // --- PASO 3 - ENRIQUECIMIENTO FINAL ---
    const top10Enriquecido = resultadoIA.ranking.map((item: any) => {
      const dbAuto = candidatos.find(c => c.id === item.id);
      if (!dbAuto) return null;
      return {
        ...item,
        marca: dbAuto.marca,
        modelo: dbAuto.modelo,
        version: dbAuto.version,
        precio_usd: dbAuto.precioUsd,
        origen: dbAuto.origen,
        url_imagen: dbAuto.urlImagen
      };
    }).filter(Boolean);

    return NextResponse.json({ success: true, top10: top10Enriquecido });

  } catch (error) {
    console.error("Error en API Analyze:", error);
    return NextResponse.json({ success: false, error: "Fallo en el motor analítico de IA." }, { status: 500 });
  }
}
