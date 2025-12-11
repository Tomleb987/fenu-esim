"use client"; // sans danger même si tu es dans /pages, c’est juste une string

import React, { useEffect } from "react";
import Head from "next/head";
import InsuranceForm from "@/components/insurance/InsuranceForm"; 
// ⚠️ Assure-toi que dans InsuranceForm.tsx tu as bien: `export default function InsuranceForm() { ... }` 

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
        <meta
          name="description"
          content="Souscrivez votre assurance voyage en ligne."
        />
      </Head>

      <div className="min-h-screen bg-background pb-20 font-sans text-foreground">
        {/* Header */}
        <section className="relative overflow-hidden bg-gradient-hero text-primary-foreground pt-16 pb-32 px-6">
          <div className="relative max-w-4xl mx-auto text-center z-10">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5 mb-6 border border-white/20 shadow-sm">
              <span className="text-sm font-medium">
                Partenaire officiel ANSET ASSURANCES
              </span>
            </div>

            <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight drop-shadow-sm">
              Voyagez l&apos;esprit tranquille
            </h1>

            <p className="text-lg md:text-xl opacity-90 max-w-2xl mx-auto font-light leading-relaxed">
              Protection complète : Annulation, Rapatriement et Frais médicaux.
              <br className="hidden md:block" /> Souscription immédiate en
              quelques clics.
            </p>
          </div>
        </section>

        <div className="container mx-auto px-4 -mt-20 relative z-20">
          <InsuranceForm />
        </div>

        <div className="text-center mt-16 text-muted-foreground text-sm">
          <p>Paiement sécurisé via Stripe • Support client 7j/7</p>
        </div>
      </div>
    </>
  );
}
