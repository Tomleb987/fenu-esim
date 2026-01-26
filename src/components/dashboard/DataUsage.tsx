import { useEffect, useState } from "react";
import { useDataUsage } from "@/hooks/useDataUsage";
import { useSims } from "@/hooks/useSims";
import { Activity, Plus } from "lucide-react";

interface SimCard {
  id: string;
  iccid: string;
  name: string;
  status: string;
}

export default function DataUsage() {
  const {
    usage,
    loading: usageLoading,
    error: usageError,
    fetchUsage,
    formatDataUsage,
    formatRemainingData,
  } = useDataUsage();
  const { sims, loading: simsLoading, error: simsError, fetchSims } = useSims();
  const [selectedSim, setSelectedSim] = useState<SimCard | null>(null);

  useEffect(() => {
    fetchSims();
  }, [fetchSims]);

  useEffect(() => {
    if (selectedSim) {
      console.log(' Selected SIM changed:', selectedSim.iccid);
      fetchUsage(selectedSim.iccid);
    }
  }, [selectedSim, fetchUsage]);

  if (simsLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (simsError) {
    return (
      <div className="flex flex-col h-screen bg-red-50 border border-red-200 rounded-lg p-4 text-red-600">
        <p>Une erreur est survenue lors du chargement des SIMs.</p>
        <p className="text-sm mt-2">{simsError}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Consommation data</h2>
      {/* Sélecteur de SIM */}
      <div className="bg-white shadow rounded-lg p-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Sélectionner une SIM
        </label>
        <div className="relative">
          <select
            value={selectedSim?.iccid || ""}
            onChange={(e) => {
              const sim = sims.find((s) => s.iccid === e.target.value);
              setSelectedSim(sim || null);
            }}
            className="text-gray-700 appearance-none block w-full pl-4 pr-12 py-3 text-base border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors duration-200 ease-in-out hover:border-purple-400"
          >
            <option value="" className="text-gray-500">Choisir une SIM</option>
            {sims.map((sim) => (
              <option key={sim.id} value={sim.iccid} className="text-gray-900">
                {sim.name} {sim.iccid ? `(${sim.iccid.slice(-8)})` : ''}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
            <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      </div>

      {/* Affichage de la consommation */}
      {selectedSim && (
        <div className="bg-white shadow-lg rounded-xl p-8 transition-all duration-300 hover:shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 rounded-full bg-purple-500"></div>
              <h3 className="text-xl font-semibold text-gray-900">
                {selectedSim.name}
              </h3>
            </div>
            <span
              className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors duration-200 ${
                usage?.status === "NOT_ACTIVE"
                ? "bg-gray-100 text-gray-700 ring-1 ring-gray-200"
                : "bg-green-100 text-green-700 ring-1 ring-green-200"
              }`}
            >
              {usage?.status === "NOT_ACTIVE" ? "Inactive" : "Active"}
            </span>
          </div>

          {usage?.status === "NOT_ACTIVE" && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> Cette eSIM n'est pas encore activée. 
                Une fois activée et utilisée, les données de consommation apparaîtront ici.
                Le statut peut prendre quelques minutes à se mettre à jour après activation.
              </p>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 shadow-sm">
              <div className="flex items-center space-x-4">
                <div className="bg-white p-3 rounded-lg shadow-sm">
                  <Activity className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-purple-700 mb-1">
                    Data consommée
                  </p>
                  <p className="text-3xl font-bold text-purple-800">
                    {usageLoading ? (
                      <div className="animate-pulse bg-purple-200 h-8 w-24 rounded"></div>
                    ) : usageError ? (
                      <span className="text-red-500">
                        Erreur: {usageError.message || 'Erreur inconnue'}
                      </span>
                    ) : usage ? (
                      formatDataUsage(usage)
                    ) : (
                      <span className="text-gray-500">Aucune donnée</span>
                    )}
                  </p>
                  {usage && usage.total === usage.remaining && usage.total > 0 && (
                    <p className="text-xs text-purple-600 mt-1">
                      Aucune donnée consommée pour le moment
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-xl p-6 shadow-sm">
              <div className="flex items-center space-x-4">
                <div className="bg-white p-3 rounded-lg shadow-sm">
                  <Activity className="w-6 h-6 text-teal-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-teal-700 mb-1">
                    Données restantes
                  </p>
                  <p className="text-3xl font-bold text-teal-800">
                    {usageLoading ? (
                      <div className="animate-pulse bg-teal-200 h-8 w-24 rounded"></div>
                    ) : usageError ? (
                      <span className="text-red-500">
                        Erreur: {usageError.message || 'Erreur inconnue'}
                      </span>
                    ) : usage ? (
                      formatRemainingData(usage)
                    ) : (
                      <span className="text-gray-500">Aucune donnée</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
