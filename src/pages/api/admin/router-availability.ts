// ============================================================
// FENUA SIM – API : Disponibilité des routeurs
// src/pages/api/admin/router-availability.ts
//
// POST { start: "2026-04-01", end: "2026-04-10", routerId?: string }
// Retourne les routeurs disponibles sur la période
// ============================================================

import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { start, end, routerId } = req.body as {
    start: string;
    end: string;
    routerId?: string;
  };

  if (!start || !end) return res.status(400).json({ error: "start et end requis" });

  // Récupérer tous les routeurs (ou un seul si routerId fourni)
  const routersQuery = supabase.from("routers").select("id, model, serial_number, rental_price_per_day, deposit_amount, status");
  if (routerId) routersQuery.eq("id", routerId);
  const { data: routers, error: routersErr } = await routersQuery;
  if (routersErr) return res.status(500).json({ error: routersErr.message });

  // Récupérer toutes les locations qui chevauchent la période demandée
  // Chevauchement si : rental_start < end ET rental_end > start
  const { data: conflicts, error: conflictsErr } = await supabase
    .from("router_rentals")
    .select("router_id, rental_start, rental_end, customer_name, customer_email, status")
    .lt("rental_start", end)
    .gt("rental_end", start)
    .in("status", ["active", "upcoming"]);

  if (conflictsErr) return res.status(500).json({ error: conflictsErr.message });

  const conflictMap: Record<string, { rental_start: string; rental_end: string; customer_name: string }[]> = {};
  (conflicts ?? []).forEach((c: any) => {
    if (!conflictMap[c.router_id]) conflictMap[c.router_id] = [];
    conflictMap[c.router_id].push({
      rental_start: c.rental_start,
      rental_end: c.rental_end,
      customer_name: c.customer_name || c.customer_email || "Client",
    });
  });

  // Pour chaque routeur non disponible, trouver la prochaine date libre
  const getNextAvailable = async (rid: string): Promise<string | null> => {
    const { data: upcoming } = await supabase
      .from("router_rentals")
      .select("rental_end")
      .eq("router_id", rid)
      .in("status", ["active", "upcoming"])
      .gte("rental_end", new Date().toISOString().slice(0, 10))
      .order("rental_end", { ascending: false })
      .limit(1);
    return upcoming?.[0]?.rental_end ?? null;
  };

  const result = await Promise.all(
    (routers ?? []).map(async (r: any) => {
      const routerConflicts = conflictMap[r.id] ?? [];
      const available = routerConflicts.length === 0;
      let nextAvailable: string | null = null;
      if (!available) {
        nextAvailable = await getNextAvailable(r.id);
      }
      return {
        ...r,
        available,
        conflicts: routerConflicts,
        next_available: nextAvailable,
      };
    })
  );

  return res.status(200).json({
    routers: result,
    available: result.filter(r => r.available),
    unavailable: result.filter(r => !r.available),
  });
}
