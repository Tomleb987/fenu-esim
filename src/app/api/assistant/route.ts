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


// Traduit la durée anglaise en français
function translateValidity(validity: string | null): string {
  if (!validity) return '';
  return validity
    .replace(/(\d+)\s*days?/i, '$1 jours')
    .replace(/(\d+)\s*months?/i, '$1 mois')
    .replace(/(\d+)\s*weeks?/i, '$1 semaines')
    .replace(/(\d+)\s*hours?/i, '$1 heures');
}

export const runtime = 'nodejs';

async function handleLeadDetection(completion: string) {
  const leadRegex = /\|\|LEAD\|(.*?)\|(.*?)\|(.*?)\|(.*?)\|\|/;
  const match = completion.match(leadRegex);
  if (!match) return;

  const [prenom, telephone, email, demande] = match.slice(1).map((s) => s.trim());
  if (!prenom || !email.includes('@')) return;

  console.log('🔥 LEAD DÉTECTÉ :', prenom);

  await Promise.allSettled([
    supabase.from('assistance').insert({ prenom, telephone, email, demande }),
    transporter.sendMail({
      from: '"Chatbot FenuaSIM" <contact@fenuasim.com>',
      to: 'contact@fenuasim.com',
      replyTo: email,
      subject: `Nouveau Lead Chatbot : ${prenom}`,
      text: `Nouveau prospect :\n\nPrénom : ${prenom}\nTél : ${telephone}\nEmail : ${email}\nDemande : ${demande}\n\nHorodatage : ${new Date().toISOString()}`,
    }),
  ]);
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

    const result = await streamText({
      model: anthropic('claude-haiku-4-5-20251001'),
      system: systemPrompt.content,
      messages: messages.slice(-20),
      maxSteps: 5,
      tools: {

        // ─── OUTIL 1 : Forfaits en temps réel ───────────────────────────
        getPackages: tool({
          description: 'Récupère les forfaits eSIM depuis Supabase. OBLIGATOIRE avant tout prix ou recommandation.',
          parameters: z.object({
            destination: z.string().describe('Slug destination en anglais (ex: japan, france, united-states, europe)'),
            duration_days: z.number().optional().describe('Durée du voyage en jours'),
            prefers_unlimited: z.boolean().optional().describe('true si client préfère illimité (défaut: true)'),
          }),
          execute: async ({ destination, duration_days, prefers_unlimited = true }) => {
            const { data, error } = await supabase
              .from('airalo_packages')
              .select('name, slug, data_amount, data_unit, is_unlimited, final_price_xpf, final_price_eur, validity')
              .eq('status', 'active')
              .ilike('slug', `%${destination}%`)
              .order('is_unlimited', { ascending: false })
              .order('final_price_xpf', { ascending: true })
              .limit(10);

            if (error || !data || data.length === 0) {
              return { found: false, message: `Aucun forfait trouvé pour "${destination}".` };
            }

            let filtered = data;
            if (duration_days) {
              const withDays = data.filter(p => {
                const m = p.validity?.match(/(\d+)/);
                return m ? parseInt(m[1]) >= duration_days : true;
              });
              if (withDays.length > 0) filtered = withDays;
            }

            const unlimited = filtered.filter(p => p.is_unlimited);
            const dataPlans = filtered.filter(p => !p.is_unlimited);
            const results = [];

            if (prefers_unlimited && unlimited.length > 0) {
              results.push({ ...unlimited[0], validity: translateValidity(unlimited[0].validity), type: 'illimité', recommended: true });
            }
            if (dataPlans.length > 0) {
              const best = duration_days
                ? dataPlans.find(p => { const m = p.validity?.match(/(\d+)/); return m && parseInt(m[1]) >= duration_days; }) || dataPlans[0]
                : dataPlans[Math.floor(dataPlans.length / 2)];
              results.push({ ...best, validity: translateValidity(best.validity), type: 'data', recommended: !prefers_unlimited });
            }

            return { found: true, destination, packages: results.slice(0, 2), shop_url: `/shop/${destination}` };
          },
        }),

        // ─── OUTIL 2 : Statut commande ───────────────────────────────────
        getOrderStatus: tool({
          description: 'Recherche une commande client. Utiliser si le client demande où est sa commande, son QR code ou son email.',
          parameters: z.object({
            email: z.string().optional().describe('Email du client'),
            order_reference: z.string().optional().describe('Numéro de commande'),
          }),
          execute: async ({ email, order_reference }) => {
            let query = supabase
              .from('orders')
              .select('id, status, package_name, created_at, airalo_order_id, email, prenom, nom')
              .order('created_at', { ascending: false })
              .limit(3);

            if (email) query = query.ilike('email', email);
            else if (order_reference) query = query.ilike('id::text', `%${order_reference}%`);
            else return { found: false, message: 'Email ou numéro de commande requis.' };

            const { data, error } = await query;

            if (error || !data || data.length === 0) {
              return { found: false, message: 'Aucune commande trouvée avec ces informations.' };
            }

            // Vérifier si QR code disponible dans airalo_orders
            const enriched = await Promise.all(data.map(async (order) => {
              if (!order.airalo_order_id) return { ...order, has_qr_code: false };
              const { data: airalo } = await supabase
                .from('airalo_orders')
                .select('status, activated_at, expires_at, qr_code_url')
                .eq('order_id', order.airalo_order_id)
                .single();
              return {
                ...order,
                has_qr_code: !!airalo?.qr_code_url,
                esim_status: airalo?.status,
                activated_at: airalo?.activated_at,
                expires_at: airalo?.expires_at,
              };
            }));

            return { found: true, orders: enriched };
          },
        }),

        // ─── OUTIL 3 : Vérification compatibilité ────────────────────────
        checkCompatibility: tool({
          description: 'Vérifie si un modèle de téléphone est compatible eSIM.',
          parameters: z.object({
            phone_model: z.string().describe('Modèle exact du téléphone (ex: iPhone 13 Pro, Samsung Galaxy S23)'),
          }),
          execute: async ({ phone_model }) => {
            const model = phone_model.toLowerCase();

            // iPhones compatibles
            const iphoneMatch = model.match(/iphone\s*(\d+)/);
            if (iphoneMatch) {
              const num = parseInt(iphoneMatch[1]);
              if (num >= 11) return { compatible: true, phone_model, message: `L'${phone_model} est compatible eSIM ✅` };
              if (num === 10) {
                if (model.includes('xs') || model.includes('xr')) return { compatible: true, phone_model, message: `L'${phone_model} est compatible eSIM ✅` };
                return { compatible: false, phone_model, message: `L'iPhone X n'est pas compatible eSIM.` };
              }
              return { compatible: false, phone_model, message: `L'${phone_model} n'est pas compatible eSIM.` };
            }

            // Samsung compatibles
            const samsungPatterns = ['s21', 's22', 's23', 's24', 's25', 'z fold', 'z flip', 'fold 3', 'fold 4', 'fold 5', 'fold 6', 'flip 3', 'flip 4', 'flip 5', 'flip 6'];
            if (model.includes('samsung') || model.includes('galaxy')) {
              const isCompatible = samsungPatterns.some(p => model.includes(p));
              if (isCompatible) return { compatible: true, phone_model, message: `Le ${phone_model} est compatible eSIM ✅` };
              return { compatible: null, phone_model, message: `Je ne suis pas certain pour ce modèle Samsung. Vérifie dans Réglages > Connexions > Gestionnaire de carte SIM.` };
            }

            // Google Pixel compatibles
            const pixelMatch = model.match(/pixel\s*(\d+)/);
            if (pixelMatch) {
              const num = parseInt(pixelMatch[1]);
              if (num >= 6) return { compatible: true, phone_model, message: `Le ${phone_model} est compatible eSIM ✅` };
              return { compatible: null, phone_model, message: `Le ${phone_model} pourrait ne pas être compatible. Teste avec *#06# — si EID apparaît = compatible.` };
            }

            // Cas inconnu
            return {
              compatible: null,
              phone_model,
              message: `Je n'ai pas d'info certaine pour ce modèle. Teste avec *#06# — si "EID" apparaît dans les infos = compatible eSIM ✅`,
            };
          },
        }),

        // ─── OUTIL 4 : Ticket d'escalade niveau 2 ────────────────────────
        createSupportTicket: tool({
          description: 'Crée un ticket d\'escalade niveau 2. Utiliser si : remboursement demandé, client frustré, problème non résolu après 2 échanges, client veut parler à un humain.',
          parameters: z.object({
            customer_email: z.string().optional().describe('Email du client si connu'),
            summary: z.string().describe('Résumé court du problème'),
            last_customer_message: z.string().describe('Dernier message du client'),
            ticket_type: z.enum(['support', 'refund', 'technical', 'commercial', 'other']).describe('Type de ticket'),
            priority: z.enum(['low', 'normal', 'high', 'urgent']).describe('Priorité'),
          }),
          execute: async ({ customer_email, summary, last_customer_message, ticket_type, priority }) => {
            const { data, error } = await supabase
              .from('support_tickets')
              .insert({
                user_email: customer_email || 'inconnu',
                subject: summary,
                message: last_customer_message,
                priority,
                status: 'open',
                ticket_type,
                escalation_level: 'N2',
                customer_channel: 'site',
              })
              .select('id')
              .single();

            if (error) {
              console.error('❌ Ticket Supabase :', error);
              return { success: false };
            }

            // Notifier l'équipe par email
            await transporter.sendMail({
              from: '"Chatbot FenuaSIM" <contact@fenuasim.com>',
              to: 'contact@fenuasim.com',
              subject: `[${priority.toUpperCase()}] Nouveau ticket support : ${summary}`,
              text: `Nouveau ticket d'escalade N2 :\n\nType : ${ticket_type}\nPriorité : ${priority}\nClient : ${customer_email || 'inconnu'}\n\nRésumé : ${summary}\n\nDernier message : ${last_customer_message}\n\nID ticket : ${data.id}`,
            }).catch(e => console.error('❌ Email ticket :', e));

            return { success: true, ticket_id: data.id };
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
