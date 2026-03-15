import React, { useEffect, useState, useRef } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { CheckCircle, Home, Mail, ShieldCheck, XCircle, Loader2, FileText, Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const POLL_INTERVAL = 3000;  // 3s entre chaque essai
const POLL_MAX      = 8;     // max 8 essais = ~24s

export default function AssuranceSuccessPage() {
  const router = useRouter();

  const [mounted, setMounted]           = useState(false);
  const [status, setStatus]             = useState<'loading' | 'success' | 'error'>('loading');
  const [adhesionNumber, setAdhesionNumber] = useState<string | null>(null);
  const [contractLink, setContractLink] = useState<string | null>(null);
  const [attestationUrl, setAttestationUrl] = useState<string | null>(null);
  const [docsLoading, setDocsLoading]   = useState(false); // polling en cours
  const [pollCount, setPollCount]       = useState(0);
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
    if (!session_id || typeof session_id !== 'string') {
      setStatus('error');
      return;
    }

    async function handleSession() {
      try {
        const resMark = await fetch(`/api/assurance/mark-paid`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id }),
        });
        const markResult = await resMark.json();

        if (!markResult.success) {
          setStatus('error');
          return;
        }

        setAdhesionNumber(markResult.adhesion_number || null);

        if (markResult.contract_link || markResult.attestation_url) {
          // Documents déjà disponibles (webhook déjà passé)
          setContractLink(markResult.contract_link || null);
          setAttestationUrl(markResult.attestation_url || null);
          setStatus('success');
        } else {
          // Paiement OK mais docs pas encore prêts → on affiche success + on poll
          setStatus('success');
          setDocsLoading(true);
          schedulePoll(markResult.adhesion_number, 1);
        }
      } catch (err) {
        console.error("💥 Erreur success:", err);
        setStatus('error');
      }
    }

    handleSession();
  }, [mounted, router.isReady, router.query.session_id]);

  function schedulePoll(adhesionNum: string, attempt: number) {
    if (attempt > POLL_MAX) {
      setDocsLoading(false); // abandon — l'email prendra le relais
      return;
    }
    pollRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/assurance/get-documents?adhesion_number=${adhesionNum}`);
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

      <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4 font-sans text-foreground">

        {status === 'loading' && (
          <div className="text-center text-white">
            <Loader2 className="w-16 h-16 mx-auto mb-4 animate-spin text-white/80" />
            <h2 className="text-2xl font-semibold">Vérification du paiement...</h2>
            <p className="text-white/70 mt-2">Merci de ne pas fermer cette page.</p>
          </div>
        )}

        {status === 'error' && (
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

        {status === 'success' && (
          <div className="bg-white/95 backdrop-blur-md p-8 md:p-12 rounded-2xl shadow-2xl max-w-lg w-full text-center animate-in fade-in zoom-in duration-500 border border-white/20">

            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>

            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 tracking-tight">
              Paiement Validé !
            </h1>

            <div className="text-lg text-gray-600 mb-6 leading-relaxed">
              <p>Votre assurance est active.</p>
              {adhesionNumber && (
                <p className="mt-2 text-sm bg-gray-100 py-2 px-4 rounded-full inline-block font-mono text-gray-800">
                  N° Adhésion : <strong>{adhesionNumber}</strong>
                </p>
              )}
            </div>

            {/* Documents disponibles */}
            {(contractLink || attestationUrl) && (
              <div className="bg-purple-50 p-5 rounded-xl border border-purple-100 text-left mb-6 shadow-sm space-y-3">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Vos documents
                </h3>
                {contractLink && (
                  <a
                    href={contractLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 bg-white border border-purple-200 hover:border-primary rounded-lg px-4 py-3 text-sm font-medium text-gray-800 hover:text-primary transition-colors w-full"
                  >
                    <Download className="w-4 h-4 text-primary flex-shrink-0" />
                    Certificat de Garantie (PDF)
                  </a>
                )}
                {attestationUrl && (
                  <a
                    href={attestationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 bg-white border border-purple-200 hover:border-primary rounded-lg px-4 py-3 text-sm font-medium text-gray-800 hover:text-primary transition-colors w-full"
                  >
                    <Download className="w-4 h-4 text-primary flex-shrink-0" />
                    Attestation d'Assurance signée (PDF)
                  </a>
                )}
              </div>
            )}

            {/* Polling en cours — documents pas encore prêts */}
            {docsLoading && !contractLink && !attestationUrl && (
              <div className="bg-purple-50 p-5 rounded-xl border border-purple-100 text-left mb-6 shadow-sm">
                <div className="flex items-center gap-3 text-primary">
                  <RefreshCw className="w-5 h-5 animate-spin flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">Récupération de vos documents...</p>
                    <p className="text-xs text-gray-500 mt-0.5">Validation du contrat chez AVA en cours ({pollCount}/{POLL_MAX})</p>
                  </div>
                </div>
              </div>
            )}

            {/* Polling terminé sans documents — email en fallback */}
            {!docsLoading && !contractLink && !attestationUrl && (
              <div className="bg-purple-50 p-5 rounded-xl border border-purple-100 text-left mb-6 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="bg-white p-2 rounded-full shadow-sm flex-shrink-0">
                    <Mail className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-1">Vérifiez vos emails</h3>
                    <p className="text-sm text-gray-600">
                      Votre <strong>certificat d'assurance</strong> et votre contrat signé
                      vous seront envoyés dans quelques instants par AVA Assurances.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <Link href="/" className="block w-full">
                <Button className="w-full h-12 text-lg bg-primary hover:bg-primary/90 text-white shadow-lg transition-transform hover:scale-[1.02]">
                  <Home className="w-5 h-5 mr-2" />
                  Retour à l'accueil
                </Button>
              </Link>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-center gap-2 text-xs text-gray-400 font-medium">
              <ShieldCheck className="w-4 h-4" />
              Partenaire officiel ANSET ASSURANCES
            </div>
          </div>
        )}
      </div>
    </>
  );
}
