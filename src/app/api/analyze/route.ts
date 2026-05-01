import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { catalogoMatriz, leads } from '@/lib/schema';
import { eq, and, gte, lte, ilike, or } from 'drizzle-orm';

export const maxDuration = 60;

export async function POST(req: Request) {
  const start = Date.now();
  
  try {
    const { leadId } = await req.json();
    const leadData = await db.query.leads.findFirst({ where: eq(leads.id, leadId) });
    
    if (!leadData) return NextResponse.json({ error: "Lead no encontrado" }, { status: 404 });

    // 1. PARSEO ANTIBALAS (Limpieza de inputs)
    const parseData = (val: any): string[] => {
      if (!val) return [];
      if (Array.isArray(val)) return val.map(v => String(v).trim().toLowerCase());
      if (typeof val === 'string') {
        try {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed)) return parsed.map(v => String(v).trim().toLowerCase());
        } catch (e) {
          return val.split(',').map(v => v.trim().toLowerCase());
        }
      }
      return [String(val).trim().toLowerCase()];
    };

    // Función auxiliar para ignorar valores de "selección total"
    const isNotAll = (v: string) => !['todas', 'todos', 'cualquiera', 'cualquier', ''].includes(v);

    const sTipo = parseData(leadData.tipoVehiculo).filter(isNotAll);
    const sConce = parseData(leadData.concesionariaPreferencia);
    const attrs = parseData(leadData.atributos);

    // 2. DICCIONARIO DE MOTORIZACIÓN (Intocable, traduce UI a Data Técnica)
    const motorMap: Record<string, string[]> = {
      'hev': ['híbrido', 'hybrid', 'autorrecargable', 'hev', 'mhev'],
      'phev': ['enchufable', 'plug-in', 'phev', 'híbrido enchufable'],
      'bev': ['eléctrico', 'ev', '100% eléctrico', 'bev', 'electric'],
      'flex': ['flex', 'alcohol', 'etanol'],
      'diesel': ['diesel', 'diésel', 'gasoil'],
      'nafta': ['nafta', 'gasolina', 'gas']
    };
    
    const sMotorRaw = parseData(leadData.motorizacion).filter(isNotAll);
    const sMotorTarget = sMotorRaw.flatMap(m => motorMap[m] || [m]);

    // DICCIONARIO DE ORIGEN (Traductor Frontend -> DB)
    const origenMap: Record<string, string[]> = {
      'solo chinos': ['china', 'chino', 'prc'],
      'solo japoneses': ['japón', 'japon', 'japonés', 'japones'],
      'solo coreanos': ['corea', 'coreano', 'corea del sur'],
      'solo europeos': ['europa', 'europeo', 'alemania', 'francia', 'inglaterra', 'italia', 'españa'],
      'solo usa': ['usa', 'eeuu', 'estados unidos', 'ee.uu.']
    };
    
    const sOrigenRaw = parseData(leadData.origen).filter(isNotAll);
    const sOrigenTarget = sOrigenRaw.flatMap(o => origenMap[o] || [o.replace('solo ', '')]);

    // SANITIZACIÓN DE PRECIOS
    const pMin = Math.floor(Number(leadData.presupuestoMin) || 0);
    const pMax = Math.floor(Number(leadData.presupuestoMax) || 999999);

    console.log(">>> [ARQUITECTURA] Payload Mapeado:", { sTipo, sMotorTarget, sOrigenTarget, pMin, pMax });

    // 3. SQL QUIRÚRGICO (HARD FILTERS)
    const queryConditions = [
      gte(catalogoMatriz.precioUsd, pMin),
      lte(catalogoMatriz.precioUsd, pMax)
    ];

    if (sTipo.length > 0) {
      queryConditions.push(or(...sTipo.map(t => ilike(catalogoMatriz.tipoCarroceria, `%${t}%`)))!);
    }

    if (sMotorTarget.length > 0) {
      const motorConditions = sMotorTarget.flatMap(m => [
        ilike(catalogoMatriz.combustible, `%${m}%`),
        ilike(catalogoMatriz.motor, `%${m}%`)
      ]);
      queryConditions.push(or(...motorConditions)!);
    }

    if (sOrigenTarget.length > 0) {
      queryConditions.push(or(...sOrigenTarget.map(o => ilike(catalogoMatriz.origenMarca, `%${o}%`)))!);
    }

    // Ejecución. Si no hay match exacto, devolvemos vacío y el Frontend debe mostrar mensaje de "No hay opciones".
    const candidatosEstrictos = await db.select().from(catalogoMatriz).where(and(...queryConditions));

    if (candidatosEstrictos.length === 0) {
      return NextResponse.json({ success: true, top10: [] });
    }

    // 4. ALGORITMO DATACAR MATCH SCORE (Scoring Dinámico)
    const candidatosConConcesionaria = candidatosEstrictos.map(auto => {
      const dbConce = (auto.concesionaria || "").toLowerCase();
      const isConceMatch = sConce.length === 0 || sConce.some(c => ['todas', 'todos'].includes(c)) || sConce.some(c => dbConce.includes(c));
      return { ...auto, isConceMatch };
    });

    // Unicidad (Top 10 modelos distintos) antes de calcular el precio relativo
    const vistos = new Set();
    let finalTop = [];
    for (const a of candidatosConConcesionaria) {
      if (!vistos.has(a.modelo) && finalTop.length < 10) {
        vistos.add(a.modelo);
        finalTop.push(a);
      }
    }

    // Cálculo de Eficiencia de Precio (El más barato = 15 pts, el más caro = 0 pts)
    const minPrice = Math.min(...finalTop.map(a => a.precioUsd ?? 0));
    const maxPrice = Math.max(...finalTop.map(a => a.precioUsd ?? 0));

    finalTop = finalTop.map(auto => {
      let score = 70; // Base: Cumple filtros duros
      if (auto.isConceMatch) score += 15; // Bono Concesionaria
      
      const p = auto.precioUsd ?? 0;
      if (maxPrice === minPrice) {
        score += 15; // Si todos cuestan igual, todos ganan el bono
      } else {
        // Regla de tres inversa: a menor precio, mayor puntaje (hasta 15)
        score += Math.round(15 * (1 - ((p - minPrice) / (maxPrice - minPrice))));
      }
      return { ...auto, matchPercent: score };
    });

    // Ordenamiento Final: Primero el de mayor Match Score, luego el más barato
    finalTop.sort((a, b) => b.matchPercent - a.matchPercent || (a.precioUsd ?? 0) - (b.precioUsd ?? 0));

    // 5. IA: PIPELINE DE DATOS JSON (Análisis Comparativo con Hard-Prompting)
    let veredictosArray: any[] = [];
    if (finalTop.length > 0) {
      try {
        // Enriquecemos el payload con atributos de Neon para que la IA compare
        const aiPayload = finalTop.map((a, index) => ({
          index,
          precio: a.precioUsd,
          motor: a.combustible,
          airbags: a.airbags,
          adas: a.adas ? "Equipado" : "Básico",
          pantalla: a.tamanhoPantalla,
          plazas: a.plazas,
          baulera: a.bauleraLitros
        }));

        // AUDITORÍA PRE-VUELO: Verificamos qué le estamos mandando a Google
        console.log(`>>> [DEBUG PAYLOAD A GEMINI]: Enviando ${aiPayload.length} vehículos a analizar.`);

        // PROMPT RE-ESTRUCTURADO (Anti-Alucinaciones y Anti-Pereza)
        const prompt = `Actúa como Analista de Datos de DATACAR.
        A continuación recibirás un array JSON con ${finalTop.length} vehículos.
        
        TAREA OBLIGATORIA: Escribe un 'veredicto' comparativo de máximo 15 palabras para CADA UNO de los vehículos basándote en sus atributos (precio, motor, baulera, plazas, etc.).
        
        REGLAS ESTRICTAS:
        1. NO menciones marcas ni modelos bajo ninguna circunstancia.
        2. Compara los vehículos entre sí (Ejemplos válidos: "Es la opción más económica del grupo", "Destaca por su baulera líder en capacidad", "El único con tecnología híbrida y ADAS completo").
        3. DEBES generar exactamente ${finalTop.length} veredictos.
        
        Devuelve ÚNICAMENTE un array JSON válido, sin texto adicional, sin markdown y sin bloques de código, con esta estructura exacta:
        [
          {"index": <numero_de_index>, "veredicto": "<tu_frase_aqui>"}
        ]
        
        JSON DE VEHÍCULOS A ANALIZAR:
        ${JSON.stringify(aiPayload)}`;

        const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${process.env.GOOGLE_GENERATIVE_AI_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        const aiData = await aiRes.json();
        
        // AUDITORÍA EXTREMA: Si Google no devuelve candidatos, escupimos el error completo
        if (!aiData.candidates || aiData.candidates.length === 0) {
          console.error(">>> [FATAL GEMINI API]: La IA no devolvió texto. Objeto completo:", JSON.stringify(aiData, null, 2));
        }
        
        const textResponse = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
        console.log(">>> [RAW IA COMPLETO]:", textResponse); // Ahora vemos la respuesta entera, sin recortar
        
        // EXTRACCIÓN AGRESIVA: Buscamos el primer '[' y el último ']'
        const match = textResponse.match(/\[[\s\S]*\]/);
        
        if (match) {
          veredictosArray = JSON.parse(match[0]);
          console.log(`>>> [IA JSON PARSED]: ${veredictosArray.length} veredictos extraídos correctamente.`);
        } else {
          console.warn(">>> [WARNING IA] No se detectó un array JSON en la respuesta. Fallback activado.");
        }
      } catch (e) {
        console.error(">>> [ERROR PARSEO IA]:", e);
      }
    }

    // 6. RESPUESTA FINAL MAPEDA
    const top10 = await Promise.all(finalTop.map(async (auto, i) => {
      const vRaw = await db.query.catalogoMatriz.findMany({
        where: eq(catalogoMatriz.modelo, auto.modelo ?? ""),
        orderBy: [catalogoMatriz.precioUsd]
      });

      // Aseguramos emparejar el veredicto correcto por su índice
      const veredictoObj = veredictosArray.find((v: any) => v.index === i);

      return {
        ...auto,
        match_percent: auto.matchPercent,
        veredicto: veredictoObj?.veredicto || "Opción destacada que cumple estrictamente con tu configuración y presupuesto.",
        versiones: vRaw.map(v => ({ ...v, match_percent: auto.matchPercent }))
      };
    }));

    console.log(`>>> [ARQUITECTURA] Pipeline Completado con Match Dinámico en ${Date.now() - start}ms`);
    return NextResponse.json({ success: true, top10 });

  } catch (error: any) {
    console.error(">>> [FATAL ERROR]:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
