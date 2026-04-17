// src/pages/api/cron/sync-esim-expiry.ts
//
// Appelé chaque nuit par le cron Supabase pg_cron
// Pour chaque eSIM active sans expires_at, appelle Airalo
// GET /v2/sims/{iccid}/packages et stocke la date d'expiration

import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { getAiraloToken } from "@/lib/airalo";
import { resilientFetch } from "@/lib/apiResilience";

const AIRALO_API_URL = process.env.AIRALO_API_URL;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Sécuriser — seul le cron interne peut appeler
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const results = { updated: 0, skipped: 0, errors: 0 };

  try {
    // 1. Récupérer les eSIMs actives sans expires_at
    const { data: orders, error } = await supabase
      .from("airalo_orders")
      .select("id, sim_iccid, order_id")
      .not("sim_iccid", "is", null)
      .is("expires_at", null)
      .not("status", "in", '("expired","cancelled")')
      .limit(50); // traiter par batch de 50

    if (error) throw error;
    if (!orders || orders.length === 0) {
      return res.status(200).json({ success: true, message: "Rien à mettre à jour", ...results });
    }

    console.log(`[sync-esim-expiry] ${orders.length} eSIMs sans expires_at`);

    const token = await getAiraloToken();

    for (const order of orders) {
      try {
        const result = await resilientFetch<{
          data: Array<{
            status: string;
            activated_at: string | null;
            expired_at: string | null;
          }>;
        }>(
          `${AIRALO_API_URL}/sims/${order.sim_iccid}/packages`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          },
          { maxRetries: 2, initialDelayMs: 500, retryOn5xx: true, retryOnNetworkError: true }
        );

        if (!result.success || !result.data?.data) {
          console.warn(`[sync-esim-expiry] Pas de données pour ${order.sim_iccid}`);
          results.skipped++;
          continue;
        }

        const packages = result.data.data;

        // Trouver le package ACTIVE avec expires_at le plus lointain
        const activePackages = packages.filter((p) => p.expired_at);



        if (activePackages.length === 0) {
          if ((order as any).order_id) {
            try {
              const orderResult = await resilientFetch<{ data: { sims: Array<{ iccid: string; expired_at: string | null; activated_at: string | null }> } }>(
                `${AIRALO_API_URL}/orders/${(order as any).order_id}`,
                { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } },
                { maxRetries: 2, initialDelayMs: 500, retryOn5xx: true, retryOnNetworkError: true }
              );
              const sim = orderResult.data?.data?.sims?.find((s: any) => s.iccid === order.sim_iccid);
              if (sim?.expired_at) {
                await supabase.from("airalo_orders").update({ expires_at: sim.expired_at, activated_at: sim.activated_at }).eq("id", order.id);
                console.log(`[sync-esim-expiry] fallback OK ${order.sim_iccid} expires ${sim.expired_at}`);
                results.updated++;
                continue;
              }
            } catch(e) {}
          }
          console.log(`[sync-esim-expiry] Aucun package actif pour ${order.sim_iccid}`);
          results.skipped++;
          continue;
        }

        // Prendre la date d'expiration la plus lointaine (cas topup)
        const latestExpiry = activePackages.reduce((latest, pkg) => {
          return new Date(pkg.expired_at!) > new Date(latest.expired_at!)
            ? pkg
            : latest;
        });

        const { error: updateError } = await supabase
          .from("airalo_orders")
          .update({
            expires_at: latestExpiry.expired_at,
            activated_at: latestExpiry.activated_at,
          })
          .eq("id", order.id);

        if (updateError) {
          console.error(`[sync-esim-expiry] Erreur update ${order.sim_iccid}:`, updateError.message);
          results.errors++;
        } else {
          console.log(`[sync-esim-expiry] ✓ ${order.sim_iccid} → expires ${latestExpiry.expired_at}`);
          results.updated++;
        }

        // Pause 200ms entre chaque appel pour ne pas dépasser le rate limit Airalo
        await new Promise((r) => setTimeout(r, 200));

      } catch (err) {
        console.error(`[sync-esim-expiry] Erreur pour ${order.sim_iccid}:`, err);
        results.errors++;
      }
    }

    return res.status(200).json({ success: true, ...results });

  } catch (err: any) {
    console.error("[sync-esim-expiry] Erreur critique:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}