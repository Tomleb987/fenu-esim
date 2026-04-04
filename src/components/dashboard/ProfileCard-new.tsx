import { useState } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

interface ProfileCardProps {
  session: Session;
}

export default function ProfileCard({ session }: ProfileCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [displayName, setDisplayName] = useState(
    session.user.user_metadata?.full_name || ""
  );
  const [phone, setPhone] = useState(
    session.user.user_metadata?.phone || ""
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const email = session.user.email || "";
  const initials = displayName
    ? displayName
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : email.slice(0, 2).toUpperCase();

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(false);

    const { error } = await supabase.auth.updateUser({
      data: {
        full_name: displayName,
        phone: phone,
      },
    });

    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
      setIsEditing(false);
      setTimeout(() => setSuccess(false), 3000);
    }

    setIsSaving(false);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-purple-100 flex items-center justify-center text-sm font-medium text-[#D251D8] flex-shrink-0">
            {initials}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">
              {displayName || "—"}
            </p>
            <p className="text-xs text-gray-500">{email}</p>
          </div>
        </div>
        <button
          onClick={() => {
            setIsEditing(!isEditing);
            setError(null);
          }}
          className="text-xs text-[#D251D8] border border-[#D251D8] rounded-md px-3 py-1.5 hover:bg-purple-50 transition-colors"
        >
          {isEditing ? "Annuler" : "Modifier"}
        </button>
      </div>

      {isEditing ? (
        <div className="space-y-3 pt-3 border-t border-gray-100">
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Nom complet
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-transparent"
              placeholder="Prénom Nom"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Téléphone
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-transparent"
              placeholder="+689 87 00 00 00"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full text-sm bg-[#D251D8] text-white rounded-lg py-2 font-medium hover:bg-[#b83fbe] transition-colors disabled:opacity-60"
          >
            {isSaving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      ) : (
        <div className="pt-3 border-t border-gray-100 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Email</span>
            <span className="text-gray-800 font-medium">{email}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Téléphone</span>
            <span className="text-gray-800 font-medium">{phone || "—"}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Membre depuis</span>
            <span className="text-gray-800 font-medium">
              {new Date(session.user.created_at).toLocaleDateString("fr-FR", {
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>
        </div>
      )}

      {success && (
        <p className="mt-3 text-xs text-green-700 bg-green-50 px-3 py-2 rounded-lg">
          Profil mis à jour avec succès
        </p>
      )}
    </div>
  );
}
