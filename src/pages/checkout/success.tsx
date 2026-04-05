import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";
import { getFrenchRegionName } from "@/lib/regionTranslations";
import {
  UserPlus,
  Shield,
  Mail,
  Smartphone,
  ArrowRight,
  LayoutDashboard,
} from "lucide-react";

export default function SuccessPage() {
  const router = useRouter();
  const { session_id } = router.query;
  const [orderStatus, setOrderStatus] = useState<"loading" | "success" | "error">("loading");
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [emailStatus, setEmailStatus] = useState<"pending" | "sending" | "sent" | "failed">("pending");
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);
  const [packageData, setPackageData] = useState<any>(null);
  const [sharingLink, setSharingLink] = useState<any>();
  const [sharingLinkCode, setSharingLinkCode] = useState<any>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const getData = async (iccid: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/getEsimData?iccid=${iccid}`);
        const result = await response.json();
        if (!result.success) throw new Error(result.error || 'Failed to fetch eSIM data');
        setSharingLink(result.data.sharing.link);
        setSharingLinkCode(result.data.sharing.access_code);
      } catch (error) {
        console.error('Error fetching eSIM data:', error);
        setError('Failed to load sharing information. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    if (orderDetails?.esim?.sim_iccid) {
      getData(orderDetails.esim.sim_iccid);
    }
  }, [orderDetails]);

  useEffect(() => {
    const checkUserStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsUserLoggedIn(!!user);
    };
    checkUserStatus();
  }, []);

  useEffect(() => {
    if (!session_id) return;
    const checkOrderStatus = async () => {
      try {
        const stripeResponse = await fetch('/api/verify-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id })
        });
        const stripeData = await stripeResponse.json();
        if (!stripeData.paid) return setOrderStatus("error");

        const { data: orderData, error: orderError } = await supabase
          .from("orders")
          .select("*")
          .eq("stripe_session_id", session_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (orderError || !orderData) return setOrderStatus("error");

        const { data: esimData, error: esimError } = await supabase
          .from("airalo_orders")
          .select("*")
          .eq("package_id", orderData.package_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const { data: packageData, error: packageError } = await supabase
          .from("airalo_packages")
          .select("*")
          .eq("id", esimData.package_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        setPackageData(packageData);
        if (packageError) throw packageError;
        setOrderDetails({ ...orderData, esim: esimData || null });
        setOrderStatus("success");
      } catch (error) {
        setOrderStatus("error");
      }
    };
    checkOrderStatus();
  }, [session_id]);

  const sendEmail = async () => {
    if (!orderDetails?.esim?.qr_code_url) return;
    try {
      setEmailStatus("sending");
      const packageName = orderDetails.package_name?.toLowerCase() || "";
      const dataUnit = (orderDetails.data_unit || packageData?.data_unit || "").toLowerCase();
      const isUnlimited = packageName.includes("illimité") || packageName.includes("unlimited") ||
        dataUnit.includes("illimité") || dataUnit.includes("unlimited");

      const emailPayload = {
        email: orderDetails.email,
        customerName: (orderDetails.first_name || orderDetails.last_name)
          ? `${orderDetails.first_name || ""} ${orderDetails.last_name || ""}`.trim()
          : (orderDetails.esim?.nom || orderDetails.esim?.prenom
            ? `${orderDetails.esim?.prenom || ""} ${orderDetails.esim?.nom || ""}`.trim()
            : "Client"),
        packageName: orderDetails.package_name,
        destinationName: getFrenchRegionName(packageData?.region_fr, packageData?.region) || "Destination",
        dataAmount: isUnlimited ? "illimité" : (orderDetails.data_amount ? String(orderDetails.data_amount) : (packageData?.data_amount ? String(packageData.data_amount) : "3")),
        dataUnit: isUnlimited ? "" : (orderDetails.data_unit || packageData?.data_unit || "GB"),
        validityDays: orderDetails.validity,
        qrCodeUrl: orderDetails.esim.qr_code_url,
        sharingLink,
        sharingLinkCode,
      };

      const response = await fetch("/api/send-esim-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(emailPayload),
      });
      const result = await response.json();
      if (response.ok) {
        setEmailStatus("sent");
      } else {
        console.error("Email sending failed:", result);
        setEmailStatus("failed");
      }
    } catch (error) {
      console.error("Failed to send email:", error);
      setEmailStatus("failed");
    }
  };

  useEffect(() => {
    if (orderStatus === "success" && orderDetails?.esim?.qr_code_url && emailStatus === "pending" && sharingLink && sharingLinkCode) {
      const timer = setTimeout(() => { sendEmail(); }, 1000);
      return () => clearTimeout(timer);
    }
  }, [orderStatus, orderDetails, emailStatus, sharingLink, sharingLinkCode]);

  const resendEmail = async () => {
    setEmailStatus("pending");
    await sendEmail();
  };

  const handleCreateAccount = () => {
    if (orderDetails?.email) sessionStorage.setItem("prefilledEmail", orderDetails.email);
    router.push("/login");
  };

  if (orderStatus === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-blue-50 to-orange-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold mb-4">Traitement de votre commande...</h1>
          <p className="text-gray-600">Veuillez patienter pendant que nous finalisons votre commande.</p>
        </div>
      </div>
    );
  }

  if (orderStatus === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-red-600">Erreur</h1>
          <p className="text-gray-600 mb-4">Une erreur est survenue lors du traitement de votre commande.</p>
          <button
            onClick={() => router.push("/shop")}
            className="px-6 py-2 bg-gradient-to-r from-purple-600 to-orange-500 text-white rounded-lg hover:opacity-90 transition-all"
          >
            Retour à la boutique
          </button>
        </div>
      </div>
    );
  }

  const hasEsimData = orderDetails?.esim;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-orange-50 p-4">
      <div className="max-w-4xl mx-auto pt-8">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-white/20">

          {/* Header succès */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2">Commande confirmée !</h1>
            <p className="text-xl text-gray-600">
              {hasEsimData ? "Votre eSIM est prête à être installée" : "Votre eSIM est en cours de préparation"}
            </p>

            {/* Statut email */}
            {hasEsimData && (
              <div className="mt-6 p-4 rounded-xl border border-gray-200 bg-gray-50/50">
                {emailStatus === "sending" && (
                  <div className="flex items-center justify-center text-blue-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent mr-2"></div>
                    Envoi de l'email en cours...
                  </div>
                )}
                {emailStatus === "sent" && (
                  <div className="flex items-center justify-center text-green-600">
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Email envoyé à {orderDetails.email}
                  </div>
                )}
                {emailStatus === "failed" && (
                  <div className="flex items-center justify-center text-red-600">
                    Email non envoyé —{" "}
                    <button onClick={resendEmail} className="ml-2 text-sm underline">Réessayer</button>
                  </div>
                )}
              </div>
            )}
          </div>

          {orderDetails && (
            <div className="space-y-6">

              {/* ─── CTA PRINCIPAL : dashboard ou créer compte ─── */}
              {isUserLoggedIn ? (
                <div className="bg-gradient-to-r from-purple-600 to-orange-500 rounded-2xl p-6 text-white">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                      <LayoutDashboard className="w-8 h-8 flex-shrink-0" />
                      <div>
                        <h3 className="text-lg font-bold">Votre eSIM est dans votre espace client</h3>
                        <p className="text-white/80 text-sm">Retrouvez votre QR code, rechargez et suivez votre consommation</p>
                      </div>
                    </div>
                    <button
                      onClick={() => router.push("/dashboard/my-esims")}
                      className="flex items-center gap-2 bg-white text-purple-600 font-semibold px-5 py-2.5 rounded-xl hover:bg-gray-50 transition-colors flex-shrink-0"
                    >
                      Mon espace <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-gradient-to-r from-purple-50 to-orange-50 rounded-2xl p-6 border-2 border-purple-200">
                  <div className="flex items-start justify-between flex-wrap gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
                        <UserPlus className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-800 mb-1">Créez votre espace client</h3>
                        <p className="text-gray-600 text-sm mb-3">Accédez à votre QR code à tout moment, rechargez en un clic, suivez votre consommation.</p>
                        <div className="flex flex-wrap gap-3 text-xs text-gray-600">
                          <span className="flex items-center gap-1"><Smartphone className="w-3.5 h-3.5 text-purple-600" /> QR code disponible 24h/24</span>
                          <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-purple-600" /> Historique des commandes</span>
                          <span className="flex items-center gap-1"><Shield className="w-3.5 h-3.5 text-purple-600" /> Support prioritaire</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={handleCreateAccount}
                      className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-orange-500 text-white font-semibold px-5 py-2.5 rounded-xl hover:from-purple-700 hover:to-orange-600 transition-all flex-shrink-0"
                    >
                      Créer mon compte <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* ─── Détails commande ─── */}
              <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Détails de votre commande</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white/80 p-4 rounded-xl">
                    <p className="text-gray-500 text-sm mb-1">Forfait</p>
                    <p className="font-semibold text-gray-800">{orderDetails.package_name || (orderDetails.airalo_packages && orderDetails.airalo_packages.name)}</p>
                  </div>
                  <div className="bg-white/80 p-4 rounded-xl">
                    <p className="text-gray-500 text-sm mb-1">Données</p>
                    <p className="font-semibold text-gray-800">
                      {orderDetails.data_amount || (orderDetails.airalo_packages && orderDetails.airalo_packages.data_amount)}{" "}
                      {orderDetails.data_unit || (orderDetails.airalo_packages && orderDetails.airalo_packages.data_unit) || "GB"}
                    </p>
                  </div>
                  <div className="bg-white/80 p-4 rounded-xl">
                    <p className="text-gray-500 text-sm mb-1">Email</p>
                    <p className="font-semibold text-gray-800">{orderDetails.email}</p>
                  </div>
                  <div className="bg-white/80 p-4 rounded-xl">
                    <p className="text-gray-500 text-sm mb-1">Date de commande</p>
                    <p className="font-semibold text-gray-800">
                      {new Date(orderDetails.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  </div>
                </div>
              </div>

              {/* ─── Instructions installation ─── */}
              <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Comment installer votre eSIM ?</h2>
                <div className="space-y-3">
                  {[
                    { n: 1, title: "Scannez le code QR", desc: "Utilisez l'appareil photo de votre téléphone pour scanner le QR code reçu par email." },
                    { n: 2, title: "Ajoutez l'eSIM", desc: "Suivez les instructions à l'écran pour ajouter la ligne eSIM à votre téléphone." },
                    { n: 3, title: "Activez à l'arrivée", desc: "À destination, sélectionnez l'eSIM FENUA SIM comme données cellulaires et activez l'itinérance." },
                  ].map((step) => (
                    <div key={step.n} className="flex items-start gap-4 p-4 bg-white/80 rounded-xl">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold text-sm flex-shrink-0">{step.n}</div>
                      <div>
                        <p className="font-semibold text-gray-800 mb-0.5">{step.title}</p>
                        <p className="text-gray-500 text-sm">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ─── Upsell assurance ─── */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-5 border border-blue-100">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <Shield className="w-8 h-8 text-purple-600 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-gray-800">Voyagez l'esprit tranquille</p>
                      <p className="text-sm text-gray-500">Annulation · Rapatriement · Frais médicaux — souscription en 2 minutes</p>
                    </div>
                  </div>
                  <button
                    onClick={() => router.push("/assurance")}
                    className="text-sm font-semibold text-purple-600 border border-purple-300 rounded-xl px-4 py-2 hover:bg-purple-50 transition-colors flex-shrink-0"
                  >
                    Ajouter une assurance →
                  </button>
                </div>
              </div>

              {/* ─── Support ─── */}
              <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-5 border border-white/20">
                <h2 className="text-base font-bold text-gray-800 mb-3">Besoin d'aide ?</h2>
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-purple-600 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-800">Email</p>
                      <p className="text-sm text-gray-500">sav@fenuasim.com</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-purple-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-gray-800">WhatsApp</p>
                      <p className="text-sm text-gray-500">+33 7 49 78 21 01</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ─── Boutons navigation ─── */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                {hasEsimData && (
                  <a
                    href={orderDetails.esim.qr_code_url}
                    download="esim-qr-code.png"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-orange-500 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-orange-600 transition-all text-center"
                  >
                    Télécharger le QR Code
                  </a>
                )}
                {emailStatus === "failed" && hasEsimData && (
                  <button
                    onClick={resendEmail}
                    className="flex-1 px-6 py-3 bg-orange-600 text-white font-semibold rounded-xl hover:bg-orange-700 transition-all"
                  >
                    Renvoyer l'email
                  </button>
                )}
                <button
                  onClick={() => router.push("/shop")}
                  className="px-6 py-3 border border-gray-200 text-gray-600 font-medium rounded-xl hover:bg-gray-50 transition-all text-center"
                >
                  Retour à la boutique
                </button>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}