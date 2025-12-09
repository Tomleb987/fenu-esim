import React from "react"; // Plus besoin de useEffect
import Head from "next/head";
import { InsuranceForm } from "@/components/insurance/InsuranceForm";
import { Shield } from "lucide-react";

export default function AssurancePage() {
  return (
    <>
      <Head>
        <title>Assurance Voyage | Fenuasim</title>
      </Head>

      {/* On applique le thème ici sur la DIV principale */}
      <div className="lovable-theme min-h-screen bg-background pb-20 text-foreground">
        
        {/* Header Hero avec le dégradé */}
        <section className="relative overflow-hidden bg-gradient-hero text-primary-foreground pt-16 pb-32 px-6">
            <div className="relative max-w-4xl mx-auto text-center z-10">
                <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5 mb-6 border border-white/20">
                    <Shield className="w-4 h-4" />
                    <span className="text-sm font-medium">Partenaire officiel AVA Assurances</span>
                </div>
                <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight">
                    Voyagez l'esprit tranquille
                </h1>
                <p className="text-lg md:text-xl opacity-90 max-w-2xl mx-auto font-light">
                    Protection complète : Annulation, Rapatriement et Frais médicaux.
                </p>
            </div>
        </section>

        {/* Le Formulaire */}
        <div className="container mx-auto px-4 -mt-20 relative z-20">
            <InsuranceForm />
        </div>
      </div>
    </>
  );
}
