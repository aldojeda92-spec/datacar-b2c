import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { catalogoMatriz, leads } from '@/lib/schema';
import { eq, and, gte, lte, ilike, or } from 'drizzle-orm';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { leadId } = await req.json();
    const leadData = await db.query.leads.findFirst({ where: eq(leads.id, leadId) });
    
    if (!leadData) return NextResponse.json({ error: "Lead no encontrado" }, { status: 404 });

    // 1. SANITIZACIÓN Y NORMALIZACIÓN
    const normalize = (val: any): string[] => {
      if (!val) return [];
      const arr = Array.isArray(val) ? val : [val];
      return arr.map(v => String(v).trim().toLowerCase());
    };

    const sTipo = normalize(leadData.tipoVehiculo);
    const sMotor = normalize(leadData.motorizacion);
    const sOrigen = normalize(leadData.origen).map(o => o.replace('solo ', ''));
    const sConce = normalize(leadData.concesionariaPreferencia);
    const attrs = normalize(leadData.atributos);

    // REDONDEO CRÍTICO: Evita el error de precisión en Postgres
    const pMin = Math.floor(Number(leadData.presupuestoMin) || 0);
    const pMax = Math.floor(Number(leadData.presupuestoMax) || 999999);
    const pMaxConBuffer = Math.floor(pMax * 1.15); // El 15% de buffer para Tier 5

    // 2. SQL: FILTRO DE SEGURIDAD (HARD FILTERS)
    const queryConditions = [
      gte(catalogoMatriz.precioUsd, pMin),
      lte(catalogoMatriz.precioUsd, pMaxConBuffer)
    ];

    // Si el usuario eligió tipos, el SQL es inflexible aquí para no traer basura
    if (sTipo.length > 0) {
      queryConditions.push(or(...sTipo.map(t => ilike(catalogoMatriz.tipoCarroceria, `%${t}%`)))!);
    }

    const candidatos = await db.select().from(catalogoMatriz).where(and(...queryConditions));

    // 3. LÓGICA DE TIERS (PROCESAMIENTO EN MEMORIA)
    const clasificados = candidatos.map(auto => {
      const dbTipo = (auto.tipoCarroceria || "").toLowerCase();
      const dbMotor = (auto.combustible || "").toLowerCase();
      const dbOrigen = (auto.origenMarca || "").toLowerCase();
      const dbConce = (auto.concesionaria || "").toLowerCase();
      const dbPrecio = auto.precioUsd ?? 0;

      const mTipo = sTipo.length === 0 || sTipo.some(t => dbTipo.includes(t));
      const mMotor = sMotor.length === 0 || sMotor.some(m => dbMotor.includes(m));
      const mOrigen = sOrigen.length === 0 || sOrigen.some(o => dbOrigen.includes(o));
      const mConce = sConce.length === 0 || sConce.includes('todas') || sConce.some(c => dbConce === c);
      const mPrecioDuro = dbPrecio <= pMax;

      let tier = 99;
      if (mTipo && mMotor && mOrigen && mConce && mPrecioDuro) tier = 1;
      else if (mTipo && mMotor && mOrigen && mPrecioDuro) tier = 2;
      else if (mTipo && mMotor && mPrecioDuro) tier = 3;
      else if (mTipo && mPrecioDuro) tier = 4;
      else if (mTipo && mMotor && mOrigen) tier = 5; // Flexibilidad de precio

      return { ...auto, tier };
    });

    // 4. RANKING Y UNICIDAD
    const ranking = clasificados
      .filter(a => a.tier <= 5)
      .sort((a, b) => a.tier - b.tier || (a.precioUsd ?? 0) - (b.precioUsd ?? 0));

    const vistos = new Set();
    const finalTop: typeof ranking = [];
    for (const a of ranking) {
      if (!vistos.has(a.modelo) && finalTop.length < 10) {
        vistos.add(a.modelo);
        finalTop.push(a);
      }
    }

    // 5. IA: GENERACIÓN DE VEREDICTO
    let veredictos: string[] = [];
    if (finalTop.length > 0) {
      try {
        const prompt = `Actúa como consultor experto. Justifica estos autos para: ${attrs.join(', ')}.
        Escribe una frase de 15 palabras por auto. Una por línea. No nombres el modelo.
        Lista: ${finalTop.map(a => `${a.marca} ${a.modelo}: ${a.airbags} airbags, ${a.combustible}`).join('\n')}`;

        const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash:generateContent?key=${process.env.GOOGLE_GENERATIVE_AI_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        const aiData = await aiRes.json();
        const text = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
        veredictos = text.split('\n').filter((l: string) => l.trim().length > 10);
      } catch (e) {
        console.error("Fallo IA");
      }
    }

    // 6. RESPUESTA FINAL
    const top10 = await Promise.all(finalTop.map(async (auto, i) => {
      const vRaw = await db.query.catalogoMatriz.findMany({
        where: eq(catalogoMatriz.modelo, auto.modelo ?? ""),
        orderBy: [catalogoMatriz.precioUsd]
      });

      const tierMatch: Record<number, number> = { 1: 99, 2: 85, 3: 70, 4: 55, 5: 45 };
      const currentMatch = tierMatch[auto.tier] || 25;

      return {
        ...auto,
        match_percent: currentMatch,
        veredicto: veredictos[i]?.trim() || "Seleccionado por cumplimiento de criterios técnicos.",
        versiones: vRaw.map(v => ({ ...v, match_percent: currentMatch }))
      };
    }));

    return NextResponse.json({ success: true, top10 });

  } catch (error: any) {
    console.error("CRITICAL ERROR:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
