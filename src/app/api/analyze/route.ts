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

    // 4. ORDENAMIENTO POR CONCESIONARIA (SOFT FILTER)
    const clasificados = candidatosEstrictos.map(auto => {
      const dbConce = (auto.concesionaria || "").toLowerCase();
      // Verificamos si pidió una concesionaria específica o "todas"
      const isConceMatch = sConce.length === 0 || sConce.some(c => ['todas', 'todos'].includes(c)) || sConce.some(c => dbConce.includes(c));
      return { ...auto, isConceMatch, matchPercent: isConceMatch ? 99 : 85 };
    });

    // Orden: Primero las que hacen match con la concesionaria, luego por precio de menor a mayor
    const sorted = clasificados.sort((a, b) => {
      if (a.isConceMatch === b.isConceMatch) return (a.precioUsd ?? 0) - (b.precioUsd ?? 0);
      return a.isConceMatch ? -1 : 1;
    });

    // Unicidad (Top 10 modelos distintos)
    const vistos = new Set();
    const finalTop: typeof sorted = [];
    for (const a of sorted) {
      if (!vistos.has(a.modelo) && finalTop.length < 10) {
        vistos.add(a.modelo);
        finalTop.push(a);
      }
    }

    // 5. IA: JUSTIFICACIÓN POR ATRIBUTOS
    let veredictos: string[] = [];
    if (finalTop.length > 0) {
      try {
        const prompt = `Actúa como consultor técnico automotriz. Justifica estos ${finalTop.length} autos para un cliente que prioriza: ${attrs.join(', ')}.
        Escribe una frase de 15 palabras por auto. Una por línea. No nombres el modelo ni la marca.
        Lista: ${finalTop.map(a => `${a.marca} ${a.modelo}: ${a.airbags} airbags, motor ${a.combustible}`).join('\n')}`;

        const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash:generateContent?key=${process.env.GOOGLE_GENERATIVE_AI_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        const aiData = await aiRes.json();
        const text = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
        veredictos = text.split('\n').filter((l: string) => l.trim().length > 5);
      } catch (e) {
        console.warn("Fallo IA");
      }
    }

    // 6. RESPUESTA FINAL
    const top10 = await Promise.all(finalTop.map(async (auto, i) => {
      const vRaw = await db.query.catalogoMatriz.findMany({
        where: eq(catalogoMatriz.modelo, auto.modelo ?? ""),
        orderBy: [catalogoMatriz.precioUsd]
      });

      return {
        ...auto,
        match_percent: auto.matchPercent,
        veredicto: veredictos[i]?.trim() || "Cumple 100% con tu configuración estricta de carrocería, motorización, origen y presupuesto.",
        versiones: vRaw.map(v => ({ ...v, match_percent: auto.matchPercent }))
      };
    }));

    return NextResponse.json({ success: true, top10 });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
