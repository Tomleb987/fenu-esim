// ============================================================
// FENUA SIM – Accueil Admin
// src/pages/admin/index.tsx
// ============================================================

import { useEffect, useState } from "react";
import type { ReactElement } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Image from "next/image";
import {
  TrendingUp, Shield, Users, Package, LogOut, ChevronRight, Wifi, PlusCircle, FileText,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

const G = "linear-gradient(135deg, #A020F0 0%, #FF4D6D 50%, #FF7F11 100%)";

const MODULES = [
  {
    key: "dashboard",
    title: "Dashboard",
    desc: "CA, marges, commissions, reversements ANSET, statistiques depuis le lancement",
    href: "/admin/dashboard",
    icon: TrendingUp,
    color: "#A020F0",
    bg: "linear-gradient(135deg, #A020F0 0%, #FF4D6D 100%)",
    badge: null,
  },
  {
    key: "assurance",
    title: "Assurance",
    desc: "Gestion des contrats, souscriptions manuelles, envoi des liens de paiement",
    href: "/admin/assurance",
    icon: Shield,
    color: "#FF4D6D",
    bg: "linear-gradient(135deg, #FF4D6D 0%, #FF7F11 100%)",
    badge: null,
  },
  {
    key: "partenaires",
    title: "Partenaires",
    desc: "Accès au tunnel de vente partenaires, génération de liens eSIM et assurance",
    href: "/partner/login",
    icon: Users,
    color: "#0EA896",
    bg: "linear-gradient(135deg, #0EA896 0%, #0284C7 100%)",
    badge: null,
  },
  {
    key: "routeurs",
    title: "Stock routeurs",
    desc: "Gestion du stock de routeurs, locations en cours, retours et cautions",
    href: "/admin/routeurs",
    icon: Package,
    color: "#FF7F11",
    bg: "linear-gradient(135deg, #FF7F11 0%, #FF4D6D 100%)",
    badge: null,
  },
  {
    key: "fenuasimbox",
    title: "Créer dossier BOX",
    desc: "Générer un lien Stripe client : eSIM + location routeur + caution en un seul paiement",
    href: "/admin/fenuasimbox",
    icon: Wifi,
    color: "#0284C7",
    bg: "linear-gradient(135deg, #0284C7 0%, #0EA896 100%)",
    badge: null,
  },
  {
    key: "virement",
    title: "Vente par virement",
    desc: "Enregistrer manuellement une vente eSIM reglée par virement bancaire",
    href: "/admin/commande-manuelle",
    icon: PlusCircle,
    color: "#0EA896",
    bg: "linear-gradient(135deg, #0EA896 0%, #1D9E75 100%)",
    badge: null,
  },
  {
    key: "devis",
    title: "Devis & Factures",
    desc: "Generer des devis et factures PDF au format FENUA SIM",
    href: "/admin/devis",
    icon: FileText,
    color: "#0EA5E9",
    bg: "linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)",
    badge: null,
  },
];

export default function AdminHome() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!isMounted) return;

      if (session) {
        setAuthChecked(true);
        setUserEmail(session.user?.email ?? "");
      } else {
        router.replace("/admin/login");
      }
    };

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;

      if (session) {
        setAuthChecked(true);
      } else {
        setAuthChecked(false);
        router.replace("/admin/login");
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  const handleLogout = async () => {
    setLoggingOut(true);
    await supabase.auth.signOut();
    router.replace("/admin/login");
  };

  if (!authChecked) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f8f7ff",
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            border: "2px solid #E9D5FF",
            borderTopColor: "#A020F0",
            borderRadius: "50%",
            animation: "spin .7s linear infinite",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Admin — FENUA SIM</title>
        <meta name="robots" content="noindex" />
        <style>{`
          @keyframes fadein { from { opacity: 0; transform: translateY(16px) } to { opacity: 1; transform: none } }
          .card-ani { animation: fadein .35s ease both; }
          .module-card:hover { transform: translateY(-3px); box-shadow: 0 12px 40px rgba(0,0,0,0.12) !important; }
          .module-card { transition: transform .2s ease, box-shadow .2s ease; }
        `}</style>
      </Head>

      <div style={{ minHeight: "100vh", background: "#f8f7ff", fontFamily: "Arial, Helvetica, sans-serif" }}>
        <div
          style={{
            background: "#fff",
            borderBottom: "1px solid #F0E8FF",
            padding: "16px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "sticky",
            top: 0,
            zIndex: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Image src="/logo.png" alt="FENUA SIM" width={44} height={44} style={{ objectFit: "contain" }} />
            <div>
              <div style={{ fontSize: 15, fontWeight: 800 }}>
                <span style={{ background: G, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  FENUA
                </span>
                <span style={{ color: "#D1D5DB", margin: "0 4px" }}>·</span>
                <span style={{ color: "#374151" }}>Admin</span>
                <span style={{ color: "#9ca3af", fontSize: 11, marginLeft: 8 }}>{userEmail}</span>
              </div>
              <p
                style={{
                  color: "#9CA3AF",
                  fontSize: 11,
                  margin: 0,
                  letterSpacing: "0.5px",
                  textTransform: "uppercase",
                }}
              >
                Espace de gestion
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              color: "#9CA3AF",
              background: "none",
              border: "1px solid #E5E7EB",
              borderRadius: 10,
              padding: "6px 12px",
              cursor: "pointer",
            }}
          >
            <LogOut size={13} />
            {loggingOut ? "Déconnexion…" : "Déconnexion"}
          </button>
        </div>

        <div style={{ maxWidth: 860, margin: "0 auto", padding: "48px 24px" }}>
          <div className="card-ani" style={{ textAlign: "center", marginBottom: 48 }}>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: "#1a0533", margin: "0 0 8px" }}>
              Bonjour 👋
            </h1>
            <p style={{ color: "#9CA3AF", fontSize: 14, margin: 0 }}>
              Que souhaitez-vous gérer aujourd&apos;hui ?
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
            {MODULES.map((m, i) => {
              const Icon = m.icon;
              return (
                <a
                  key={m.key}
                  href={m.href}
                  className="module-card card-ani"
                  style={{
                    display: "block",
                    background: "#fff",
                    borderRadius: 20,
                    padding: 24,
                    border: "1px solid #F0E8FF",
                    boxShadow: "0 2px 12px rgba(160,32,240,0.06)",
                    textDecoration: "none",
                    animationDelay: `${i * 0.07}s`,
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 14,
                      background: m.bg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 16,
                      boxShadow: `0 4px 14px ${m.color}40`,
                    }}
                  >
                    <Icon size={24} color="#fff" />
                  </div>

                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1a0533", margin: "0 0 6px" }}>
                        {m.title}
                      </h2>
                      <p style={{ fontSize: 12, color: "#9CA3AF", margin: 0, lineHeight: 1.5 }}>
                        {m.desc}
                      </p>
                    </div>
                    <ChevronRight size={18} color="#D1D5DB" style={{ marginTop: 2, flexShrink: 0 }} />
                  </div>

                  <div style={{ height: 3, borderRadius: 99, background: m.bg, marginTop: 20, opacity: 0.4 }} />
                </a>
              );
            })}
          </div>

          <p style={{ textAlign: "center", marginTop: 48, fontSize: 11, color: "#D1D5DB" }}>
            FENUASIM · Espace admin · {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </>
  );
}

AdminHome.getLayout = (page: ReactElement) => page;
