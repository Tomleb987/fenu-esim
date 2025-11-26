// app/api/ava/quote/route.ts
import { NextRequest, NextResponse } from "next/server";
import { demandeTarifComplexe, AvaTarifInput } from "@/lib/ava";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as AvaTarifInput;

    // Ici tu peux mettre des contrôles / normalisations de données
    const quote = await demandeTarifComplexe(body);

    return NextResponse.json({ ok: true, quote });
  } catch (err: any) {
    console.error("Erreur /api/ava/quote:", err);
    return NextResponse.json(
      { ok: false, error: err.message ?? "Erreur serveur" },
      { status: 500 }
    );
  }
}
