import { createClient } from '@supabase/supabase-js';

// Initialise Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Attention : utilise bien la clé 'service_role' ici
);

export default async function handler(req, res) {
  const { ref, code } = req.query;

  // Récupération IP + User Agent
  const ip =
    req.headers['x-forwarded-for'] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    '';
  const userAgent = req.headers['user-agent'] || '';

  // Enregistrement du clic dans Supabase
  await supabase.from('link_clicks').insert([
    {
      ref,
      code,
      ip_address: ip,
      user_agent: userAgent
    }
  ]);

  // Redirection vers la page d’achat
  return res.redirect(302, `https://fenuasim.com/acheter?code=${code}`);
}
