"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { X } from "lucide-react";

export default function LeadPopup() {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");

  // Affiche automatiquement le popup après 8 sec
  useEffect(() => {
    const timer = setTimeout(() => {
      setOpen(true);
    }, 8000);
    return () => clearTimeout(timer);
  }, []);

  // Soumission du formulaire
  const submitLead = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);

    console.log("SUBMIT TRIGGERED");

    const { error } = await supabase.from("leads").insert({
      first_name: firstName,
      last_name: lastName,
      email: email,
      source: "popup",       // IMPORTANT
      discount_code: null,
    });

    if (error) {
      console.error("Supabase error:", error);
      setErrorMsg("Une erreur est survenue, merci de réessayer.");
      return;
    }

    setSubmitted(true);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-none" />

      {/* POPUP */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-fade-in pointer-events-auto z-[100000]">

        {/* Bouton X */}
        <button
          onClick={() => setOpen(false)}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X size={22} />
        </button>

        {/* === CONTENU === */}
        {submitted ? (
          /* 🎉 MODE CONFIRMATION */
          <div className="text-center py-8">
            <h2 className="text-2xl font-bold text-purple-700">Merci ! 🎉</h2>

            <p className="text-gray-700 mt-3 text-lg font-semibold">
              Voici votre code de réduction :
            </p>

            {/* Code FIRST */}
            <p className="mt-4 text-3xl font-bold text-green-600 bg-green-100 px-4 py-2 rounded-xl inline-block">
              FIRST
            </p>

            {/* Bouton copier */}
            <button
              onClick={() => {
                navigator.clipboard.writeText("FIRST");
                const btn = document.getElementById("copy-btn");
                if (btn) {
                  btn.innerHTML = "✔ Copié !";
                  setTimeout(() => (btn.innerHTML = "Copier le code"), 1500);
                }
              }}
              id="copy-btn"
              className="mt-4 bg-gradient-to-r from-purple-600 to-orange-500 text-white font-semibold px-5 py-2 rounded-xl shadow hover:opacity-90 transition"
            >
              Copier le code
            </button>

            <p className="text-gray-500 mt-4 text-sm">
              Utilisez-le lors de votre prochain achat sur FENUA SIM.
            </p>
          </div>
        ) : (
          /* 🎯 MODE FORMULAIRE */
          <>
            <h2 className="text-2xl font-bold text-purple-700 text-center">
              🎁 Profitez de –5% sur votre première eSIM !
            </h2>

            <p className="text-gray-600 text-center mt-2">
              Inscrivez-vous pour obtenir votre code exclusif.
            </p>

            <form onSubmit={submitLead} className="mt-6 space-y-4">

              <div>
                <label className="text-sm text-gray-700">Prénom</label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2 mt-1 focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="text-sm text-gray-700">Nom</label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2 mt-1 focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="text-sm text-gray-700">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2 mt-1 focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {errorMsg && (
                <p className="text-sm text-red-500 text-center">{errorMsg}</p>
              )}

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-purple-600 to-orange-500 text-white font-semibold py-3 rounded-xl shadow hover:opacity-90 transition"
              >
                Obtenir mon code –5%
              </button>

            </form>
          </>
        )}
      </div>

      {/* Animation */}
      <style jsx global>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
