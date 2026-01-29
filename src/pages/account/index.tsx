import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  User,
  Mail,
  Phone,
  Globe,
  Calendar,
  Download,
  QrCode,
  Smartphone,
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle,
  Settings,
  LogOut,
  Plus,
  Eye,
  Copy,
  Shield,
  CreditCard,
  Wifi,
} from "lucide-react";

// Type definitions
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

// Updated interface to match your actual data structure
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

export default function Account() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [orders, setOrders] = useState<AiraloOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"profile" | "orders">("profile");
  const [showQRCode, setShowQRCode] = useState<string | null>(null);
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
      let { data: { session }, error } = await supabase.auth.getSession();
      if (!error && session?.user) {
        setUser(session.user as any);
        return;
      }
      const hash = typeof window !== "undefined" ? window.location.hash : "";
      const isMagicLinkCallback = /access_token|type=magiclink/.test(hash);
      if (isMagicLinkCallback) {
        await new Promise((r) => setTimeout(r, 1200));
        const retry = await supabase.auth.getSession();
        session = retry.data.session;
        error = retry.error;
        if (!error && session?.user) {
          setUser(session.user as any);
          return;
        }
      }
      router.push("/login");
    } catch (err) {
      console.error("Error:", err);
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

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      router.push("/");
    } catch (error) {
      console.error("Error signing out:", error);
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
      case "pending":
        return <Clock className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case "success":
        return "Succès";
      case "active":
        return "Actif";
      case "expired":
        return "Expiré";
      case "failed":
        return "Échec";
      case "pending":
        return "En attente";
      default:
        return status;
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Non défini";
    return new Date(dateString).toLocaleDateString("fr-FR");
  };

  const getUserDisplayName = () => {
    if (!user) return "";
    // Try to extract name from email or use email
    const emailName = user.email.split("@")[0];
    return emailName.charAt(0).toUpperCase() + emailName.slice(1);
  };

  const getActiveEsimsCount = () => {
    return orders.filter((order) => 
      order.status.toLowerCase() === "success" || 
      order.status.toLowerCase() === "active"
    ).length;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-orange-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-orange-50">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-sm border-b border-white/20 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Link
                href="/"
                className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-orange-500 bg-clip-text text-transparent"
              >
                FENUA . SIM
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                Bonjour,{" "}
                <span className="font-medium">{getUserDisplayName()}</span>
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center space-x-2 text-gray-600 hover:text-red-600 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm">Déconnexion</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-1/4">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/20">
              {/* Profile Summary */}
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-gradient-to-r from-purple-600 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">
                  {getUserDisplayName()}
                </h2>
                <p className="text-gray-600 text-sm">{user.email}</p>
                {user.email_confirmed_at && (
                  <div className="flex items-center justify-center space-x-1 mt-2">
                    <Shield className="w-4 h-4 text-green-500" />
                    <span className="text-xs text-green-600">
                      Compte vérifié
                    </span>
                  </div>
                )}
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="text-center p-3 bg-purple-50 rounded-xl">
                  <div className="text-xl font-bold text-purple-600">
                    {orders.length}
                  </div>
                  <div className="text-xs text-gray-600">Commandes</div>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded-xl">
                  <div className="text-xl font-bold text-orange-600">
                    {getActiveEsimsCount()}
                  </div>
                  <div className="text-xs text-gray-600">eSIM actives</div>
                </div>
              </div>

              {/* Navigation */}
              <nav className="space-y-2">
                <button
                  onClick={() => setActiveTab("profile")}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left transition-all ${
                    activeTab === "profile"
                      ? "bg-purple-100 text-purple-700 font-medium"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <User className="w-5 h-5" />
                  <span>Profil</span>
                </button>
                <button
                  onClick={() => setActiveTab("orders")}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left transition-all ${
                    activeTab === "orders"
                      ? "bg-purple-100 text-purple-700 font-medium"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <Smartphone className="w-5 h-5" />
                  <span>Mes eSIM</span>
                </button>
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:w-3/4">
            {/* Profile Tab */}
            {activeTab === "profile" && (
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/20">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">
                  Informations du profil
                </h3>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        ID utilisateur
                      </label>
                      <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl">
                        <User className="w-5 h-5 text-gray-400" />
                        <span className="text-gray-900 font-mono text-sm">
                          {user.id}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email
                      </label>
                      <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl">
                        <Mail className="w-5 h-5 text-gray-400" />
                        <span className="text-gray-900">{user.email}</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Téléphone
                      </label>
                      <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl">
                        <Phone className="w-5 h-5 text-gray-400" />
                        <span className="text-gray-900">
                          {user.phone || "Non renseigné"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Fournisseur d'authentification
                      </label>
                      <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl">
                        <Shield className="w-5 h-5 text-gray-400" />
                        <span className="text-gray-900 capitalize">
                          {user.app_metadata.provider}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Membre depuis
                      </label>
                      <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl">
                        <Calendar className="w-5 h-5 text-gray-400" />
                        <span className="text-gray-900">
                          {formatDate(user.created_at)}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Dernière connexion
                      </label>
                      <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl">
                        <Clock className="w-5 h-5 text-gray-400" />
                        <span className="text-gray-900">
                          {user.last_sign_in_at
                            ? formatDate(user.last_sign_in_at)
                            : "Jamais"}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Statut du compte
                      </label>
                      <div
                        className={`flex items-center space-x-3 p-3 rounded-xl ${
                          user.email_confirmed_at
                            ? "bg-green-50"
                            : "bg-yellow-50"
                        }`}
                      >
                        {user.email_confirmed_at ? (
                          <>
                            <CheckCircle className="w-5 h-5 text-green-500" />
                            <span className="text-green-700 font-medium">
                              Vérifié
                            </span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-5 h-5 text-yellow-500" />
                            <span className="text-yellow-700 font-medium">
                              En attente de vérification
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Orders Tab */}
            {activeTab === "orders" && (
              <div className="space-y-6">
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
                    <h4 className="text-xl font-bold text-gray-900 mb-2">
                      Aucune eSIM trouvée
                    </h4>
                    <p className="text-gray-600 mb-6">
                      Vous n'avez pas encore acheté d'eSIM.
                    </p>
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
                    {orders.map((order) => (
                      <div
                        key={order.id}
                        className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/20"
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-4">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-orange-500 rounded-xl flex items-center justify-center">
                              <Smartphone className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <h4 className="text-lg font-bold text-gray-900">
                                {order.nom}
                              </h4>
                              <p className="text-gray-600">
                                Commande #{order.order_id}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 mt-4 lg:mt-0">
                            <div
                              className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}
                            >
                              {getStatusIcon(order.status)}
                              <span>{getStatusText(order.status)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                          <div className="bg-gray-50 p-4 rounded-xl">
                            <div className="text-sm text-gray-600 mb-1">
                              Solde de données
                            </div>
                            <div className="text-xl font-bold text-gray-900">
                              {order.data_balance}
                            </div>
                          </div>
                          <div className="bg-gray-50 p-4 rounded-xl">
                            <div className="text-sm text-gray-600 mb-1">
                              Date de création
                            </div>
                            <div className="text-lg font-bold text-gray-900">
                              {formatDate(order.created_at)}
                            </div>
                          </div>
                          <div className="bg-gray-50 p-4 rounded-xl">
                            <div className="text-sm text-gray-600 mb-1">
                              Date d'activation
                            </div>
                            <div className="text-lg font-bold text-gray-900">
                              {formatDate(order.created_at)}
                            </div>
                          </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4 mb-6">
                          <div>
                            <div className="text-sm text-gray-600 mb-2">
                              ICCID de la SIM
                            </div>
                            <div className="flex items-center space-x-2">
                              <Smartphone className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-900 font-mono text-sm">
                                {order.sim_iccid}
                              </span>
                              <button
                                onClick={() => copyToClipboard(order.sim_iccid)}
                                className="text-purple-600 hover:text-purple-800"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600 mb-2">
                              ID du package
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-gray-900 font-mono text-sm">
                                {order.package_id}
                              </span>
                              <button
                                onClick={() => copyToClipboard(order.package_id)}
                                className="text-purple-600 hover:text-purple-800"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {order.status === "success" && order.qr_code_url && (
                          <div className="bg-gradient-to-r from-purple-50 to-orange-50 p-4 rounded-xl">
                            <div className="flex items-center justify-between mb-3">
                              <h5 className="font-medium text-gray-900 flex items-center space-x-2">
                                <QrCode className="w-5 h-5" />
                                <span>Code QR d'activation</span>
                              </h5>
                              <div className="flex space-x-2">
                                <button
                                  onClick={() =>
                                    setShowQRCode(
                                      showQRCode === order.id ? null : order.id
                                    )
                                  }
                                  className="flex items-center space-x-2 text-purple-600 hover:text-purple-800 text-sm"
                                >
                                  <Eye className="w-4 h-4" />
                                  <span>
                                    {showQRCode === order.id
                                      ? "Masquer"
                                      : "Afficher"}
                                  </span>
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
                                  <div className="text-xs text-gray-600 mb-1">
                                    URL d'installation Apple:
                                  </div>
                                  <div className="font-mono text-sm text-gray-900 break-all">
                                    {order.apple_installation_url}
                                  </div>
                                  <button
                                    onClick={() => copyToClipboard(order.apple_installation_url)}
                                    className="mt-2 flex items-center space-x-2 text-purple-600 hover:text-purple-800 text-sm"
                                  >
                                    <Copy className="w-4 h-4" />
                                    <span>Copier l'URL</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}