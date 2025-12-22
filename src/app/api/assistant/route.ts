import { OpenAI } from 'openai';
import { OpenAIStream, StreamingTextResponse } from 'ai';
import { systemPrompt } from './systemPrompt';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

// 1. Config OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 2. Config Supabase (Admin pour pouvoir écrire)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! // Ou SERVICE_ROLE_KEY si besoin de droits élevés
);

// 3. Config Email (SMTP)
// Utilisez les identifiants de votre adresse contact@fenuasim.com ou une adresse Gmail
const transporter = nodemailer.createTransport({
  host: "smtp.office365.com", // Ou smtp.gmail.com
  port: 587,
  secure: false, // true pour 465, false pour les autres
  auth: {
    user: process.env.SMTP_USER, // Votre email (ex: contact@fenuasim.com)
    pass: process.env.SMTP_PASSWORD, // Votre mot de passe d'application
  },
});

export const runtime = 'nodejs'; // Important : on passe en Node.js pour Nodemailer (pas 'edge')

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      stream: true,
      messages: [
        systemPrompt, 
        ...messages
      ],
    });

    const stream = OpenAIStream(response as any, {
      onCompletion: async (completion) => {
        // --- DÉTECTION DU LEAD ---
        const leadRegex = /\|\|LEAD\|(.*?)\|(.*?)\|(.*?)\|(.*?)\|\|/;
        const match = completion.match(leadRegex);

        if (match) {
          const [_, prenom, telephone, email, demande] = match;
          console.log("🔥 LEAD DÉTECTÉ :", prenom);

          // A. SAUVEGARDE DANS SUPABASE (Sécurité)
          const { error: dbError } = await supabase
            .from('assistance')
            .insert({
              prenom,
              telephone,
              email,
              demande
            });
          
          if (dbError) console.error("Erreur Supabase:", dbError);

          // B. ENVOI DU MAIL VERS ODOO (Action)
          // C'est ça qui crée le ticket dans Odoo
          try {
            await transporter.sendMail({
              from: '"Chatbot FenuaSIM" <contact@fenuasim.com>', // Votre adresse d'envoi
              to: "sav@fenua-sim.odoo.com", // L'adresse alias Odoo
              replyTo: email, // IMPORTANT : Pour répondre directement au client depuis Odoo
              subject: `Nouveau Lead Chatbot : ${prenom}`,
              text: `
                Nouveau prospect détecté par l'IA :
                
                👤 Nom : ${prenom}
                📞 Téléphone : ${telephone}
                📧 Email : ${email}
                
                📝 Demande :
                ${demande}
                
                (Sauvegardé dans Supabase ID: ${new Date().toISOString()})
              `,
            });
            console.log("✅ Email envoyé à Odoo");
          } catch (mailError) {
            console.error("❌ Erreur envoi mail:", mailError);
          }
        }
      }
    });
    
    return new StreamingTextResponse(stream);
    
  } catch (error) {
    console.error("Erreur API:", error);
    return new Response(JSON.stringify({ error: "Erreur serveur" }), { status: 500 });
  }
}
