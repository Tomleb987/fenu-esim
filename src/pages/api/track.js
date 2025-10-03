import { createClient } from '@supabase/supabase-js';

// ⚠️ Utiliser uniquement côté serveur (jamais exposer la clé service_role au client)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { ref, code } = req.query;

    if (!ref || !code) {
      return res.status(400).json({ error: 'Missing ref or code' });
    }

    // Récupération IP (nettoyée si plusieurs IPs)
    const rawIp =
      req.headers['x-forwarded-for'] ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      '';
    const ip = Array.isArray(rawIp) ? rawIp[0] : String(rawIp).split(',')[0].trim();

    const userAgent = req.headers['user-agent'] || '';

    // Enregistrement du clic
    const { error } = await supabase.from('link_clicks').insert([
      {
        ref,
        code,
        ip_address: ip,
        user_agent: userAgent
      }
    ]);

    if (error) {
      console.error('Erreur Supabase:', error);
      return res.status(500).json({ error: 'Database insert failed' });
    }

    // ✅ Redirection vers la bonne page shop
    return res.redirect(302, `https://www.fenuasim.com/shop?code=${encodeURIComponent(code)}`);
  } catch (err) {
    console.error('Erreur handler:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
