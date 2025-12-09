import React, { useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { CheckCircle, Home, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AssuranceSuccessPage() {
  
  // 1. On active le thème Lovable (Police Inter + Couleurs)
  useEffect(() => {
    document.body.classList.add("assurance-mode");
    return () => {
      document.body.classList.remove("assurance-mode");
    };
  }, []);

  return (
    <>
      <Head>
        <title>Confirmation | Fenuasim Assurance</title>
        <meta name="robots" content="noindex" />
      </Head>

      {/* 2. Fond avec le dégradé et la texture vignette */}
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4 font-sans">
        
        {/* Carte de succès animée */}
        <div className="bg-white/95 backdrop-blur-md p-8 md:p-12 rounded-2xl shadow-2xl max-w-lg w-full text-center animate-in fade-in zoom-in duration-500 border border-white/20">
            
            {/* Icône Succès */}
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                <CheckCircle className="w-12 h-12 text-green-600" />
            </div>

            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 tracking-tight">
                Paiement Validé !
            </h1>
            
            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                Merci pour votre confiance. Votre souscription d'assurance voyage est confirmée.
            </p>

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
                        <p className="text-xs text-gray-400 mt-2">
                            (Pensez à vérifier vos spams si besoin)
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
            
            {/* Footer discret */}
            <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-center gap-2 text-xs text-gray-400 font-medium">
                <ShieldCheck className="w-4 h-4" />
                Partenaire officiel ANSET ASSURANCES
            </div>
        </div>
      </div>
    </>
  );
}
