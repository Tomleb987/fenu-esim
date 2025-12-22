import React, { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { CheckCircle, Home, Mail, ShieldCheck, XCircle, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AssuranceSuccessPage() {
  const router = useRouter();
  const { session_id } = router.query;

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [adhesionNumber, setAdhesionNumber] = useState<string | null>(null);

  // 1. Activation du thème Lovable
  useEffect(() => {
    document.body.classList.add("assurance-mode");
    return () => {
      document.body.classList.remove("assurance-mode");
    };
  }, []);

  // 2. Logique de vérification (Votre code existant)
  useEffect(() => {
    if (!router.isReady) return;
    if (!session_id || typeof session_id !== 'string') {
        // Pas de session_id ? On attend ou on redirige
        return; 
    }

    async function handleSession() {
      try {
        // A. Récupère la session Stripe
        const res = await fetch(`/api/assurance/stripe-session?session_id=${session_id}`);
        const { session } = await res.json();

        if (!session || session.payment_status !== 'paid') {
          setStatus('error');
          return;
        }

        // B. Marque comme payé dans Supabase
        const resMark = await fetch(`/api/assurance/mark-paid`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            insurance_id: session.metadata.insurance_id,
            adhesion_number: session.metadata.adhesion_number,
          }),
        });

        const markResult = await resMark.json();
        
        if (markResult.success) {
          setAdhesionNumber(session.metadata.adhesion_number);
          setStatus('success');
        } else {
          console.error("Erreur mark-paid:", markResult);
          // Si c'est déjà payé (webhook passé avant), on considère quand même comme succès
          if (markResult.error && markResult.error.includes("déjà")) {
             setAdhesionNumber(session.metadata.adhesion_number);
             setStatus('success');
          } else {
             setStatus('error');
          }
        }
      } catch (err) {
        console.error("💥 Erreur success:", err);
        setStatus('error');
      }
    }

    handleSession();
  }, [router.isReady, session_id]);

  // --- RENDU VISUEL ---

  return (
    <>
      <Head>
        <title>Confirmation | Fenuasim Assurance</title>
        <meta name="robots" content="noindex" />
      </Head>

      {/* Fond avec le dégradé Lovable */}
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4 font-sans text-foreground">
        
        {/* CAS 1 : CHARGEMENT */}
        {status === 'loading' && (
            <div className="text-center text-white animate-pulse">
                <Loader2 className="w-16 h-16 mx-auto mb-4 animate-spin text-white/80" />
                <h2 className="text-2xl font-semibold">Vérification du paiement...</h2>
                <p className="text-white/70">Merci de ne pas fermer cette page.</p>
            </div>
        )}

        {/* CAS 2 : ERREUR */}
        {status === 'error' && (
            <div className="bg-white/95 backdrop-blur-md p-8 rounded-2xl shadow-2xl max-w-lg w-full text-center border border-red-200">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <XCircle className="w-10 h-10 text-red-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Une erreur est survenue</h1>
                <p className="text-gray-600 mb-6">
                    Nous n'avons pas pu valider votre paiement automatiquement. <br/>
                    Si vous avez été débité, contactez-nous.
                </p>
                <Link href="/contact" className="block w-full">
                    <Button variant="destructive" className="w-full">Contacter le support</Button>
                </Link>
            </div>
        )}

        {/* CAS 3 : SUCCÈS (Le design Lovable complet) */}
        {status === 'success' && (
            <div className="bg-white/95 backdrop-blur-md p-8 md:p-12 rounded-2xl shadow-2xl max-w-lg w-full text-center animate-in fade-in zoom-in duration-500 border border-white/20">
                
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                    <CheckCircle className="w-12 h-12 text-green-600" />
                </div>

                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 tracking-tight">
                    Paiement Validé !
                </h1>
                
                <div className="text-lg text-gray-600 mb-8 leading-relaxed">
                    <p>Votre assurance est active.</p>
                    <p className="mt-2 text-sm bg-gray-100 py-2 px-4 rounded-full inline-block font-mono text-gray-800">
                        N° Adhésion : <strong>{adhesionNumber}</strong>
                    </p>
                </div>

                {/* Boîte d'information */}
                <div className="bg-purple-50 p-6 rounded-xl border border-purple-100 text-left mb-8 shadow-sm">
                    <div className="flex items-start gap-4">
                        <div className="bg-white p-2 rounded-full shadow-sm">
                            <Mail className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 mb-1">Vérifiez vos emails</h3>
                            <p className="text-sm text-gray-600">
                                Vous allez recevoir votre <strong>certificat d'assurance</strong> et votre contrat signé dans quelques instants.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Actions */}
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
