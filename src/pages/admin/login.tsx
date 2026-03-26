import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!isMounted) return;

      if (session) {
        router.replace("/admin");
      } else {
        setCheckingSession(false);
      }
    };

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;

      if (session) {
        router.replace("/admin");
      } else {
        setCheckingSession(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setError(error.message || "Connexion impossible.");
      setLoading(false);
      return;
    }

    router.replace("/admin");
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
        <div className="text-sm text-gray-600">Vérification de la session…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-md bg-white rounded-2xl shadow p-6 space-y-4"
      >
        <h1 className="text-2xl font-bold">Connexion admin</h1>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border px-3 py-2"
            autoComplete="email"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Mot de passe</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border px-3 py-2"
            autoComplete="current-password"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-black text-white py-2.5 font-medium disabled:opacity-60"
        >
          {loading ? "Connexion..." : "Se connecter"}
        </button>
      </form>
    </div>
  );
}
