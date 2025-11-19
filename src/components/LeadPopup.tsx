"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { X } from "lucide-react";

export default function LeadPopup() {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");

  // ⏳ Affiche le popup automatiquement après 8 secondes
  useEffect(() => {
    const timer = setTimeout(() => {
      setOpen(true);
    }, 8000);
    return () => clearTimeout(timer);
  }, []);

  const submitLead = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const { error } = await supabase.from("leads").insert({
      first_name: firstName,
      last_name: lastName,
      email: email,
    });

    if (!error) {
      setSubmitted(true);
      setTimeout(() => setOpen(false), 2000);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative animate-fade-in">

        {/* Bouton close */}
        <button
          onClick={() => setOpen(false)}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X size={22} />
        </button>

        {/* ✔️ Bloc confirmation */}
        {submitted ? (
          <div className="text-center py-8">
            <h2 className="text-2xl font-bold text-purple-700">Merci !</h2>
            <p className="text-gray-600 mt-2">
              Votre code de réduction –5% arrive dans votre email ✉️
            </p>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-purple-700 text-center">
              🎁 Profitez de –5% sur votre première eSIM !
            </h2>

            <p className="text-gray-600 text-center mt-2">
              Inscrivez-vous et recevez immédiatement votre code exclusif.
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
