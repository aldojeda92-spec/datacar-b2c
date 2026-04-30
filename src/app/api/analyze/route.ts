import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { catalogoMatriz, leads } from '@/lib/schema';
import { eq, and, gte, lte } from 'drizzle-orm';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { leadId } = await req.json();
    const leadData = await db.query.leads.findFirst({ where: eq(leads.id, leadId) });
    
    if (!leadData) return NextResponse.json({ error: "Lead no encontrado" }, { status: 404 });

    const ensureArray = (val: any): string[] => {
      if (!val) return [];
      if (Array.isArray(val)) return val.map(v => String(v).toLowerCase().trim());
      if (typeof val === 'string' && val.trim() !== '') return [val.toLowerCase().trim()];
      return [];
    };

    const attrs = ensureArray(leadData.atributos);
    const sMotor = ensureArray(leadData.motorizacion);
    const sTipo = ensureArray(leadData.tipoVehiculo);
    const sOrigen = ensureArray(leadData.origen);
    const sConce = ensureArray(leadData.concesionariaPreferencia);

    const mappingOrigen: Record<string, string> = {
      'solo chinos': 'china', 'solo japoneses': 'japón',
      'solo coreanos': 'corea', 'solo europeos': 'europa',
    };
    const origenesTarget = sOrigen.map(o => mappingOrigen[o] || o);

    const precioMaxReal = leadData.presupuestoMax ?? 0;
    const precioMaxConBuffer = precioMaxReal * 1.15;

    const universo = await db.select().from(catalogoMatriz).where(and(
      gte(catalogoMatriz.precioUsd, leadData.presupuestoMin ?? 0),
      lte(catalogoMatriz.precioUsd, precioMaxConBuffer)
    ));

    const autosClasificados = universo.map(auto => {
      const cTipo = (auto.tipoCarroceria || "").toLowerCase();
      const cMotor = (auto.combustible || "").toLowerCase();
      const cOrigen = (auto.origenMarca || "").toLowerCase();
      const cConce = (auto.concesionaria || "").toLowerCase();
      const cPrecio = auto.precioUsd ?? 0;

      const matchesTipo = sTipo.length === 0 || sTipo.some(t => cTipo.includes(t));
      const matchesMotor = sMotor.length === 0 || sMotor.some(m => cMotor.includes(m));
      const matchesOrigen = origenesTarget.length === 0 || origenesTarget.some(o => cOrigen.includes(o));
      const matchesConce = sConce.length === 0 || sConce.includes('todas') || sConce.some(c => cConce.includes(c));
      const matchesPrecioDuro = cPrecio <= precioMaxReal;

      let tier = 99;
      if (matchesTipo && matchesMotor && matchesOrigen && matchesConce && matchesPrecioDuro) tier = 1;
      else if (matchesTipo && matchesMotor && matchesOrigen && matchesPrecioDuro) tier = 2;
      else if (matchesTipo && matchesMotor && matchesPrecioDuro) tier = 3;
      else if (matchesTipo && matchesPrecioDuro) tier = 4;
      else if (matchesTipo) tier = 5;

      return { ...auto, tier };
    });

    const ranking = autosClasificados
      .filter(a => a.tier <= 5)
      .sort((a, b) => {
        if (a.tier !== b.tier) return a.tier - b.tier;
        return (a.precioUsd ?? 0) - (b.precioUsd ?? 0);
      });

    const vistos = new Set();
    const finalTop: typeof ranking = [];
    for (const auto of ranking) {
      if (!vistos.has(auto.modelo) && finalTop.length < 10) {
        vistos.add(auto.modelo);
        finalTop.push(auto);
      }
    }

    let veredictosIA: string[] = [];
    if (finalTop.length > 0) {
      try {
        const prompt = `Actúa como consultor experto. Justifica estos autos para prioridades: ${attrs.join(', ')}.
        Devuelve solo 10 frases de 15 palabras, una por línea.
        ${finalTop.map(a => `${a.marca} ${a.modelo}: ${a.airbags} airbags, ${a.combustible}, baulera ${a.bauleraLitros}L`).join('\n')}`;

        const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash:generateContent?key=${process.env.GOOGLE_GENERATIVE_AI_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        const aiData = await aiRes.json();
        const rawText = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
        veredictosIA = rawText.split('\n').filter((line: string) => line.trim().length > 10);
      } catch (e) {
        console.error("IA Error:", e);
      }
    }

    const top10 = await Promise.all(finalTop.map(async (auto, index) => {
      const vRaw = await db.query.catalogoMatriz.findMany({
        where: eq(catalogoMatriz.modelo, auto.modelo ?? ""),
        orderBy: [catalogoMatriz.precioUsd]
      });

      const tierMatch: Record<number, number> = { 1: 99, 2: 88, 3: 75, 4: 60, 5: 45 };
      const baseMatch = tierMatch[auto.tier] || 30;

      return {
        ...auto,
        match_percent: baseMatch,
        veredicto: veredictosIA[index]?.trim() || "Opción seleccionada por robustez técnica.",
        versiones: vRaw.map(v => ({ ...v, match_percent: baseMatch }))
      };
    }));

    return NextResponse.json({ success: true, top10 });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
