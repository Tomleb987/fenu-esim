// src/pages/partner/login.tsx
// Login partenaire — utilise Supabase Auth existant
// Route : /partner/login

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { supabase } from "@/lib/supabaseClient";

export default function PartnerLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      const { data } = await supabase
        .from("partner_profiles")
        .select("is_active")
        .eq("email", session.user.email)
        .single();
      if (data?.is_active) router.push("/partner");
    });

    if (router.query.error === "unauthorized") {
      setError("Accès non autorisé. Ce compte n'est pas un partenaire actif.");
    }
  }, [router.isReady]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError || !data.user) {
      setError("Email ou mot de passe incorrect.");
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("partner_profiles")
      .select("is_active, advisor_name")
      .eq("email", data.user.email)
      .single();

    if (!profile || !profile.is_active) {
      await supabase.auth.signOut();
      setError("Ce compte n'est pas autorisé à accéder à l'espace partenaire.");
      setLoading(false);
      return;
    }

    router.push("/partner");
  };

  return (
    <>
      <Head>
        <title>Connexion Partenaire — FenuaSIM</title>
      </Head>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a4a6e] via-[#0e6899] to-[#00b8d4]">
        <div className="bg-white rounded-2xl shadow-2xl p-10 w-full max-w-md">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-gray-800">
              Fenua<span className="text-cyan-500">SIM</span>
            </h1>
            <p className="text-gray-400 text-sm mt-1">Espace partenaire</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Email</label>
              <input
                type="email" required
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder="partenaire@exemple.com"
                className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#0a4a6e] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Mot de passe</label>
              <input
                type="password" required
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#0a4a6e] transition-colors"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-xs px-3 py-2.5 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full bg-[#0a4a6e] text-white py-2.5 rounded-lg font-medium text-sm hover:bg-[#0e6899] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Connexion...</>
              ) : "Se connecter"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
