import { useEffect, useState } from "react";
import { useRouter } from "next/router";

const PARTNER_CODE_KEY = "fenuasim_partner_code";
const PROMO_CODE_KEY = "fenuasim_promo_code";

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
  const [promoCode, setPromoCodeState] = useState("");
  const [isFromPartnerLink, setIsFromPartnerLink] = useState(false);

  useEffect(() => {
    if (!router.isReady) return;

    const urlRef = router.query.ref as string | undefined;
    const urlCode = router.query.code as string | undefined;

    if (urlRef || urlCode) {
      const ref = urlRef?.trim() || "";
      const code = urlCode?.trim() || "";

      if (ref) {
        setPartnerCodeState(ref);
        localStorage.setItem(PARTNER_CODE_KEY, ref);
      }
      if (code) {
        setPromoCodeState(code);
        localStorage.setItem(PROMO_CODE_KEY, code);
      }
      setIsFromPartnerLink(true);

      const { ref: _ref, code: _code, ...restQuery } = router.query;
      router.replace(
        { pathname: router.pathname, query: restQuery },
        undefined,
        { shallow: true }
      );
    } else {
      const storedPartner = localStorage.getItem(PARTNER_CODE_KEY) || "";
      const storedPromo = localStorage.getItem(PROMO_CODE_KEY) || "";
      
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
    } else {
      localStorage.removeItem(PARTNER_CODE_KEY);
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

  return {
    partnerCode,
    promoCode,
    setPartnerCode,
    setPromoCode,
    isFromPartnerLink,
  };
}