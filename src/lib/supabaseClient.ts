/**
 * Browser Supabase client (anon key). Re-exports from @/lib/supabase
 * so the app uses a single GoTrueClient instance and avoids
 * "Multiple GoTrueClient instances detected" / auth race conditions.
 * For server-side use with service role, import supabaseAdmin from @/lib/supabaseAdmin.
 */
import { supabase } from "@/lib/supabase";

export const testSupabaseConnection = async () => {
  try {
    const { count, error } = await supabase
      .from("orders")
      .select("*", { count: "exact", head: true });
    return { success: !error, count: count ?? 0, error };
  } catch (e) {
    console.error("Supabase connection test failed:", e);
    return { success: false, error: e };
  }
};

export { supabase };
