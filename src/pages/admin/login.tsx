// src/pages/admin/login.tsx
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";

const ADMIN_EMAIL = "admin@fenuasim.com";

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    if (!router.isReady) return;
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user?.email === ADMIN_EMAIL) router.push("/admin/assurance");
    });
  }, [router.isReady]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (authError || !data.user) { setError("Email ou mot de passe incorrect."); return; }
      if (data.user.email !== ADMIN_EMAIL) {
        await supabase.auth.signOut();
        setError("Ce compte n'a pas acces a l'espace admin.");
        return;
      }
      await router.push("/admin/assurance");
    } catch (err) {
      setError("Une erreur inattendue est survenue.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Admin - FENUA SIM</title>
        <meta name="robots" content="noindex" />
        <style>{`
          @keyframes spin { to { transform: rotate(360deg) } }
          @keyframes fadein { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }
          .ani { animation: fadein .4s ease; }
          input:focus { outline: none; border-color: #A020F0 !important; box-shadow: 0 0 0 3px rgba(160,32,240,0.1); }
        `}</style>
      </Head>

      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8f7ff", fontFamily: "Arial, Helvetica, sans-serif", padding: 24 }}>
        <div className="ani" style={{ width: "100%", maxWidth: 400 }}>

          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <Image src="/logo.png" alt="FENUA SIM" width={72} height={72} style={{ objectFit: "contain", display: "block", margin: "0 auto 12px" }} />
            <div style={{ fontSize: 20, fontWeight: 800 }}>
              <span style={{ background: "linear-gradient(135deg, #A020F0, #FF4D6D)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>FENUA</span>
              <span style={{ color: "#D1D5DB", margin: "0 3px" }}>•</span>
              <span style={{ background: "linear-gradient(135deg, #FF4D6D, #FF7F11)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>SIM</span>
            </div>
            <p style={{ color: "#9CA3AF", fontSize: 12, marginTop: 4, textTransform: "uppercase", letterSpacing: "1px" }}>Espace Admin</p>
          </div>

          <div style={{ background: "#fff", borderRadius: 20, padding: "32px 28px", boxShadow: "0 8px 40px rgba(160,32,240,0.08)", border: "1px solid #F0E8FF" }}>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: "#1a0533", margin: "0 0 4px" }}>Connexion</h1>
            <p style={{ color: "#9CA3AF", fontSize: 13, margin: "0 0 24px" }}>Acces administrateur uniquement</p>

            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#6B7280", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.5px" }}>Email</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@fenuasim.com"
                  style={{ width: "100%", padding: "11px 14px", border: "1.5px solid #E9D5FF", borderRadius: 10, fontSize: 14, color: "#1a0533", background: "#FAFAFF", boxSizing: "border-box" }} />
              </div>
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#6B7280", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.5px" }}>Mot de passe</label>
                <div style={{ position: "relative" }}>
                  <input type={showPass ? "text" : "password"} required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                    style={{ width: "100%", padding: "11px 40px 11px 14px", border: "1.5px solid #E9D5FF", borderRadius: 10, fontSize: 14, color: "#1a0533", background: "#FAFAFF", boxSizing: "border-box" }} />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 15 }}>
                    {showPass ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>
              {error && (
                <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "9px 12px", marginBottom: 14, fontSize: 13, color: "#DC2626" }}>
                  ⚠️ {error}
                </div>
              )}
              <button type="submit" disabled={loading}
                style={{ width: "100%", padding: "12px", background: loading ? "#E5E7EB" : "linear-gradient(135deg, #A020F0, #FF7F11)", color: loading ? "#9CA3AF" : "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                {loading ? <><div style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin .7s linear infinite" }} />Connexion...</> : "Se connecter →"}
              </button>
            </form>
          </div>

          <p style={{ textAlign: "center", marginTop: 16, fontSize: 12, color: "#D1D5DB" }}>
            <a href="/" style={{ color: "#9CA3AF", textDecoration: "none" }}>← Retour au site</a>
          </p>
        </div>
      </div>
    </>
  );
}
