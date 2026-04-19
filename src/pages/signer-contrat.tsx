// ============================================================
// FENUA SIM – Page signature contrat client
// src/pages/signer-contrat.tsx
// ============================================================

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { CheckCircle, AlertTriangle, FileText, Shield } from "lucide-react";

const G = "linear-gradient(135deg, #A020F0 0%, #FF4D6D 50%, #FF7F11 100%)";

interface RentalInfo {
  id: string;
  customer_name: string;
  customer_email: string;
  rental_start: string;
  rental_end: string;
  rental_days: number;
  rental_amount: number;
  deposit_amount: number;
  signature_status: string;
  routers: { model: string; serial_number: string };
}

const fmtDate = (d: string) => d
  ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })
  : "-";

const fmtNum = (n: number) => (Math.round(n * 100) / 100)
  .toLocaleString("fr-FR", { minimumFractionDigits: 2 });
const fmtEur = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " XPF";

export default function SignerContrat() {
  const router = useRouter();
  const { token } = router.query as { token?: string };

  const [rental, setRental] = useState<RentalInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [signedName, setSignedName] = useState("");
  const [checked, setChecked] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch("/api/get-contract?token=" + token)
      .then(r => r.json())
      .then(data => {
        if (data.error) setError(data.error);
        else {
          setRental(data.rental);
          if (data.rental.signature_status === "signed") setSigned(true);
        }
      })
      .catch(() => setError("Impossible de charger le contrat"))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSign = async () => {
    if (!signedName.trim() || !checked) return;
    setSigning(true);
    try {
      const res = await fetch("/api/sign-contract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, signedName: signedName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSigned(true);
    } catch (err: any) {
      setError(err.message ?? "Erreur lors de la signature");
    } finally {
      setSigning(false);
    }
  };

  return (
    <>
      <Head>
        <title>Signature du contrat — FENUA SIM</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>

      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-2xl mx-auto">

          {/* Logo */}
          <div className="text-center mb-8">
            <a href="https://www.fenuasim.com">
              <span className="text-2xl font-bold" style={{ background: G, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                FENUA<span className="text-gray-300 mx-0.5">•</span>SIM
              </span>
            </a>
          </div>

          {/* Chargement */}
          {loading && (
            <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
              <div className="w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm text-gray-400">Chargement du contrat…</p>
            </div>
          )}

          {/* Erreur */}
          {!loading && error && (
            <div className="bg-white rounded-2xl p-10 text-center shadow-sm border border-gray-100">
              <AlertTriangle size={48} className="text-red-400 mx-auto mb-4" />
              <h2 className="text-lg font-bold text-gray-800 mb-2">Lien invalide ou expiré</h2>
              <p className="text-sm text-gray-500">{error}</p>
              <p className="text-sm text-gray-400 mt-3">
                Contactez-nous à <a href="mailto:hello@fenuasim.com" className="text-purple-600 hover:underline">hello@fenuasim.com</a>
              </p>
            </div>
          )}

          {/* Déjà signé */}
          {!loading && !error && signed && rental && (
            <div className="bg-white rounded-2xl p-10 text-center shadow-sm border border-gray-100">
              <CheckCircle size={52} className="text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">Contrat signé ✅</h2>
              <p className="text-sm text-gray-500 mb-4">
                Ce contrat a bien été signé électroniquement.<br />
                Un email de confirmation a été envoyé à <strong>hello@fenuasim.com</strong>.
              </p>
              <div className="bg-gray-50 rounded-xl px-5 py-4 text-sm text-left inline-block text-gray-600">
                <p><span className="text-gray-400">Routeur :</span> <strong>{rental.routers?.model}</strong></p>
                <p className="mt-1"><span className="text-gray-400">Période :</span> {fmtDate(rental.rental_start)} → {fmtDate(rental.rental_end)}</p>
              </div>
            </div>
          )}

          {/* Contrat à signer */}
          {!loading && !error && !signed && rental && (
            <div className="space-y-5">

              {/* En-tête contrat */}
              <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
                <div className="px-6 py-5" style={{ background: "linear-gradient(135deg, #1a0533 0%, #2d0a5e 100%)" }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/10">
                      <FileText size={20} className="text-white" />
                    </div>
                    <div>
                      <h1 className="text-white font-bold text-lg">Contrat de location</h1>
                      <p className="text-purple-200 text-xs">FENUASIM BOX — Routeur WiFi portable</p>
                    </div>
                  </div>
                </div>

                {/* Résumé location */}
                <div className="px-6 py-5">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Locataire</p>
                      <p className="text-sm font-semibold text-gray-800">{rental.customer_name}</p>
                      <p className="text-xs text-gray-500">{rental.customer_email}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Matériel</p>
                      <p className="text-sm font-semibold text-gray-800">{rental.routers?.model}</p>
                      <p className="text-xs text-gray-500">S/N {rental.routers?.serial_number}</p>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-xl px-4 py-3 grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Du</p>
                      <p className="text-xs font-semibold text-gray-700">{fmtDate(rental.rental_start)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Au</p>
                      <p className="text-xs font-semibold text-gray-700">{fmtDate(rental.rental_end)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Loyer total</p>
                      <p className="text-xs font-bold" style={{ color: "#A020F0" }}>{fmtEur(rental.rental_amount)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Articles du contrat */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-sm font-bold text-gray-800 mb-4">Conditions du contrat</h2>
                <div className="space-y-4 text-sm text-gray-600 leading-relaxed">

                  <div className="border-l-2 border-purple-200 pl-4">
                    <p className="font-semibold text-gray-700 text-xs uppercase tracking-wide mb-1">Art. 1 — Objet</p>
                    <p>Location d'un routeur WiFi portable par SAS FENUASIM au Locataire pour usage personnel et non commercial.</p>
                  </div>

                  <div className="border-l-2 border-purple-200 pl-4">
                    <p className="font-semibold text-gray-700 text-xs uppercase tracking-wide mb-1">Art. 2 — Matériel</p>
                    <p><strong>{rental.routers?.model}</strong> — Numéro de série : {rental.routers?.serial_number}</p>
                  </div>

                  <div className="border-l-2 border-purple-200 pl-4">
                    <p className="font-semibold text-gray-700 text-xs uppercase tracking-wide mb-1">Art. 3 — Conditions financières</p>
                    <p>
                      Période : <strong>{fmtDate(rental.rental_start)}</strong> au <strong>{fmtDate(rental.rental_end)}</strong> ({rental.rental_days} nuit{rental.rental_days > 1 ? "s" : ""}).<br />
                      Loyer total : <strong className="text-purple-600">{fmtEur(rental.rental_amount)}</strong><br />
                      Caution : <strong>{fmtEur(rental.deposit_amount)}</strong> — remboursée au retour en bon état.
                    </p>
                  </div>

                  <div className="border-l-2 border-purple-200 pl-4">
                    <p className="font-semibold text-gray-700 text-xs uppercase tracking-wide mb-1">Art. 4 — Obligations du Locataire</p>
                    <p>
                      Le Locataire s'engage à utiliser le routeur avec soin et en bon père de famille, pour un usage strictement personnel. Toute cession ou sous-location est interdite. Le Locataire signalera tout dysfonctionnement à <a href="mailto:hello@fenuasim.com" className="text-purple-600">hello@fenuasim.com</a>.
                    </p>
                  </div>

                  <div className="border-l-2 border-orange-200 pl-4">
                    <p className="font-semibold text-gray-700 text-xs uppercase tracking-wide mb-1">Art. 5 — Responsabilités</p>
                    <p>
                      En cas de <strong>perte, vol ou destruction totale</strong>, le Locataire sera redevable de <strong>8 000 XPF (67 EUR)</strong> correspondant à la caution versée. En cas de dégradation partielle, le montant retenu sera le coût réel de réparation, dans la limite de la caution versée.
                    </p>
                  </div>

                  <div className="border-l-2 border-green-200 pl-4">
                    <p className="font-semibold text-gray-700 text-xs uppercase tracking-wide mb-1">Art. 6 — Restitution</p>
                    <p>
                      Le routeur doit être restitué au plus tard le <strong>{fmtDate(rental.rental_end)}</strong>. La caution sera remboursée dans les <strong>72 heures</strong> après vérification du bon état du matériel. Tout retard supérieur à 24h pourra être facturé au tarif journalier.
                    </p>
                  </div>

                  <div className="border-l-2 border-gray-200 pl-4">
                    <p className="font-semibold text-gray-700 text-xs uppercase tracking-wide mb-1">Art. 7 — Droit applicable</p>
                    <p>Contrat soumis au droit français. Tout litige relève des tribunaux compétents de Paris.</p>
                  </div>
                </div>
              </div>

              {/* Zone signature */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: G }}>
                    <Shield size={13} className="text-white" />
                  </div>
                  <h2 className="text-sm font-bold text-gray-800">Signature électronique</h2>
                </div>

                <div className="mb-4">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Votre nom complet *
                  </label>
                  <input
                    type="text"
                    value={signedName}
                    onChange={e => setSignedName(e.target.value)}
                    placeholder="Ex : Jean Dupont"
                    className="w-full text-sm px-4 py-3 border border-gray-200 rounded-xl text-gray-800 bg-white focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
                  />
                  <p className="text-xs text-gray-400 mt-1.5">
                    Date : {new Date().toLocaleDateString("fr-FR")} — IP enregistrée
                  </p>
                </div>

                <label className="flex items-start gap-3 cursor-pointer mb-5 group">
                  <div className="relative mt-0.5">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={e => setChecked(e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${checked ? "border-purple-500 bg-purple-500" : "border-gray-300 bg-white group-hover:border-purple-300"}`}>
                      {checked && <svg width="12" height="10" viewBox="0 0 12 10" fill="none"><path d="M1 5L4.5 8.5L11 1.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                  </div>
                  <span className="text-sm text-gray-600 leading-relaxed">
                    J'ai lu et j'accepte les conditions du contrat de location ci-dessus. Je comprends que la saisie de mon nom constitue une <strong>signature électronique</strong> ayant valeur légale conformément à l'article 1367 du Code civil.
                  </span>
                </label>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 mb-4">
                    ⚠️ {error}
                  </div>
                )}

                <button
                  onClick={handleSign}
                  disabled={!signedName.trim() || !checked || signing}
                  className="w-full py-4 rounded-2xl text-white font-bold text-base disabled:opacity-40 hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg"
                  style={{ background: G }}
                >
                  {signing
                    ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Enregistrement…</>
                    : "Signer le contrat →"
                  }
                </button>

                <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-400">
                  <Shield size={11} />
                  <span>Signature sécurisée — IP et horodatage enregistrés</span>
                </div>
              </div>

              {/* Contact */}
              <p className="text-center text-xs text-gray-400 pb-4">
                Une question ?{" "}
                <a href="mailto:hello@fenuasim.com" className="text-purple-600 hover:underline">hello@fenuasim.com</a>
                {" "}·{" "}
                <a href="https://www.fenuasim.com" className="hover:underline">fenuasim.com</a>
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
