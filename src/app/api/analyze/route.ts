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

    // 1. PARSEO ANTIBALAS (Detecta Strings, Arrays y JSONs malformados del Frontend)
    const parseData = (val: any): string[] => {
      if (!val) return [];
      if (Array.isArray(val)) return val.map(v => String(v).trim().toLowerCase());
      if (typeof val === 'string') {
        try {
          // Intenta parsear si el frontend mandó '["HEV", "SUV"]'
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed)) return parsed.map(v => String(v).trim().toLowerCase());
        } catch (e) {
          // Si no es JSON, asume separador por comas
          return val.split(',').map(v => v.trim().toLowerCase());
        }
      }
      return [String(val).trim().toLowerCase()];
    };

    const sTipo = parseData(leadData.tipoVehiculo).filter(v => v !== 'todas' && v !== '');
    const sMotorRaw = parseData(leadData.motorizacion).filter(v => v !== 'todas' && v !== '');
    const sOrigen = parseData(leadData.origen).map(o => o.replace('solo ', '')).filter(v => v !== 'todas' && v !== '');
    const sConce = parseData(leadData.concesionariaPreferencia);
    const attrs = parseData(leadData.atributos);

    // 2. DICCIONARIO DE MOTORIZACIÓN EXPANDIDO
    const motorMap: Record<string, string[]> = {
      'hev': ['híbrido', 'hybrid', 'autorrecargable', 'hev', 'mhev'],
      'phev': ['enchufable', 'plug-in', 'phev', 'híbrido enchufable'],
      'bev': ['eléctrico', 'ev', '100% eléctrico', 'bev', 'electric'],
      'flex': ['flex', 'alcohol', 'etanol'],
      'diesel': ['diesel', 'diésel', 'gasoil'],
      'nafta': ['nafta', 'gasolina', 'gas']
    };
    
    const sMotorTarget = sMotorRaw.flatMap(m => motorMap[m] || [m]);

    const pMin = Math.floor(Number(leadData.presupuestoMin) || 0);
    const pMax = Math.floor(Number(leadData.presupuestoMax) || 999999);

    console.log(">>> [AUDITORÍA DE FILTROS] - Si esto está vacío, el Frontend no está enviando la data:");
    console.log({ sTipo, sMotorTarget, sOrigen, pMin, pMax });

    // 3. CONSTRUCCIÓN DE SQL QUIRÚRGICO
    const queryConditions = [
      gte(catalogoMatriz.precioUsd, pMin),
      lte(catalogoMatriz.precioUsd, pMax)
    ];

    if (sTipo.length > 0) {
      queryConditions.push(or(...sTipo.map(t => ilike(catalogoMatriz.tipoCarroceria, `%${t}%`)))!);
    }

    // EL GRAN ARREGLO: Buscamos en 'combustible' Y en 'motor' al mismo tiempo
    if (sMotorTarget.length > 0) {
      const motorConditions = sMotorTarget.flatMap(m => [
        ilike(catalogoMatriz.combustible, `%${m}%`),
        ilike(catalogoMatriz.motor, `%${m}%`)
      ]);
      queryConditions.push(or(...motorConditions)!);
    }

    if (sOrigen.length > 0) {
      queryConditions.push(or(...sOrigen.map(o => ilike(catalogoMatriz.origenMarca, `%${o}%`)))!);
    }

    // 4. EJECUCIÓN DIRECTA
    const candidatosEstrictos = await db.select().from(catalogoMatriz).where(and(...queryConditions));

    if (candidatosEstrictos.length === 0) {
      return NextResponse.json({ success: true, top10: [] });
    }

    // 5. ORDENAMIENTO POR CONCESIONARIA (El único filtro blando permitido)
    const clasificados = candidatosEstrictos.map(auto => {
      const dbConce = (auto.concesionaria || "").toLowerCase();
      const isConceMatch = sConce.length === 0 || sConce.includes('todas') || sConce.some(c => dbConce.includes(c));
      return { ...auto, isConceMatch, matchPercent: isConceMatch ? 99 : 85 };
    });

    const sorted = clasificados.sort((a, b) => {
      if (a.isConceMatch === b.isConceMatch) return (a.precioUsd ?? 0) - (b.precioUsd ?? 0);
      return a.isConceMatch ? -1 : 1;
    });

    const vistos = new Set();
    const finalTop: typeof sorted = [];
    for (const a of sorted) {
      if (!vistos.has(a.modelo) && finalTop.length < 10) {
        vistos.add(a.modelo);
        finalTop.push(a);
      }
    }

    // 6. IA: JUSTIFICACIÓN
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

    // 7. RESPUESTA FINAL
    const top10 = await Promise.all(finalTop.map(async (auto, i) => {
      const vRaw = await db.query.catalogoMatriz.findMany({
        where: eq(catalogoMatriz.modelo, auto.modelo ?? ""),
        orderBy: [catalogoMatriz.precioUsd]
      });

      return {
        ...auto,
        match_percent: auto.matchPercent,
        veredicto: veredictos[i]?.trim() || "Cumple 100% con tu configuración estricta de carrocería, motorización y presupuesto.",
        versiones: vRaw.map(v => ({ ...v, match_percent: auto.matchPercent }))
      };
    }));

    return NextResponse.json({ success: true, top10 });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
