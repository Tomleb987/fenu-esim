import React, { useEffect } from "react";
import Head from "next/head";
import InsuranceForm from "@/components/insurance/InsuranceForm";

export default function AssurancePage() {

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
        <meta name="description" content="Souscrivez votre assurance voyage en ligne. Couverture médicale, annulation, bagages — résidents de Polynésie française." />
      </Head>

      <div className="min-h-screen bg-background pb-20 font-sans text-foreground">

        {/* HERO */}
        <section className="relative overflow-hidden bg-gradient-hero text-primary-foreground pt-16 pb-36 px-6">

          {/* Motif de fond subtil */}
          <div className="absolute inset-0 opacity-10 pointer-events-none"
            style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)", backgroundSize: "60px 60px" }}
          />

          <div className="relative max-w-4xl mx-auto text-center z-10">

            {/* Badge partenaire */}
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5 mb-6 border border-white/20 shadow-sm">
              <span className="text-sm font-medium">Partenaire officiel ANSET ASSURANCES</span>
            </div>

            {/* Titre principal */}
            <div className="mb-3">
              <span className="text-xl md:text-2xl font-bold uppercase tracking-widest opacity-90">
                Assurance Voyage
              </span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-4 tracking-tight drop-shadow-sm">
              Voyagez l'esprit tranquille
            </h1>
            <p className="text-lg md:text-xl opacity-80 max-w-2xl mx-auto font-light leading-relaxed">
              Couverture complète pour les résidents de Polynésie française.
              <br className="hidden md:block" /> Souscription immédiate, contrat délivré en quelques minutes.
            </p>

          </div>
        </section>

        {/* FORMULAIRE */}
        <div className="container mx-auto px-4 -mt-20 relative z-20">
          <InsuranceForm />
        </div>

        {/* FOOTER PAGE */}
        <div className="text-center mt-12 text-muted-foreground text-xs space-y-1 px-4">
          <p>🔒 Paiement sécurisé via Stripe · Support client 7j/7</p>
          <p>
            Assurance distribuée par FENUASIM — N° RUIAM PF 26 012 · 
            Contrat AVA Assurances — ORIAS 07 023 453
          </p>
        </div>

      </div>
    </>
  );
}
