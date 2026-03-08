import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { systemPrompt } from './systemPrompt';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

// ─── CONFIG ────────────────────────────────────────────────────────────────

// ✅ SERVICE_ROLE_KEY sans préfixe NEXT_PUBLIC_ (jamais exposée côté client)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const transporter = nodemailer.createTransport({
  host: "smtp.office365.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export const runtime = 'nodejs';

// ─── DÉTECTION & TRAITEMENT DU LEAD ────────────────────────────────────────

async function handleLeadDetection(completion: string) {
  const leadRegex = /\|\|LEAD\|(.*?)\|(.*?)\|(.*?)\|(.*?)\|\|/;
  const match = completion.match(leadRegex);
  if (!match) return;

  const [prenom, telephone, email, demande] = match.slice(1).map((s) => s.trim());

  // Validation minimale
  if (!prenom || !email.includes('@')) {
    console.warn("⚠️ Lead mal formé, ignoré :", { prenom, email });
    return;
  }

  console.log("🔥 LEAD DÉTECTÉ :", prenom);

  // A. Supabase — exécution en parallèle avec l'email
  const [dbResult, mailResult] = await Promise.allSettled([
    supabase.from('assistance').insert({ prenom, telephone, email, demande }),
    transporter.sendMail({
      from: '"Chatbot FenuaSIM" <contact@fenuasim.com>',
      to: "sav@fenua-sim.odoo.com",
      replyTo: email,
      subject: `Nouveau Lead Chatbot : ${prenom}`,
      text: `
Nouveau prospect détecté par le chatbot IA :

👤 Prénom  : ${prenom}
📞 Tél.    : ${telephone}
📧 Email   : ${email}

📝 Demande :
${demande}

---
Horodatage : ${new Date().toISOString()}
      `.trim(),
    }),
  ]);

  if (dbResult.status === 'rejected')
    console.error("❌ Erreur Supabase :", dbResult.reason);
  else if (dbResult.value.error)
    console.error("❌ Erreur Supabase :", dbResult.value.error);
  else
    console.log("✅ Lead sauvegardé dans Supabase");

  if (mailResult.status === 'rejected')
    console.error("❌ Erreur email :", mailResult.reason);
  else
    console.log("✅ Email envoyé à Odoo");
}

// ─── ROUTE POST ────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    // Validation des messages entrants
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Messages invalides" }), { status: 400 });
    }

    // Limite anti-prompt stuffing (20 derniers messages)
    const safeMessages = messages.slice(-20);

    const result = await streamText({
      model: openai('gpt-4o-mini'), // ✅ Plus récent, moins cher, meilleur que gpt-3.5-turbo
      system: systemPrompt.content,
      messages: safeMessages,
      onFinish: async ({ text }) => {
        await handleLeadDetection(text);
      },
    });

    return result.toDataStreamResponse();

  } catch (error) {
    console.error("Erreur API :", error);
    return new Response(JSON.stringify({ error: "Erreur serveur" }), { status: 500 });
  }
}
