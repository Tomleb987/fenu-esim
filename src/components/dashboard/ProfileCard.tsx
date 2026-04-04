import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function ProfileCard() {
  const [user, setUser] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        const meta = user.user_metadata;
        setDisplayName(meta?.full_name || `${meta?.first_name || ""} ${meta?.last_name || ""}`.trim() || "");
        setPhone(meta?.phone || "");
      }
    };
    loadUser();
  }, []);

  const initials = displayName
    ? displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() || "??";

  const memberSince = user
    ? new Date(user.created_at).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
    : "";

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    const { error } = await supabase.auth.updateUser({
      data: { full_name: displayName, phone },
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

  if (!user) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-purple-100 flex items-center justify-center text-lg font-semibold text-purple-600 flex-shrink-0">
            {initials}
          </div>
          <div>
            <p className="text-base font-semibold text-gray-900">{displayName || "—"}</p>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
        </div>
        <button
          onClick={() => { setIsEditing(!isEditing); setError(null); }}
          className="text-sm text-purple-600 border border-purple-300 rounded-lg px-3 py-1.5 hover:bg-purple-50 transition-colors"
        >
          {isEditing ? "Annuler" : "Modifier"}
        </button>
      </div>

      {isEditing ? (
        <div className="space-y-4 pt-4 border-t border-gray-100">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Nom complet</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Prénom Nom"
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-300 text-gray-800"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Téléphone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+689 87 00 00 00"
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-300 text-gray-800"
            />
          </div>
          {error && (
            <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-orange-500 text-white text-sm font-semibold rounded-xl hover:from-purple-700 hover:to-orange-600 transition-all disabled:opacity-60"
          >
            {isSaving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      ) : (
        <div className="pt-4 border-t border-gray-100 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Email</span>
            <span className="text-gray-800 font-medium">{user.email}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Téléphone</span>
            <span className="text-gray-800 font-medium">{phone || "—"}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Membre depuis</span>
            <span className="text-gray-800 font-medium">{memberSince}</span>
          </div>
        </div>
      )}

      {success && (
        <p className="mt-4 text-xs text-green-700 bg-green-50 px-3 py-2 rounded-lg">
          Profil mis à jour avec succès
        </p>
      )}
    </div>
  );
}
