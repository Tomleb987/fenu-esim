import { Html, Head, Main, NextScript } from 'next/document';
export default function Document() {
  return (
    <Html lang="fr">
      <Head>
        {/* Charset & Favicon */}
        <meta charSet="utf-8" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/images/logo.png" />
        {/* Couleur navigateur mobile */}
        <meta name="theme-color" content="#7c3aed" />
        {/* Open Graph global */}
        <meta property="og:site_name" content="FENUA SIM" />
        <meta property="og:locale" content="fr_FR" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://www.fenuasim.com/images/og-default.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@fenuasim" />
        <meta name="twitter:image" content="https://www.fenuasim.com/images/og-default.png" />
        {/* Géolocalisation — Polynésie française (siège) */}
        <meta name="geo.region" content="PF" />
        <meta name="geo.placename" content="Polynésie française" />
        <meta name="geo.position" content="-17.6797;-149.4068" />
        <meta name="ICBM" content="-17.6797, -149.4068" />
        {/* Schema.org Organization */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "FENUA SIM",
              url: "https://www.fenuasim.com",
              logo: "https://www.fenuasim.com/images/logo.png",
              description: "eSIM de voyage pour les voyageurs francophones de l'Outre-mer et du monde entier. Connexion 4G/5G dans 180+ pays, activation immédiate.",
              address: {
                "@type": "PostalAddress",
                addressCountry: "FR",
                addressLocality: "Paris",
              },
              areaServed: [
                { "@type": "Country", name: "France" },
                { "@type": "AdministrativeArea", name: "Polynésie française" },
                { "@type": "AdministrativeArea", name: "Nouvelle-Calédonie" },
                { "@type": "AdministrativeArea", name: "Martinique" },
                { "@type": "AdministrativeArea", name: "Guadeloupe" },
                { "@type": "AdministrativeArea", name: "La Réunion" },
                { "@type": "AdministrativeArea", name: "Guyane" },
              ],
              contactPoint: {
                "@type": "ContactPoint",
                email: "contact@fenuasim.com",
                contactType: "customer service",
                availableLanguage: "French",
              },
              sameAs: [
                "https://www.facebook.com/fenuasim",
                "https://www.instagram.com/fenuasim",
              ],
            }),
          }}
        />
        {/* Plausible Analytics */}
        <script async src="https://plausible.io/js/pa-EtAThz42LoAALJIeRhkoK.js" />
        <script dangerouslySetInnerHTML={{ __html: `window.plausible=window.plausible||function(){(plausible.q=plausible.q||[]).push(arguments)},plausible.init=plausible.init||function(i){plausible.o=i||{}};plausible.init()` }} />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
