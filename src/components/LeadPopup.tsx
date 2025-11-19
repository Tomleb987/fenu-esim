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

  // ⏳ Affiche automatiquement après 8 secondes
  useEffect(() => {
    const timer = setTimeout(() => {
      setOpen(true);
    }, 8000);
    return () => clearTimeout(timer);
  }, []);

  // 📩 Soumission du formulaire
  const submitLead = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);

    console.log("SUBMIT TRIGGERED");

    const { error } = await supabase.from("leads").insert({
      first_name: firstName,
      last_name: lastName,
      email: email,
      source: "popup",        // ✅ IMPORTANT pour ta table Supabase
      discount_code: null
    });

    if (error) {
      console.error("Supabase error:", error);
      setErrorMsg("Une erreur est survenue, merci de réessayer dans un instant.");
      return;
    }

    // 👌 Succès
    setSubmitted(true);
    setTimeout(() => setOpen(false), 2000);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center">
      {/* Backdrop flouté */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-none" />

      {/* Bloc popup */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-fade-in pointer-events-auto z-[100000]">
        
        {/* Bouton fermer */}
        <button
          onClick={() => setOpen(false)}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X size={22} />
        </button>

        {/* === MODE CONFIRMATION === */}
        {submitted ? (
          <div className="text-center py-8">
            <h2 className="text-2xl font-bold text-purple-700">Merci !</h2>
            <p className="text-gray-600 mt-2">
              Votre code de réduction –5% arrive dans votre email ✉️
            </p>
          </div>
        ) : (
          <>
            {/* === TITRE === */}
            <h2 className="text-2xl font-bold text-purple-700 text-center">
              🎁 Profitez de –5% sur votre première eSIM !
            </h2>

            <p className="text-gray-600 text-center mt-2">
              Inscrivez-vous et recevez immédiatement votre code exclusif.
            </p>

            {/* === FORMULAIRE === */}
            <form onSubmit={submitLead} className="mt-6 space-y-4"
