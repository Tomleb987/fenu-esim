// src/components/dashboard/ReferralBlock.tsx
// Bloc parrainage dans le dashboard client
// Affiche le lien de parrainage unique + explications

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Copy, Gift, Users } from "lucide-react";

export default function ReferralBlock() {
  const [referralLink, setReferralLink] = useState<string | null>(null);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchReferralLink();
  }, []);

  const fetchReferralLink = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch("/api/referral/get-or-create", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setReferralLink(data.link);
        setReferralCode(data.code);
      }
    } catch (err) {
      console.error("[ReferralBlock]", err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/20 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-gray-100 rounded w-2/3"></div>
      </div>
    );
  }

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/20">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-orange-500 rounded-xl flex items-center justify-center">
          <Gift className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">Parrainez vos amis</h3>
          <p className="text-sm text-gray-500">Gagnez 5€ pour chaque ami parrainé</p>
        </div>
      </div>

      {/* Avantages */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-purple-50 rounded-xl p-4 text-center">
          <div className="text-2xl font-extrabold text-purple-600 mb-1">5€</div>
          <div className="text-xs text-gray-600 font-medium">offerts à votre ami</div>
          <div className="text-xs text-gray-400 mt-0.5">sur son 1er achat ≥ 20€</div>
        </div>
        <div className="bg-orange-50 rounded-xl p-4 text-center">
          <div className="text-2xl font-extrabold text-orange-500 mb-1">5€</div>
          <div className="text-xs text-gray-600 font-medium">crédités pour vous</div>
          <div className="text-xs text-gray-400 mt-0.5">après son premier achat</div>
        </div>
      </div>

      {/* Lien de parrainage */}
      {referralLink && (
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700 mb-2">Votre lien personnel :</p>
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
            <span className="text-sm text-gray-600 font-mono flex-1 truncate">
              {referralLink}
            </span>
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-orange-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:opacity-90 transition-all flex-shrink-0"
            >
              <Copy className="w-3.5 h-3.5" />
              {copied ? "Copié !" : "Copier"}
            </button>
          </div>
        </div>
      )}

      {/* Partager */}
      <div className="flex gap-2">
        <a
          href={`https://wa.me/?text=J'utilise%20FENUA%20SIM%20pour%20mes%20eSIM%20de%20voyage%20%F0%9F%8C%BA%20Voici%205%E2%82%AC%20de%20r%C3%A9duction%20pour%20ton%20premier%20achat%20%3A%20${encodeURIComponent(referralLink || "")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold py-2.5 rounded-xl transition-all"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          WhatsApp
        </a>
        <a
          href={`mailto:?subject=5€ offerts sur FENUA SIM&body=Bonjour, je t'offre 5€ de réduction sur ton premier achat d'eSIM de voyage chez FENUA SIM : ${referralLink}`}
          className="flex-1 flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold py-2.5 rounded-xl transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Email
        </a>
      </div>

      {/* Note */}
      <p className="text-xs text-gray-400 mt-3 text-center">
        Votre code : <span className="font-mono font-bold text-purple-600">{referralCode}</span> · Non cumulable avec d'autres offres
      </p>
    </div>
  );
}