import type { NextApiRequest, NextApiResponse } from "next";
import { streamText, tool } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import { z } from "zod";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.BREVO_SMTP_USER,
    pass: process.env.BREVO_SMTP_PASS,
  },
});

function translateValidity(validity: string | null): string {
  if (!validity) return "";
  return validity
    .replace(/(\d+)\s*days?/i, "$1 jours")
    .replace(/(\d+)\s*months?/i, "$1 mois")
    .replace(/(\d+)\s*weeks?/i, "$1 semaines")
    .replace(/(\d+)\s*hours?/i, "$1 heures");
}

async function handleLeadDetection(completion: string) {
  const leadRegex = /\|\|LEAD\|(.*?)\|(.*?)\|(.*?)\|(.*?)\|\|/;
  const match = completion.match(leadRegex);
  if (!match) return;
  const [prenom, telephone, email, demande] = match.slice(1).map((s) => s.trim());
  if (!prenom || !email.includes("@")) return;
  await Promise.allSettled([
    supabase.from("assistance").insert({ prenom, telephone, email, demande }),
    transporter.sendMail({
      from: '"Chatbot FenuaSIM" <contact@fenuasim.com>',
      to: "contact@fenuasim.com",
      replyTo: email,
      subject: `Nouveau Lead Chatbot : ${prenom}`,
      text: `Nouveau prospect :\n\nPrénom : ${prenom}\nTél : ${telephone}\nEmail : ${email}\nDemande : ${demande}`,
    }),
  ]);
}

export const config = { api: { bodyParser: true } };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { messages } = req.body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "Messages invalides" });
  }

  const { systemPrompt } = await import("../../lib/systemPrompt");

  const result = streamText({
    model: anthropic("claude-haiku-4-5-20251001"),
    system: systemPrompt.content,
    messages: messages.slice(-20),
    maxSteps: 5,
    tools: {
      getPackages: tool({
        description: "Récupère les forfaits eSIM depuis Supabase.",
        parameters: z.object({
          destination: z.string(),
          duration_days: z.number().optional(),
          prefers_unlimited: z.boolean().optional(),
        }),
        execute: async ({ destination, duration_days, prefers_unlimited = true }) => {
          const { data, error } = await supabase
            .from("airalo_packages")
            .select("name, slug, data_amount, data_unit, is_unlimited, final_price_xpf, final_price_eur, validity")
            .eq("status", "active")
            .ilike("slug", `%${destination}%`)
            .order("is_unlimited", { ascending: false })
            .order("final_price_xpf", { ascending: true })
            .limit(15);
          if (error || !data || data.length === 0) {
            return { found: false, message: `Aucun forfait trouvé pour "${destination}".` };
          }
          const unlimited = data.filter((p) => p.is_unlimited);
          const dataPlans = data.filter((p) => !p.is_unlimited);
          const results = [];
          if (prefers_unlimited && unlimited.length > 0) {
            const bestUnlimited = duration_days
              ? unlimited.find((p) => { const m = p.validity?.match(/(\d+)/); return m && parseInt(m[1]) >= duration_days; }) || unlimited[unlimited.length - 1]
              : unlimited[0];
            results.push({ ...bestUnlimited, validity: translateValidity(bestUnlimited.validity), type: "illimité", recommended: true });
          }
          if (dataPlans.length > 0) {
            const suitablePlans = duration_days
              ? dataPlans.filter((p) => { const m = p.validity?.match(/(\d+)/); return m && parseInt(m[1]) >= duration_days; })
              : dataPlans;
            const pool = suitablePlans.length > 0 ? suitablePlans : dataPlans;
            const bestData = pool[Math.floor(pool.length * 0.6)] || pool[pool.length - 1];
            results.push({ ...bestData, validity: translateValidity(bestData.validity), type: "data", recommended: !prefers_unlimited || unlimited.length === 0 });
          }
          return { found: true, destination, packages: results.slice(0, 2), shop_url: `/shop/${destination}` };
        },
      }),
      getOrderStatus: tool({
        description: "Recherche une commande client par email ou référence.",
        parameters: z.object({
          email: z.string().optional(),
          order_reference: z.string().optional(),
        }),
        execute: async ({ email, order_reference }) => {
          let query = supabase
            .from("orders")
            .select("id, status, package_name, created_at, airalo_order_id, email")
            .order("created_at", { ascending: false })
            .limit(3);
          if (email) query = query.ilike("email", email);
          else if (order_reference) query = query.ilike("id::text", `%${order_reference}%`);
          else return { found: false, message: "Email ou numéro de commande requis." };
          const { data, error } = await query;
          if (error || !data || data.length === 0) return { found: false, message: "Aucune commande trouvée." };
          return { found: true, orders: data };
        },
      }),
      checkCompatibility: tool({
        description: "Vérifie si un modèle de téléphone est compatible eSIM.",
        parameters: z.object({ phone_model: z.string() }),
        execute: async ({ phone_model }) => ({
          phone_model,
          message: `Je pense que le ${phone_model} est compatible eSIM, mais pour en être sûr : compose *#06# → si tu vois "EID" = compatible ✅`,
        }),
      }),
      createSupportTicket: tool({
        description: "Crée un ticket d'escalade niveau 2.",
        parameters: z.object({
          customer_email: z.string().optional(),
          summary: z.string(),
          last_customer_message: z.string(),
          ticket_type: z.enum(["support", "refund", "technical", "commercial", "other"]),
          priority: z.enum(["low", "normal", "high", "urgent"]),
        }),
        execute: async ({ customer_email, summary, last_customer_message, ticket_type, priority }) => {
          const { data, error } = await supabase
            .from("support_tickets")
            .insert({ user_email: customer_email || "inconnu", subject: summary, message: last_customer_message, priority, status: "open", ticket_type, escalation_level: "N2", customer_channel: "site" })
            .select("id")
            .single();
          if (error) return { success: false };
          await transporter.sendMail({
            from: '"Chatbot FenuaSIM" <contact@fenuasim.com>',
            to: "contact@fenuasim.com",
            subject: `[${priority.toUpperCase()}] Ticket : ${summary}`,
            text: `Type : ${ticket_type}\nClient : ${customer_email}\nRésumé : ${summary}\nMessage : ${last_customer_message}\nID : ${data.id}`,
          }).catch(console.error);
          return { success: true, ticket_id: data.id };
        },
      }),
    },
    onFinish: async ({ text }) => { await handleLeadDetection(text); },
  });

  result.pipeDataStreamToResponse(res);
}