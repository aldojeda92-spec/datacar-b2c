import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { catalogoMatriz, leads } from '@/lib/schema';
import { eq, and, gte, lte } from 'drizzle-orm';

export const maxDuration = 60;

export async function POST(req: Request) {
  const start = Date.now();
  console.log(">>> [AUDIT] Iniciando /api/analyze");

  try {
    const { leadId } = await req.json();
    const leadData = await db.query.leads.findFirst({ where: eq(leads.id, leadId) });
    
    if (!leadData) {
      return NextResponse.json({ error: "Lead no encontrado" }, { status: 404 });
    }

    const ensureArray = (val: any): string[] => {
      if (!val) return [];
      if (Array.isArray(val)) return val.map(v => String(v).toLowerCase().trim());
      if (typeof val === 'string' && val.trim() !== '') return [val.toLowerCase().trim()];
      return [];
    };

    // Parámetros de búsqueda
    const attrs = ensureArray(leadData.atributos);
    const sMotor = ensureArray(leadData.motorizacion);
    const sTipo = ensureArray(leadData.tipoVehiculo);
    const sOrigen = ensureArray(leadData.origen);
    const sConce = ensureArray(leadData.concesionariaPreferencia);
    const pMin = leadData.presupuestoMin ?? 0;
    const pMax = leadData.presupuestoMax ?? 999999;

    // 1. CARGA DE CANDIDATOS (Buffer de precio del 30% para evitar listas vacías)
    const universo = await db.select().from(catalogoMatriz).where(and(
      gte(catalogoMatriz.precioUsd, pMin),
      lte(catalogoMatriz.precioUsd, pMax * 1.30)
    ));

    if (universo.length === 0) {
      return NextResponse.json({ success: true, top10: [] });
    }

    // 2. LÓGICA DE TIERS (Dureza Progresiva)
    const mappingOrigen: Record<string, string> = {
      'solo chinos': 'china', 'solo japoneses': 'japón',
      'solo coreanos': 'corea', 'solo europeos': 'europa',
    };
    const targetOrigenes = sOrigen.map(o => mappingOrigen[o] || o);

    const clasificados = universo.map(auto => {
      const cTipo = (auto.tipoCarroceria || "").toLowerCase();
      const cMotor = (auto.combustible || "").toLowerCase();
      const cOrigen = (auto.origenMarca || "").toLowerCase();
      const cConce = (auto.concesionaria || "").toLowerCase();
      const cPrecio = auto.precioUsd ?? 0;

      const mTipo = sTipo.length === 0 || sTipo.some(t => cTipo.includes(t));
      const mMotor = sMotor.length === 0 || sMotor.some(m => cMotor.includes(m));
      const mOrigen = targetOrigenes.length === 0 || targetOrigenes.some(o => cOrigen.includes(o));
      const mConce = sConce.length === 0 || sConce.includes('todas') || sConce.some(c => cConce.includes(c));
      const mPrecio = cPrecio <= pMax;

      let tier = 99;
      if (mTipo && mMotor && mOrigen && mConce && mPrecio) tier = 1;
      else if (mTipo && mMotor && mOrigen && mPrecio) tier = 2;
      else if (mTipo && mMotor && mPrecio) tier = 3;
      else if (mTipo && mPrecio) tier = 4;
      else if (mTipo) tier = 5; 
      else tier = 6;

      return { ...auto, tier };
    });

    // 3. RANKING Y UNICIDAD
    const sorted = clasificados.sort((a, b) => a.tier - b.tier || (a.precioUsd ?? 0) - (b.precioUsd ?? 0));
    const vistos = new Set();
    const finalTop: typeof sorted = [];
    
    for (const v of sorted) {
      if (!vistos.has(v.modelo) && finalTop.length < 10) {
        vistos.add(v.modelo);
        finalTop.push(v);
      }
    }

    // CORRECCIÓN DE ERROR DE COMPILACIÓN: Uso Array.from en lugar de spread en Set
    const tiersEncontrados = Array.from(new Set(finalTop.map(a => a.tier)));
    console.log(`>>> [AUDIT] Top 10 finalizado. Tiers presentes: ${tiersEncontrados.join(', ')}`);

    // 4. IA (Justificación por atributos del Lead)
    let veredictos: string[] = [];
    if (finalTop.length > 0) {
      try {
        const prompt = `Actúa como consultor experto. Justifica estos 10 autos para alguien que prioriza: ${attrs.join(', ')}. Escribe una frase de 15 palabras por cada auto, una por línea.
        ${finalTop.map(a => `${a.marca} ${a.modelo}: ${a.airbags} airbags, ${a.combustible}`).join('\n')}`;

        const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash:generateContent?key=${process.env.GOOGLE_GENERATIVE_AI_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        const aiData = await aiRes.json();
        const text = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
        veredictos = text.split('\n').filter((l: string) => l.trim().length > 5);
      } catch (e) {
        console.warn(">>> [WARN] IA falló. Usando fallback.");
      }
    }

    // 5. MAPEO FINAL
    const top10 = await Promise.all(finalTop.map(async (auto, i) => {
      const vRaw = await db.query.catalogoMatriz.findMany({
        where: eq(catalogoMatriz.modelo, auto.modelo ?? ""),
        orderBy: [catalogoMatriz.precioUsd]
      });

      const tierMatch: Record<number, number> = { 1: 99, 2: 88, 3: 75, 4: 60, 5: 45, 6: 30 };
      const currentMatch = tierMatch[auto.tier] || 25;

      return {
        ...auto,
        match_percent: currentMatch,
        veredicto: veredictos[i]?.trim() || "Excelente equilibrio técnico basado en tu presupuesto.",
        versiones: vRaw.map(v => ({ ...v, match_percent: currentMatch }))
      };
    }));

    console.log(`>>> [AUDIT] Proceso completado en ${Date.now() - start}ms`);
    return NextResponse.json({ success: true, top10 });

  } catch (error: any) {
    console.error(">>> [FATAL ERROR]:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
