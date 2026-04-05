import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  Download,
  QrCode,
  Smartphone,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  Eye,
  Copy,
} from "lucide-react";
import TopUpInlineSection from "../my-esims/topupinlinesection";

interface SupabaseUser {
  id: string;
  email: string;
  email_confirmed_at: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  phone: string;
  user_metadata: any;
  app_metadata: {
    provider: string;
    providers: string[];
  };
}

interface AiraloOrder {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  order_id: string;
  package_id: string;
  sim_iccid: string;
  qr_code_url: string;
  apple_installation_url: string;
  data_balance: string;
  status: string;
  created_at: string;
  activated_at: string | null;
  expires_at: string | null;
  transaction_type: string | null;
}

function getExpiryStatus(expiresAt: string | null): "expired" | "soon" | "ok" | "unknown" {
  if (!expiresAt) return "unknown";
  const now = new Date();
  const expiry = new Date(expiresAt);
  if (expiry < now) return "expired";
  if (expiry < new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)) return "soon";
  return "ok";
}

export default function MyEsims() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [orders, setOrders] = useState<AiraloOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [showQRCode, setShowQRCode] = useState<string | null>(null);
  const [expandedTopUpOrderId, setExpandedTopUpOrderId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user?.email) {
      fetchUserOrders(user.email);
    }
  }, [user]);

  const checkUser = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        router.push("/login");
        return;
      }
      setUser(user as any);
    } catch (error) {
      console.error("Error:", error);
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserOrders = async (email: string) => {
    try {
      setOrdersLoading(true);
      const { data, error } = await supabase
        .from("airalo_orders")
        .select("*")
        .eq("email", email)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching orders:", error);
        return;
      }
      setOrders(data || []);
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setOrdersLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "success":
      case "active":
        return "text-green-600 bg-green-50";
      case "expired":
      case "failed":
        return "text-red-600 bg-red-50";
      case "expiring_soon":
        return "text-orange-600 bg-orange-50";
      case "pending":
        return "text-yellow-600 bg-yellow-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "success":
      case "active":
        return <CheckCircle className="w-4 h-4" />;
      case "expired":
      case "failed":
        return <AlertCircle className="w-4 h-4" />;
      case "expiring_soon":
        return <Clock className="w-4 h-4" />;
      case "pending":
        return <Clock className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case "success": return "Succès";
      case "active": return "Actif";
      case "expired": return "Expiré";
      case "expiring_soon": return "Expire bientôt";
      case "failed": return "Échec";
      case "pending": return "En attente";
      default: return status;
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(key);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("fr-FR");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-orange-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <>
      <div className="px-4 sm:px-0 sm:mx-28 mb-16 space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-2xl font-bold text-gray-900">Mes eSIM</h3>
          <Link
            href="/shop"
            className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-orange-500 text-white px-4 py-2 rounded-xl hover:from-purple-700 hover:to-orange-600 transition-all duration-200"
          >
            <Plus className="w-4 h-4" />
            <span>Acheter eSIM</span>
          </Link>
        </div>

        {ordersLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-purple-500 border-t-transparent"></div>
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-12 border border-white/20 text-center">
            <Smartphone className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h4 className="text-xl font-bold text-gray-900 mb-2">Aucune eSIM trouvée</h4>
            <p className="text-gray-600 mb-6">Vous n'avez pas encore acheté d'eSIM.</p>
            <Link
              href="/shop"
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-orange-500 text-white px-6 py-3 rounded-xl hover:from-purple-700 hover:to-orange-600 transition-all duration-200"
            >
              <Plus className="w-4 h-4" />
              <span>Acheter votre première eSIM</span>
            </Link>
          </div>
        ) : (
          <div className="grid gap-6">
            {orders.map((order) => {
              const expiryStatus = getExpiryStatus(order.expires_at);

              return (
                <div
                  key={order.id}
                  className={`bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-6 border ${
                    expiryStatus === "soon" ? "border-orange-200" : "border-white/20"
                  }`}
                >
                  {/* Bannière expiration imminente */}
                  {expiryStatus === "soon" && (
                    <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-xl px-4 py-2 mb-4 text-sm text-orange-700">
                      <Clock className="w-4 h-4 flex-shrink-0" />
                      <span>Cette eSIM expire le <strong>{formatDate(order.expires_at)}</strong> — pensez à recharger !</span>
                    </div>
                  )}

                  <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-orange-500 rounded-xl flex items-center justify-center">
                        <Smartphone className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-gray-900">{order.nom}</h4>
                        <p className="text-gray-600">Commande #{order.order_id}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 mt-4 lg:mt-0">
                      <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                        {getStatusIcon(order.status)}
                        <span>{getStatusText(order.status)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    <div className="bg-gray-50 p-4 rounded-xl">
                      <div className="text-sm text-gray-600 mb-1">Solde de données</div>
                      <div className="text-xl font-bold text-gray-900">{order.data_balance}</div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-xl">
                      <div className="text-sm text-gray-600 mb-1">Date de création</div>
                      <div className="text-lg font-bold text-gray-900">{formatDate(order.created_at)}</div>
                    </div>
                    <div className={`p-4 rounded-xl ${expiryStatus === "soon" ? "bg-orange-50" : "bg-gray-50"}`}>
                      <div className="text-sm text-gray-600 mb-1">Expire le</div>
                      <div className={`text-lg font-bold ${
                        expiryStatus === "soon" ? "text-orange-600" :
                        expiryStatus === "expired" ? "text-red-600" :
                        "text-gray-900"
                      }`}>
                        {formatDate(order.expires_at)}
                        {expiryStatus === "soon" && (
                          <span className="ml-2 text-xs font-medium bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">
                            Bientôt
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 mb-6">
                    <div>
                      <div className="text-sm text-gray-600 mb-2">ICCID de la SIM</div>
                      <div className="flex items-center space-x-2">
                        <Smartphone className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-900 font-mono text-sm">{order.sim_iccid}</span>
                        <button
                          onClick={() => copyToClipboard(order.sim_iccid, `iccid-${order.id}`)}
                          className="text-purple-600 hover:text-purple-800"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        {copiedId === `iccid-${order.id}` && (
                          <span className="text-xs text-green-600">Copié !</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 mb-2">ID du package</div>
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-900 font-mono text-sm">{order.package_id}</span>
                        <button
                          onClick={() => copyToClipboard(order.package_id, `pkg-${order.id}`)}
                          className="text-purple-600 hover:text-purple-800"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        {copiedId === `pkg-${order.id}` && (
                          <span className="text-xs text-green-600">Copié !</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 items-center sm:gap-0 sm:flex-row">
                    {order.status === "success" && order.qr_code_url && (
                      <div className="flex-1 bg-gradient-to-r from-purple-50 to-orange-50 p-4 rounded-xl">
                        <div className="flex items-center justify-between">
                          <h5 className="font-medium text-gray-900 flex items-center space-x-2">
                            <QrCode className="w-5 h-5" />
                            <span>Code QR d'activation</span>
                          </h5>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => setShowQRCode(showQRCode === order.id ? null : order.id)}
                              className="flex items-center space-x-2 text-purple-600 hover:text-purple-800 text-sm"
                            >
                              <Eye className="w-4 h-4" />
                              <span>{showQRCode === order.id ? "Masquer" : "Afficher"}</span>
                            </button>
                            <a
                              href={order.qr_code_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center space-x-2 text-purple-600 hover:text-purple-800 text-sm"
                            >
                              <Download className="w-4 h-4" />
                              <span>Télécharger</span>
                            </a>
                          </div>
                        </div>

                        {showQRCode === order.id && (
                          <div className="bg-white p-4 rounded-xl border-2 border-dashed border-purple-200">
                            <div className="text-center mb-4">
                              <img
                                src={order.qr_code_url}
                                alt="QR Code"
                                className="w-32 h-32 mx-auto border-2 border-gray-300 rounded-xl"
                              />
                              <p className="text-xs text-gray-500 mt-2">
                                Scannez ce code QR pour installer l'eSIM
                              </p>
                            </div>
                            <div className="bg-gray-50 p-3 rounded-lg">
                              <div className="text-xs text-gray-600 mb-1">URL d'installation Apple:</div>
                              <div className="font-mono text-sm text-gray-900 break-all">
                                {order.apple_installation_url}
                              </div>
                              <button
                                onClick={() => copyToClipboard(order.apple_installation_url, `url-${order.id}`)}
                                className="mt-2 flex items-center space-x-2 text-purple-600 hover:text-purple-800 text-sm"
                              >
                                <Copy className="w-4 h-4" />
                                <span>{copiedId === `url-${order.id}` ? "Copié !" : "Copier l'URL"}</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    <button
                      className="h-10 w-40 sm:flex items-center justify-center space-x-2 bg-gradient-to-r from-orange-500 to-purple-600 text-white px-4 rounded-xl shadow hover:from-orange-600 hover:to-purple-700 transition-all duration-200 font-semibold ml-4"
                      onClick={() => setExpandedTopUpOrderId(expandedTopUpOrderId === order.id ? null : order.id)}
                    >
                      <span>+ Recharger</span>
                    </button>
                  </div>

                  {expandedTopUpOrderId === order.id && (
                    <TopUpInlineSection order={order} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}