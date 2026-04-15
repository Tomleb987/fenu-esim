import { useEffect, useState } from "react";
import { useRouter } from "next/router";

const PARTNER_CODE_KEY = "fenuasim_partner_code";
const PROMO_CODE_KEY   = "fenuasim_promo_code";
const PARTNER_EXPIRY_KEY = "fenuasim_partner_expiry";

const TTL_MS = 24 * 60 * 60 * 1000; // 24 heures

function getStored(key: string): string {
  if (typeof window === "undefined") return "";
  // Vérifie l'expiration
  const expiry = localStorage.getItem(PARTNER_EXPIRY_KEY);
  if (expiry && Date.now() > parseInt(expiry)) {
    // Codes expirés — on nettoie
    localStorage.removeItem(PARTNER_CODE_KEY);
    localStorage.removeItem(PROMO_CODE_KEY);
    localStorage.removeItem(PARTNER_EXPIRY_KEY);
    return "";
  }
  return localStorage.getItem(key) || "";
}

interface UsePartnerCodesReturn {
  partnerCode: string;
  promoCode: string;
  setPartnerCode: (code: string) => void;
  setPromoCode: (code: string) => void;
  isFromPartnerLink: boolean;
}

export function usePartnerCodes(): UsePartnerCodesReturn {
  const router = useRouter();
  const [partnerCode, setPartnerCodeState] = useState("");
  const [promoCode,   setPromoCodeState]   = useState("");
  const [isFromPartnerLink, setIsFromPartnerLink] = useState(false);

  useEffect(() => {
    if (!router.isReady) return;

    const urlRef  = router.query.ref  as string | undefined;
    const urlCode = router.query.code as string | undefined;

    if (urlRef || urlCode) {
      // Nouveau lien partenaire — on stocke avec expiration
      const ref  = urlRef?.trim()  || "";
      const code = urlCode?.trim() || "";

      if (ref) {
        setPartnerCodeState(ref);
        localStorage.setItem(PARTNER_CODE_KEY, ref);
      }
      if (code) {
        setPromoCodeState(code);
        localStorage.setItem(PROMO_CODE_KEY, code);
      }
      // Expiration dans 24h
      localStorage.setItem(PARTNER_EXPIRY_KEY, String(Date.now() + TTL_MS));
      setIsFromPartnerLink(true);

      // Nettoyer l'URL
      const { ref: _ref, code: _code, ...restQuery } = router.query;
      router.replace(
        { pathname: router.pathname, query: restQuery },
        undefined,
        { shallow: true }
      );
    } else {
      // Lire depuis localStorage avec vérification expiration
      const storedPartner = getStored(PARTNER_CODE_KEY);
      const storedPromo   = getStored(PROMO_CODE_KEY);

      if (storedPartner) {
        setPartnerCodeState(storedPartner);
        setIsFromPartnerLink(true);
      }
      if (storedPromo) {
        setPromoCodeState(storedPromo);
      }
    }
  }, [router.isReady]);

  const setPartnerCode = (code: string) => {
    setPartnerCodeState(code);
    if (code) {
      localStorage.setItem(PARTNER_CODE_KEY, code);
      localStorage.setItem(PARTNER_EXPIRY_KEY, String(Date.now() + TTL_MS));
    } else {
      localStorage.removeItem(PARTNER_CODE_KEY);
      localStorage.removeItem(PARTNER_EXPIRY_KEY);
    }
  };

  const setPromoCode = (code: string) => {
    setPromoCodeState(code);
    if (code) {
      localStorage.setItem(PROMO_CODE_KEY, code);
    } else {
      localStorage.removeItem(PROMO_CODE_KEY);
    }
  };

  return { partnerCode, promoCode, setPartnerCode, setPromoCode, isFromPartnerLink };
}