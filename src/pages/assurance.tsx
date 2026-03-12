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
        <title>Assurance Voyage en ligne — Résidents de Polynésie française | FENUA SIM</title>
        <meta name="description" content="Souscrivez votre assurance voyage depuis Tahiti. AVA Tourist Card & Carte Santé : frais médicaux 500 000 €, annulation, rapatriement, bagages. Partenaire officiel ANSET Assurances. N° RUIAM PF 26 012." />
        <meta name="keywords" content="assurance voyage Polynésie française, assurance voyage Tahiti, assurance voyage résidents PF, assurance annulation Tahiti, AVA Tourist Card, assurance médicale voyage, assurance rapatriement Tahiti" />
        <link rel="canonical" href="https://www.fenuasim.com/assurance" />
        <meta property="og:title" content="Assurance Voyage en ligne — Résidents de Polynésie française | FENUA SIM" />
        <meta property="og:description" content="Frais médicaux 500 000 €, annulation, rapatriement. Souscription 100% en ligne, contrat délivré en quelques minutes. Partenaire ANSET Assurances." />
        <meta property="og:url" content="https://www.fenuasim.com/assurance" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "InsuranceAgency",
            name: "FENUA SIM — Assurance Voyage",
            url: "https://www.fenuasim.com/assurance",
            description: "Assurance voyage en ligne pour les résidents de Polynésie française. Partenaire AVA Assurances via ANSET. N° RUIAM PF 26 012.",
            areaServed: { "@type": "AdministrativeArea", name: "Polynésie française" },
            hasOfferCatalog: {
              "@type": "OfferCatalog",
              name: "Assurances voyage",
              itemListElement: [
                {
                  "@type": "Offer",
                  itemOffered: {
                    "@type": "Service",
                    name: "AVA Tourist Card",
                    description: "Assurance multirisque voyage : annulation jusqu'à 6 000 €, frais médicaux 500 000 €, bagages 1 500 €, responsabilité civile 4 500 000 €. Aucune limite d'âge."
                  }
                },
                {
                  "@type": "Offer",
                  itemOffered: {
                    "@type": "Service",
                    name: "AVA Carte Santé",
                    description: "Assurance santé voyage : frais médicaux 500 000 € sans franchise, hospitalisation 100% frais réels, rapatriement sanitaire. Dès 5 €/jour."
                  }
                }
              ]
            }
          })}}
        />
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
