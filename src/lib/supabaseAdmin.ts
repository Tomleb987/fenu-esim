import { createClient } from '@supabase/supabase-js'

// On utilise vos variables d'environnement existantes
// Assurez-vous que SUPABASE_SERVICE_ROLE_KEY est bien dans votre .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY! 

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
