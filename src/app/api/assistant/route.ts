import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { systemPrompt } from './systemPrompt';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.BREVO_SMTP_USER,
    pass: process.env.BREVO_SMTP_PASS,
  },
});

export const runtime = 'nodejs';

async function handleLeadDetection(completion: string) {
  const leadRegex = /\|\|LEAD\|(.*?)\|(.*?)\|(.*?)\|(.*?)\|\|/;
  const match = completion.match(leadRegex);
  if (!match) return;

  const [prenom, telephone, email, demande] = match.slice(1).map((s) => s.trim());

  if (!prenom || !email.includes('@')) {
    console.warn('⚠️ Lead mal formé, ignoré :', { prenom, email });
    return;
  }

  console.log('🔥 LEAD DÉTECTÉ :', prenom);

  const [dbResult, mailResult] = await Promise.allSettled([
    supabase.from('assistance').insert({ prenom, telephone, email, demande }),
    transporter.sendMail({
      from: '"Chatbot FenuaSIM" <contact@fenuasim.com>',
      to: 'sav@fenua-sim.odoo.com',
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

  if (dbResult.status === 'rejected') {
    console.error('❌ Erreur Supabase :', dbResult.reason);
  } else if ((dbResult.value as { error: unknown }).error) {
    console.error('❌ Erreur Supabase :', (dbResult.value as { error: unknown }).error);
  } else {
    console.log('✅ Lead sauvegardé dans Supabase');
  }

  if (mailResult.status === 'rejected') {
    console.error('❌ Erreur email :', mailResult.reason);
  } else {
    console.log('✅ Email envoyé à Odoo');
  }
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Messages invalides' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const safeMessages = messages.slice(-20);

    const result = await streamText({
      model: anthropic('claude-haiku-4-5-20251001'),
      system: systemPrompt.content,
      messages: safeMessages,
      onFinish: async ({ text }) => {
        await handleLeadDetection(text);
      },
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error('Erreur API :', error);
    return new Response(
      JSON.stringify({ error: 'Erreur serveur' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
