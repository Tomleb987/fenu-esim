import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";
import { getAiraloToken } from "@/lib/airalo";
import {
  User,
  UserPlus,
  Shield,
  Star,
  ArrowRight,
  Mail,
  Smartphone,
} from "lucide-react";


export default function SuccessPage() {
  const router = useRouter();
  const { session_id } = router.query;
  const [orderStatus, setOrderStatus] = useState<
    "loading" | "success" | "error"
  >("loading");
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [emailStatus, setEmailStatus] = useState<
    "pending" | "sending" | "sent" | "failed"
  >("pending");
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);
  const [showAccountCTA, setShowAccountCTA] = useState(false);
  const [packageData, setPackageData] = useState<any>(null);
  const [sharingLink, setSharingLink] = useState();
  const [sharingLinkCode, setSharingLinkCode] = useState();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const getData = async (iccid: string) => {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/getEsimData?iccid=${iccid}`);
        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch eSIM data');
        }

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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setIsUserLoggedIn(!!user);

      if (!user) {
        setTimeout(() => {
          setShowAccountCTA(true);
        }, 3000);
      }
    };

    checkUserStatus();
  }, []);

  useEffect(() => {
    if (!session_id) return;

    const checkOrderStatus = async () => {
      try {
        // FIRST: Verify payment with Stripe
        // const stripeResponse = await fetch('/api/verify-payment', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({ session_id })
        // });
        
        // const stripeData = await stripeResponse.json();
        // if (!stripeData.paid) {
        //   return setOrderStatus("error");
        // }
    
        // THEN: Check database
        const { data: orderData, error: orderError } = await supabase
          .from("orders")
          .select("*")
          .eq("stripe_session_id", session_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
    
        if (orderError || !orderData) {
          return setOrderStatus("error");
        }
        
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

        setOrderDetails({
          ...orderData,
          esim: esimData || null,
        });
        
        setOrderStatus("success");
      } catch (error) {
        setOrderStatus("error");
      }
    };


    checkOrderStatus();
  }, [session_id]);

  const sendEmail = async () => {
    if (!orderDetails?.esim?.qr_code_url) {
      console.log("No QR code available, skipping email");
      return;
    }

    try {
      setEmailStatus("sending");

      const emailPayload = {
        email: orderDetails.email,
        customerName:
          orderDetails.esim?.nom || orderDetails.esim?.prenom || "Client",
        packageName: orderDetails.package_name,
        destinationName: packageData.region,
        dataUnit: orderDetails.data_unit || "GB",
        validityDays: orderDetails.validity,
        qrCodeUrl: orderDetails.esim.qr_code_url,
        sharingLink: sharingLink,
        sharingLinkCode: sharingLinkCode
      };

      const response = await fetch("/api/send-esim-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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
    if (
      orderStatus === "success" &&
      orderDetails?.esim?.qr_code_url &&
      emailStatus === "pending" &&
      sharingLink && sharingLinkCode
    ) {
      const timer = setTimeout(() => {
        sendEmail();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [orderStatus, orderDetails, emailStatus, sharingLink, sharingLinkCode]);

  const resendEmail = async () => {
    setEmailStatus("pending");
    await sendEmail();
  };

  const handleCreateAccount = () => {
    // Store order email in session storage to pre-fill registration form
    if (orderDetails?.email) {
      sessionStorage.setItem("prefilledEmail", orderDetails.email);
    }
    router.push("/login");
  };

  const handleSignIn = () => {
    router.push("/login");
  };

  if (orderStatus === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-blue-50 to-orange-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold mb-4">
            Traitement de votre commande...
          </h1>
          <p className="text-gray-600">
            Veuillez patienter pendant que nous finalisons votre commande.
          </p>
        </div>
      </div>
    );
  }

  if (orderStatus === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-red-600">Erreur</h1>
          <p className="text-gray-600 mb-4">
            Une erreur est survenue lors du traitement de votre commande.
          </p>
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

  // Check if we have eSIM QR code data
  const hasEsimData = orderDetails?.esim && orderDetails.esim.qr_code_url;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-orange-50 p-4">
      {/* Account Creation CTA Banner */}
      {/* {showAccountCTA && !isUserLoggedIn && (
        <div className="fixed top-4 left-4 right-4 z-50 max-w-4xl mx-auto">
          <div className="bg-gradient-to-r from-purple-600 to-orange-500 text-white p-4 rounded-xl shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <UserPlus className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold">Créez votre compte client</h3>
                  <p className="text-sm opacity-90">Gérez vos eSIM et accédez à des avantages exclusifs</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleCreateAccount}
                  className="bg-white text-purple-600 px-4 py-2 rounded-lg font-medium hover:bg-gray-100 transition-all text-sm"
                >
                  Créer un compte
                </button>
                <button
                  onClick={() => setShowAccountCTA(false)}
                  className="text-white/80 hover:text-white text-xl"
                >
                  ×
                </button>
              </div>
            </div>
          </div>
        </div>
      )} */}

      <div className="max-w-4xl mx-auto pt-8">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-white/20">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              Commande confirmée !
            </h1>
            <p className="text-xl text-gray-600">
              {hasEsimData
                ? "Votre eSIM est prête à être installée"
                : "Votre eSIM est en cours de préparation"}
            </p>

            {/* Email Status Indicator */}
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
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Email envoyé avec succès à {orderDetails.email}
                  </div>
                )}
                {emailStatus === "failed" && (
                  <div className="flex items-center justify-center text-red-600">
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Échec de l'envoi de l'email
                    <button
                      onClick={resendEmail}
                      className="ml-2 text-sm underline hover:no-underline"
                    >
                      Réessayer
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {isLoading && (
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading sharing information...</p>
            </div>
          )}
          
          {error && (
            <div className="text-red-600 bg-red-50 p-4 rounded-lg">
              {error}
            </div>
          )}

          {!isLoading && !error && sharingLink && (
            <div className="flex flex-col items-center bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Gérer votre eSIM
              </h3>
              <p className="text-gray-600 mb-4">
              Cliquez sur ce lien pour suivre votre consommation de données, retrouver votre QR Code à tout moment et gérer votre eSIM.
              </p>
              <div className="bg-gray-50 p-3 rounded-lg mb-3 break-all">
                <a 
                  href={sharingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-600 hover:text-purple-700 font-medium"
                >
                  {sharingLink}
                </a>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <span className="font-medium">Code d'accès:</span>
                <code className="bg-gray-100 px-2 py-1 rounded">{sharingLinkCode}</code>
              </div>
            </div>
          )}

          {orderDetails && (
            <div className="space-y-8">
              {/* Account Creation CTA Card - Inline version */}
              {!isUserLoggedIn && (
                <div className="bg-gradient-to-r from-purple-50 to-orange-50 rounded-2xl p-6 border-2 border-purple-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-orange-500 rounded-xl flex items-center justify-center">
                          <Star className="w-6 h-6 text-white" />
                        </div>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-800 mb-2">
                          Créez votre espace client
                        </h3>
                        <p className="text-gray-600 mb-4">
                          Gérez toutes vos eSIM depuis un seul endroit et
                          profitez d'avantages exclusifs
                        </p>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                          <div className="flex items-center">
                            <Smartphone className="w-4 h-4 mr-2 text-purple-600" />
                            Gérer vos eSIM
                          </div>
                          <div className="flex items-center">
                            <Mail className="w-4 h-4 mr-2 text-purple-600" />
                            Historique des commandes
                          </div>
                          <div className="flex items-center">
                            <Shield className="w-4 h-4 mr-2 text-purple-600" />
                            Support prioritaire
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col space-y-2">
                      <button
                        onClick={handleCreateAccount}
                        className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-orange-500 text-white px-6 py-3 rounded-xl font-semibold hover:from-purple-700 hover:to-orange-600 transition-all duration-200 shadow-lg hover:shadow-xl"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>Créer un compte</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleSignIn}
                        className="text-purple-600 hover:text-purple-800 text-sm font-medium"
                      >
                        Déjà un compte ? Se connecter
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* QR Code Section - Only show if available */}
              {hasEsimData && (
                <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                  <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
                    Votre eSIM est prête
                  </h2>
                  <div className="flex flex-col items-center justify-center">
                    {/* QR Code Image */}
                    <div className="mb-6 p-6 bg-white rounded-2xl shadow-lg border-2 border-dashed border-purple-200">
                      <img
                        src={orderDetails.esim.qr_code_url}
                        alt="eSIM QR Code"
                        className="w-64 h-64 mx-auto"
                        onError={(e) => {
                          console.error("QR Code image failed to load");
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    </div>

                    {/* ICCID Display */}
                    {orderDetails.esim.sim_iccid && (
                      <div className="text-center mb-6">
                        <p className="text-sm text-gray-600 mb-2">
                          Numéro ICCID de votre eSIM :
                        </p>
                        <p className="text-gray-800 font-mono bg-gray-100 p-3 rounded-xl text-sm border">
                          {orderDetails.esim.sim_iccid}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Order Details */}
              <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">
                  Détails de votre commande
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white/80 p-4 rounded-xl">
                    <p className="text-gray-600 text-sm mb-1">Forfait</p>
                    <p className="font-semibold text-gray-800">
                      {orderDetails.package_name ||
                        (orderDetails.airalo_packages &&
                          orderDetails.airalo_packages.name)}
                    </p>
                  </div>
                  <div className="bg-white/80 p-4 rounded-xl">
                    <p className="text-gray-600 text-sm mb-1">Données</p>
                    <p className="font-semibold text-gray-800">
                      {orderDetails.data_amount ||
                        (orderDetails.airalo_packages &&
                          orderDetails.airalo_packages.data_amount)}{" "}
                      {orderDetails.data_unit ||
                        (orderDetails.airalo_packages &&
                          orderDetails.airalo_packages.data_unit) ||
                        "GB"}
                    </p>
                  </div>
                  
                  <div className="bg-white/80 p-4 rounded-xl">
                    <p className="text-gray-600 text-sm mb-1">Email</p>
                    <p className="font-semibold text-gray-800">
                      {orderDetails.email}
                    </p>
                  </div>
                  <div className="bg-white/80 p-4 rounded-xl">
                    <p className="text-gray-600 text-sm mb-1">Statut</p>
                    <p className="font-semibold text-gray-800">
                      {orderDetails.esim?.status === "success"
                        ? "Prêt à l'emploi"
                        : orderDetails.status}
                    </p>
                  </div>
                  <div className="bg-white/80 p-4 rounded-xl">
                    <p className="text-gray-600 text-sm mb-1">
                      Date de commande
                    </p>
                    <p className="font-semibold text-gray-800">
                      {new Date(orderDetails.created_at).toLocaleDateString(
                        "fr-FR",
                        {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        }
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Installation Instructions */}
              <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">
                  Instructions d'installation
                </h2>
                <div className="space-y-4">
                  <div className="flex items-start space-x-4 p-4 bg-white/80 rounded-xl">
                    <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold text-sm">
                      1
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800 mb-1">
                        Scannez le code QR
                      </h3>
                      <p className="text-gray-600 text-sm">
                        Utilisez l'appareil photo de votre téléphone pour
                        scanner le code QR
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4 p-4 bg-white/80 rounded-xl">
                    <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold text-sm">
                      2
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800 mb-1">
                        Suivez les instructions
                      </h3>
                      <p className="text-gray-600 text-sm">
                        Ajoutez l'eSIM à votre appareil en suivant les étapes
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4 p-4 bg-white/80 rounded-xl">
                    <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold text-sm">
                      3
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800 mb-1">
                        Activez l'eSIM
                      </h3>
                      <p className="text-gray-600 text-sm">
                        Sélectionnez "Données cellulaires" dans les paramètres
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4 p-4 bg-white/80 rounded-xl">
                    <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold text-sm">
                      4
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800 mb-1">
                        Activez l'itinérance
                      </h3>
                      <p className="text-gray-600 text-sm">
                        Activez l'itinérance si nécessaire pour utiliser votre
                        forfait
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Support Information */}
              <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">
                  Besoin d'aide ?
                </h2>
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-xl">
                  <p className="mb-4 text-gray-700">
                    Si vous rencontrez des difficultés avec l'installation de
                    votre eSIM, n'hésitez pas à contacter notre support :
                  </p>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-3">
                      <Mail className="w-5 h-5 text-purple-600" />
                      <div>
                        <p className="font-semibold text-gray-800">Email</p>
                        <p className="text-gray-600">
                          sav@fenuasim.com
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <svg
                        className="w-5 h-5 text-purple-600"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                      </svg>
                      <div>
                        <p className="font-semibold text-gray-800">Whatsapp</p>
                        <p className="text-gray-600">+33 7 56 86 08 01</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-6">
                <button
                  onClick={() => router.push("/shop")}
                  className="flex-1 px-6 py-4 bg-gradient-to-r from-purple-600 to-orange-500 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-orange-600 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Retour à la boutique
                </button>

                {/* Email resend button if failed */}
                {emailStatus === "failed" && hasEsimData && (
                  <button
                    onClick={resendEmail}
                    className="flex-1 px-6 py-4 bg-orange-600 text-white font-semibold rounded-xl hover:bg-orange-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    Renvoyer l'email
                  </button>
                )}

                {/* Add download button if QR code is available */}
                {hasEsimData && (
                  <a
                    href={orderDetails.esim.qr_code_url}
                    download="esim-qr-code.png"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 px-6 py-4 bg-gray-700 text-white font-semibold rounded-xl hover:bg-gray-800 transition-all duration-200 text-center shadow-lg hover:shadow-xl"
                  >
                    Télécharger le QR Code
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
