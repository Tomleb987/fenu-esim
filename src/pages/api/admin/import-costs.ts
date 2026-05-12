import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { csv, usd_rate } = req.body;
  if (!csv) return res.status(400).json({ error: "CSV manquant" });

  const rate = parseFloat(usd_rate) || 0.852;

  // Parser le CSV
  const lines = csv.split("\n").map((l: string) => l.trim()).filter(Boolean);
  if (lines.length < 2) return res.status(400).json({ error: "CSV vide" });

  // Détecter les colonnes
  const headers = lines[0].replace(/"/g, "").split(",").map((h: string) => h.trim());
  const pkgIdx  = headers.findIndex((h: string) => h.toLowerCase().includes("package") && h.toLowerCase().includes("id"));
  const costIdx = headers.findIndex((h: string) => h.toLowerCase().includes("net") && h.toLowerCase().includes("price"));

  if (pkgIdx === -1 || costIdx === -1) {
    return res.status(400).json({ error: `Colonnes introuvables. Headers: ${headers.join(", ")}` });
  }

  // Construire le mapping package_id → cost_eur
  const priceMap: Record<string, number> = {};
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].replace(/"/g, "").split(",");
    const pkgId = cols[pkgIdx]?.trim();
    const costUsd = parseFloat(cols[costIdx]);
    if (pkgId && !isNaN(costUsd)) {
      // Exclure les topup pour la table airalo_packages
      const cleanId = pkgId.replace(/-topup$/, "");
      priceMap[cleanId] = Math.round(costUsd * rate * 10000) / 10000;
    }
  }

  const packageIds = Object.keys(priceMap);
  if (packageIds.length === 0) return res.status(400).json({ error: "Aucun package trouvé dans le CSV" });

  // Mettre à jour orders.cost_airalo pour les commandes sans coût
  let updated = 0;
  let notFound = 0;
  const notFoundIds: string[] = [];

  // Mise à jour en batch via CASE WHEN
  const caseStatement = packageIds
    .map(id => `WHEN package_id = '${id}' THEN ${priceMap[id]}`)
    .join("\n");

  const { data, error } = await supabase.rpc("update_cost_airalo_batch", {
    case_sql: caseStatement,
    pkg_ids: packageIds,
  }).single();

  // Fallback si la fonction RPC n'existe pas : update individuel
  if (error) {
    console.log("RPC non disponible, update individuel...");
    for (const [pkgId, costEur] of Object.entries(priceMap)) {
      const { count, error: upErr } = await supabase
        .from("orders")
        .update({ cost_airalo: costEur })
        .eq("package_id", pkgId)
        .is("cost_airalo", null)
        .in("status", ["completed", "paid"]);

      if (upErr) {
        notFoundIds.push(pkgId);
        notFound++;
      } else {
        updated += count ?? 0;
      }
    }
  } else {
    updated = (data as any)?.updated ?? 0;
  }

  return res.status(200).json({
    updated,
    notFound,
    notFoundIds: notFoundIds.slice(0, 20),
    totalPackages: packageIds.length,
    rate,
  });
}