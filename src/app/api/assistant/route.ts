import { streamText, tool } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { systemPrompt } from './systemPrompt';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import { z } from 'zod';

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
      to: 'contact@fenuasim.com',
      replyTo: email,
      subject: `Nouveau Lead Chatbot : ${prenom}`,
      text: `Nouveau prospect :\n\nPrénom : ${prenom}\nTél : ${telephone}\nEmail : ${email}\nDemande : ${demande}\n\nHorodatage : ${new Date().toISOString()}`,
    }),
  ]);

  if (dbResult.status === 'rejected') console.error('❌ Supabase :', dbResult.reason);
  if (mailResult.status === 'rejected') console.error('❌ Email :', mailResult.reason);
  else console.log('✅ Lead sauvegardé et email envoyé');
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
      maxSteps: 3,
      tools: {
        getPackages: tool({
          description: 'Récupère les forfaits eSIM depuis Supabase pour une destination. Appelle OBLIGATOIREMENT cet outil avant de donner tout prix ou recommandation de forfait.',
          parameters: z.object({
            destination: z.string().describe('Slug de la destination en anglais (ex: japan, france, united-states, europe, discover-global)'),
            duration_days: z.number().optional().describe('Durée du voyage en jours (optionnel)'),
            prefers_unlimited: z.boolean().optional().describe('true si le client préfère illimité (défaut: true)'),
          }),
          execute: async ({ destination, duration_days, prefers_unlimited = true }) => {
            // Uniquement final_price_xpf et final_price_eur — jamais price_xpf ou price_eur
            const { data, error } = await supabase
              .from('airalo_packages')
              .select('name, slug, data_amount, data_unit, is_unlimited, final_price_xpf, final_price_eur, validity')
              .eq('status', 'active')
              .ilike('slug', `%${destination}%`)
              .order('is_unlimited', { ascending: false })
              .order('final_price_xpf', { ascending: true })
              .limit(10);

            if (error || !data || data.length === 0) {
              return { found: false, message: `Aucun forfait trouvé pour "${destination}". Essaie avec le nom en anglais.` };
            }

            // Filtrer par durée si fournie
            let filtered = data;
            if (duration_days) {
              const withDays = data.filter(p => {
                const match = p.validity?.match(/(\d+)/);
                if (!match) return true;
                return parseInt(match[1]) >= duration_days;
              });
              if (withDays.length > 0) filtered = withDays;
            }

            // Séparer illimité et data
            const unlimited = filtered.filter(p => p.is_unlimited);
            const dataPlans = filtered.filter(p => !p.is_unlimited);

            // 1 recommandation principale + 1 alternative max
            const results = [];

            if (prefers_unlimited && unlimited.length > 0) {
              results.push({
                ...unlimited[0],
                recommended: true,
                type: 'illimité',
              });
            }

            if (dataPlans.length > 0) {
              const bestData = duration_days
                ? dataPlans.find(p => {
                    const m = p.validity?.match(/(\d+)/);
                    return m && parseInt(m[1]) >= duration_days;
                  }) || dataPlans[0]
                : dataPlans[Math.floor(dataPlans.length / 2)];
              results.push({
                ...bestData,
                recommended: !prefers_unlimited,
                type: 'data',
              });
            }

            return {
              found: true,
              destination,
              packages: results.slice(0, 2),
              shop_url: `/shop/${destination}`,
            };
          },
        }),
      },
      onFinish: async ({ text }) => {
        await handleLeadDetection(text);
      },
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error('❌ Erreur API :', error);
    return new Response(
      JSON.stringify({ error: 'Erreur serveur' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
