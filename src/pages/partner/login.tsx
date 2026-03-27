// src/pages/partner/login.tsx
import type { ReactElement } from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";

export default function PartnerLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    if (!router.isReady) return;

    const init = async () => {
      try {
        if (router.query.error === "unauthorized") {
          setError("Accès non autorisé. Ce compte n'est pas un partenaire actif.");
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user?.email) return;

        const userEmail = session.user.email.trim().toLowerCase();

        const { data: profile, error: profileError } = await supabase
          .from("partner_profiles")
          .select("is_active")
          .ilike("email", userEmail)
          .maybeSingle();

        if (profileError) {
          console.error("Erreur lecture partner_profiles :", profileError);
          return;
        }

        if (profile?.is_active) {
          await router.push("/partner");
        }
      } catch (err) {
        console.error("Erreur init login :", err);
      }
    };

    init();
  }, [router.isReady, router.query.error, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const normalizedEmail = email.trim().toLowerCase();

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (authError || !data.user?.email) {
        setError("Email ou mot de passe incorrect.");
        return;
      }

      const userEmail = data.user.email.trim().toLowerCase();

      const { data: profile, error: profileError } = await supabase
        .from("partner_profiles")
        .select("is_active")
        .ilike("email", userEmail)
        .maybeSingle();

      if (profileError) {
        console.error("Erreur partner_profiles :", profileError);
        await supabase.auth.signOut();
        setError("Impossible de vérifier votre accès partenaire.");
        return;
      }

      if (!profile?.is_active) {
        await supabase.auth.signOut();
        setError("Ce compte n'est pas autorisé à accéder à l'espace partenaire.");
        return;
      }

      await router.push("/partner");
    } catch (err) {
      console.error("Erreur login :", err);
      setError("Une erreur inattendue est survenue.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Connexion Partenaire - FENUA SIM</title>
        <meta name="robots" content="noindex" />
      </Head>

      <style>{`
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes fadein { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }
        @keyframes spin { to { transform: rotate(360deg) } }
        .float { animation: float 6s ease-in-out infinite; }
        .ani { animation: fadein .4s ease; }
        input:focus { outline: none; border-color: #A020F0 !important; box-shadow: 0 0 0 3px rgba(160,32,240,0.1); }
        @media(min-width:768px){.md-block{display:flex!important;flex-direction:column;align-items:center;justify-content:center;}}
      `}</style>

      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          fontFamily: "Arial, Helvetica, sans-serif",
          background: "#f8f7ff",
        }}
      >
        <div
          style={{
            flex: 1,
            display: "none",
            background: "linear-gradient(160deg, #1a0533 0%, #2d0a5c 40%, #0a0a2e 100%)",
            position: "relative",
            overflow: "hidden",
          }}
          className="md-block"
        >
          <div
            style={{
              position: "absolute",
              width: 400,
              height: 400,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(160,32,240,0.3) 0%, transparent 70%)",
              top: -100,
              left: -100,
            }}
          />
          <div
            style={{
              position: "absolute",
              width: 300,
              height: 300,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(255,127,17,0.2) 0%, transparent 70%)",
              bottom: -50,
              right: -50,
            }}
          />

          <div style={{ position: "relative", textAlign: "center", padding: "40px" }}>
            <div className="float" style={{ marginBottom: 40 }}>
              <Image
                src="/logo.png"
                alt="FENUA SIM"
                width={120}
                height={120}
                style={{
                  objectFit: "contain",
                  filter: "drop-shadow(0 8px 32px rgba(160,32,240,0.4))",
                }}
              />
            </div>

            <h2 style={{ fontSize: 32, fontWeight: 800, color: "#fff", margin: "0 0 12px", letterSpacing: "-0.5px" }}>
              Espace
              <br />
              <span
                style={{
                  background: "linear-gradient(135deg, #A020F0, #FF7F11)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Partenaire
              </span>
            </h2>

            <p
              style={{
                color: "rgba(255,255,255,0.5)",
                fontSize: 15,
                lineHeight: 1.7,
                maxWidth: 280,
                margin: "0 auto 40px",
              }}
            >
              Gérez vos ventes eSIM, générez des liens de paiement et suivez vos commandes en temps réel.
            </p>

            {[
              { icon: "🔗", text: "Liens de paiement Stripe sécurisés" },
              { icon: "📱", text: "eSIM provisionnée automatiquement" },
              { icon: "📊", text: "Suivi des commandes en temps réel" },
            ].map((f, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 16,
                  background: "rgba(255,255,255,0.05)",
                  borderRadius: 12,
                  padding: "12px 16px",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <span style={{ fontSize: 20 }}>{f.icon}</span>
                <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 14 }}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "40px 24px",
          }}
        >
          <div className="ani" style={{ width: "100%", maxWidth: 420 }}>
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <Image
                src="/logo.png"
                alt="FENUA SIM"
                width={80}
                height={80}
                style={{ objectFit: "contain", display: "block", margin: "0 auto 12px" }}
              />
              <div style={{ fontSize: 22, fontWeight: 800 }}>
                <span
                  style={{
                    background: "linear-gradient(135deg, #A020F0, #FF4D6D)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  FENUA
                </span>
                <span style={{ color: "#D1D5DB", margin: "0 3px" }}>•</span>
                <span
                  style={{
                    background: "linear-gradient(135deg, #FF4D6D, #FF7F11)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  SIM
                </span>
              </div>
              <p
                style={{
                  color: "#9CA3AF",
                  fontSize: 13,
                  marginTop: 4,
                  letterSpacing: "0.5px",
                  textTransform: "uppercase",
                }}
              >
                Espace partenaire
              </p>
            </div>

            <div
              style={{
                background: "#fff",
                borderRadius: 20,
                padding: "36px 32px",
                boxShadow: "0 8px 40px rgba(160,32,240,0.08)",
                border: "1px solid #F0E8FF",
              }}
            >
              <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1a0533", margin: "0 0 6px" }}>
                Connexion
              </h1>
              <p style={{ color: "#9CA3AF", fontSize: 14, margin: "0 0 28px" }}>
                Accédez à votre espace partenaire
              </p>

              <form onSubmit={handleLogin}>
                <div style={{ marginBottom: 16 }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#6B7280",
                      marginBottom: 6,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="partenaire@exemple.com"
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      border: "1.5px solid #E9D5FF",
                      borderRadius: 10,
                      fontSize: 15,
                      color: "#1a0533",
                      background: "#FAFAFF",
                      boxSizing: "border-box",
                      transition: "border-color .2s",
                    }}
                  />
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#6B7280",
                      marginBottom: 6,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    Mot de passe
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showPass ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      style={{
                        width: "100%",
                        padding: "12px 42px 12px 14px",
                        border: "1.5px solid #E9D5FF",
                        borderRadius: 10,
                        fontSize: 15,
                        color: "#1a0533",
                        background: "#FAFAFF",
                        boxSizing: "border-box",
                        transition: "border-color .2s",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      style={{
                        position: "absolute",
                        right: 12,
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "#9CA3AF",
                        fontSize: 16,
                      }}
                    >
                      {showPass ? "🙈" : "👁️"}
                    </button>
                  </div>
                </div>

                {error && (
                  <div
                    style={{
                      background: "#FEF2F2",
                      border: "1px solid #FECACA",
                      borderRadius: 8,
                      padding: "10px 14px",
                      marginBottom: 16,
                      fontSize: 13,
                      color: "#DC2626",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <span>⚠️</span>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: "100%",
                    padding: "13px",
                    background: loading
                      ? "#E5E7EB"
                      : "linear-gradient(135deg, #A020F0 0%, #FF4D6D 50%, #FF7F11 100%)",
                    color: loading ? "#9CA3AF" : "#fff",
                    border: "none",
                    borderRadius: 12,
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: loading ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    boxShadow: loading ? "none" : "0 4px 16px rgba(160,32,240,0.3)",
                    transition: "all .2s",
                  }}
                >
                  {loading ? (
                    <>
                      <div
                        style={{
                          width: 18,
                          height: 18,
                          border: "2px solid rgba(160,32,240,.3)",
                          borderTopColor: "#A020F0",
                          borderRadius: "50%",
                          animation: "spin .7s linear infinite",
                        }}
                      />
                      Connexion...
                    </>
                  ) : (
                    "Se connecter →"
                  )}
                </button>
              </form>
            </div>

            <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "#9CA3AF" }}>
              Vous n'avez pas accès ?{" "}
              <a
                href="mailto:hello@fenuasim.com"
                style={{ color: "#A020F0", fontWeight: 600, textDecoration: "none" }}
              >
                Contactez-nous
              </a>
            </p>

            <p style={{ textAlign: "center", marginTop: 12, fontSize: 12, color: "#D1D5DB" }}>
              <a href="/" style={{ color: "#9CA3AF", textDecoration: "none" }}>
                ← Retour au site
              </a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

PartnerLogin.getLayout = (page: ReactElement) => page;
