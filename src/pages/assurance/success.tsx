import React, { useEffect, useState, useRef } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  CheckCircle, Home, Mail, ShieldCheck, XCircle,
  Loader2, FileText, Download, RefreshCw, Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";

const POLL_INTERVAL = 3000;
const POLL_MAX      = 8;

export default function AssuranceSuccessPage() {
  const router = useRouter();

  const [mounted, setMounted]               = useState(false);
  const [status, setStatus]                 = useState<'loading' | 'success' | 'error'>('loading');
  const [adhesionNumber, setAdhesionNumber] = useState<string | null>(null);
  const [contractLink, setContractLink]     = useState<string | null>(null);
  const [attestationUrl, setAttestationUrl] = useState<string | null>(null);
  const [docsLoading, setDocsLoading]       = useState(false);
  const [pollCount, setPollCount]           = useState(0);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMounted(true);
    document.body.classList.add("assurance-mode");
    return () => {
      document.body.classList.remove("assurance-mode");
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, []);

  useEffect(() => {
    if (!mounted || !router.isReady) return;

    const session_id = router.query.session_id;
    if (!session_id || typeof session_id !== "string") {
      setStatus("error");
      return;
    }

    async function handleSession() {
      try {
        const resMark = await fetch(`/api/assurance/mark-paid`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id }),
        });
        const markResult = await resMark.json();

        if (!markResult.success) { setStatus("error"); return; }

        setAdhesionNumber(markResult.adhesion_number || null);

        if (markResult.contract_link || markResult.attestation_url) {
          setContractLink(markResult.contract_link || null);
          setAttestationUrl(markResult.attestation_url || null);
          setStatus("success");
        } else {
          setStatus("success");
          setDocsLoading(true);
          schedulePoll(markResult.adhesion_number, 1);
        }
      } catch (err) {
        console.error("💥 Erreur success:", err);
        setStatus("error");
      }
    }

    handleSession();
  }, [mounted, router.isReady, router.query.session_id]);

  function schedulePoll(adhesionNum: string, attempt: number) {
    if (attempt > POLL_MAX) { setDocsLoading(false); return; }
    pollRef.current = setTimeout(async () => {
      try {
        const res  = await fetch(`/api/assurance/get-documents?adhesion_number=${adhesionNum}`);
        const data = await res.json();
        setPollCount(attempt);
        if (data.contract_link || data.attestation_url) {
          setContractLink(data.contract_link || null);
          setAttestationUrl(data.attestation_url || null);
          setDocsLoading(false);
        } else {
          schedulePoll(adhesionNum, attempt + 1);
        }
      } catch {
        schedulePoll(adhesionNum, attempt + 1);
      }
    }, POLL_INTERVAL);
  }

  if (!mounted) return null;

  return (
    <>
      <Head>
        <title>Confirmation | Fenuasim Assurance</title>
        <meta name="robots" content="noindex" />
      </Head>

      <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4 font-sans">

        {/* ─── LOADING ─── */}
        {status === "loading" && (
          <div className="text-center text-white">
            <Loader2 className="w-16 h-16 mx-auto mb-4 animate-spin text-white/80" />
            <h2 className="text-2xl font-semibold">Vérification du paiement...</h2>
            <p className="text-white/70 mt-2">Merci de ne pas fermer cette page.</p>
          </div>
        )}

        {/* ─── ERROR ─── */}
        {status === "error" && (
          <div className="bg-white/95 backdrop-blur-md p-8 rounded-2xl shadow-2xl max-w-lg w-full text-center border border-red-200">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-10 h-10 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Une erreur est survenue</h1>
            <p className="text-gray-600 mb-6">
              Nous n'avons pas pu valider votre paiement automatiquement.<br />
              Si vous avez été débité, contactez-nous.
            </p>
            <Link href="/contact" className="block w-full">
              <Button variant="destructive" className="w-full">Contacter le support</Button>
            </Link>
          </div>
        )}

        {/* ─── SUCCESS ─── */}
        {status === "success" && (
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl max-w-lg w-full border border-white/20 overflow-hidden animate-in fade-in zoom-in duration-500">

            {/* Header vert */}
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 px-6 py-8 text-center text-white">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                <CheckCircle className="w-11 h-11 text-white" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight">Paiement validé !</h1>
              <p className="text-white/85 mt-1 text-base">Votre assurance voyage est active.</p>
            </div>

            <div className="px-5 py-6 space-y-4">

              {/* Bulletin d'adhésion */}
              {adhesionNumber && (
                <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
                    Bulletin d'adhésion
                  </p>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-gray-500 flex-shrink-0">N° adhésion</span>
                    <span className="font-mono font-bold text-gray-900 bg-white border border-gray-200 rounded-lg px-3 py-1 text-sm truncate">
                      {adhesionNumber}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-2">
                    <span className="text-sm text-gray-500 flex-shrink-0">Assureur</span>
                    <span className="text-sm font-medium text-gray-700">AVA Assurances</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-2">
                    <span className="text-sm text-gray-500 flex-shrink-0">Statut</span>
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-0.5">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                      Actif
                    </span>
                  </div>
                </div>
              )}

              {/* Documents disponibles */}
              {(contractLink || attestationUrl) && (
                <div className="rounded-xl border border-purple-200 overflow-hidden">
                  <div className="bg-purple-50 px-4 py-3 flex items-center gap-2 border-b border-purple-100">
                    <FileText className="w-4 h-4 text-purple-600 flex-shrink-0" />
                    <span className="text-sm font-semibold text-purple-900">Vos documents</span>
                  </div>
                  <div className="divide-y divide-purple-100">
                    {contractLink && (
                      <a
                        href={contractLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 px-4 py-3 hover:bg-purple-50 transition-colors group"
                      >
                        <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-purple-200 transition-colors">
                          <Download className="w-4 h-4 text-purple-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900">Bulletin d'adhésion</p>
                          <p className="text-xs text-gray-400">PDF · AVA Assurances</p>
                        </div>
                      </a>
                    )}
                    {attestationUrl && (
                      <a
                        href={attestationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 px-4 py-3 hover:bg-purple-50 transition-colors group"
                      >
                        <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-purple-200 transition-colors">
                          <Download className="w-4 h-4 text-purple-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900">Attestation d'assurance signée</p>
                          <p className="text-xs text-gray-400">PDF · AVA Assurances</p>
                        </div>
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Polling en cours */}
              {docsLoading && !contractLink && !attestationUrl && (
                <div className="rounded-xl border border-purple-200 bg-purple-50 p-4 flex items-center gap-3">
                  <RefreshCw className="w-5 h-5 text-purple-500 animate-spin flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Récupération des documents…</p>
                    <p className="text-xs text-gray-500 mt-0.5">Validation en cours chez AVA ({pollCount}/{POLL_MAX})</p>
                  </div>
                </div>
              )}

              {/* Email notice — toujours affiché */}
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 flex items-start gap-3">
                <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Mail className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Un email de confirmation vous a été envoyé</p>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    Votre bulletin d'adhésion et vos documents sont joints à cet email.
                    Pensez à vérifier vos spams si vous ne le recevez pas sous 5 minutes.
                  </p>
                </div>
              </div>

              {/* Délai docs si polling terminé sans résultat */}
              {!docsLoading && !contractLink && !attestationUrl && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
                  <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Clock className="w-4 h-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Documents en cours de génération</p>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                      AVA Assurances finalise vos documents. Ils vous seront transmis par email dans quelques minutes.
                    </p>
                  </div>
                </div>
              )}

              {/* CTA */}
              <Link href="/" className="block w-full pt-1">
                <Button className="w-full h-12 text-base bg-primary hover:bg-primary/90 text-white shadow-md">
                  <Home className="w-5 h-5 mr-2" />
                  Retour à l'accueil
                </Button>
              </Link>

              {/* Footer */}
              <div className="flex items-center justify-center gap-2 text-xs text-gray-400 pb-1">
                <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                <span>Partenaire officiel ANSET ASSURANCES</span>
              </div>

            </div>
          </div>
        )}
      </div>
    </>
  );
}
