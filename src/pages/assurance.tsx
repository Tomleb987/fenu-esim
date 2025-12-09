import React, { useEffect } from "react";
import Head from "next/head";
import { InsuranceForm } from "@/components/insurance/InsuranceForm";
import { Shield } from "lucide-react";

export default function AssurancePage() {
  
  // Active le mode "Assurance" (Police Inter + Couleurs Lovable) sur toute la page
  useEffect(() => {
    document.body.classList.add("assurance-mode");
    return () => {
      document.body.classList.remove("assurance-mode");
    };
  }, []);

  return (
    <>
      <Head>
        <title>Assurance Voyage | Fenuasim</title>
        <meta name="description" content="Souscrivez votre assurance voyage en ligne." />
      </Head>

      {/* Conteneur principal */}
      <div className="min-h-screen bg-background pb-20 font-sans text-foreground">
        
        {/* HEADER HERO
            - bg-gradient-hero : Applique le dégradé Violet->Orange + le Motif Vignettes 
            - text-primary-foreground : Met le texte en blanc/clair
        */}
        <section className="relative overflow-hidden bg-gradient-hero text-primary-foreground pt-16 pb-32 px-6">
            
            <div className="relative max-w-4xl mx-auto text-center z-10">
                {/* Badge "Partenaire Officiel" - MODIFIÉ ICI */}
                <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5 mb-6 border border-white/20 shadow-sm">
                    <Shield className="w-4 h-4" />
                    <span className="text-sm font-medium">Partenaire officiel ANSET ASSURANCES</span>
                </div>

                {/* Titre Principal */}
                <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight drop-shadow-sm">
                    Voyagez l'esprit tranquille
                </h1>

                {/* Sous-titre */}
                <p className="text-lg md:text-xl opacity-90 max-w-2xl mx-auto font-light leading-relaxed">
                    Protection complète : Annulation, Rapatriement et Frais médicaux.
                    <br className="hidden md:block" /> Souscription immédiate en quelques clics.
                </p>
            </div>
        </section>

        {/* FORMULAIRE FLOTTANT 
            -mt-20 : Fait remonter le formulaire sur le header pour l'effet de superposition
        */}
        <div className="container mx-auto px-4 -mt-20 relative z-20">
            <InsuranceForm />
        </div>

        {/* Section de réassurance en bas */}
        <div className="text-center mt-16 text-muted-foreground text-sm">
            <p>Paiement sécurisé via Stripe • Support client 7j/7</p>
        </div>
      </div>
    </>
  );
}
