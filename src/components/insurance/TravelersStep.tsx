import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InsuranceFormData } from "@/types/insurance";

interface Props {
  formData: InsuranceFormData;
  updateFormData: (data: Partial<InsuranceFormData>) => void;
  errors: Record<string, string>;
}

export const TravelersStep = ({ formData, updateFormData }: Props) => {
  // Ajouter un voyageur avec des champs vides
  const addTraveler = () => {
    updateFormData({
      additionalTravelers: [
        ...formData.additionalTravelers,
        { firstName: "", lastName: "", birthDate: "", parental_link: "13" },
      ],
    });
  };

  // Supprimer un voyageur spécifique
  const removeTraveler = (index: number) => {
    const newTravelers = formData.additionalTravelers.filter(
      (_, i) => i !== index
    );
    updateFormData({ additionalTravelers: newTravelers });
  };

  // Mettre à jour un champ spécifique d'un voyageur
  const updateTraveler = (
    index: number,
    field: "firstName" | "lastName" | "birthDate" | "parental_link",
    value: string
  ) => {
    const newTravelers = [...formData.additionalTravelers];
    newTravelers[index] = { ...newTravelers[index], [field]: value };
    updateFormData({ additionalTravelers: newTravelers });
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">Voyageurs supplémentaires</h2>
        <p className="text-muted-foreground">
          Ajoutez les personnes qui vous accompagnent (conjoint, enfants...)
        </p>
      </div>

      <div className="space-y-4">
        {formData.additionalTravelers.map((traveler, index) => (
          <div
            key={index}
            className="p-4 border rounded-lg bg-gray-50/50 space-y-4 relative transition-all hover:border-primary/30"
          >
            {/* En-tête de la carte Voyageur */}
            <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-200">
              <span className="text-sm font-bold flex items-center text-primary">
                {/* Petit avatar texte à la place de l'icône */}
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full border mr-2 text-xs">
                  {index + 1}
                </span>
                Voyageur {index + 1}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeTraveler(index)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 px-2"
              >
                Supprimer
              </Button>
            </div>

            {/* Ligne 1 : Prénom + Nom + Date de naissance */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase font-semibold text-muted-foreground">
                  Prénom *
                </Label>
                <Input
                  placeholder="Ex: Thomas"
                  value={traveler.firstName}
                  onChange={(e) => updateTraveler(index, "firstName", e.target.value)}
                  className="bg-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase font-semibold text-muted-foreground">
                  Nom *
                </Label>
                <Input
                  placeholder="Ex: Dupuis"
                  value={traveler.lastName}
                  onChange={(e) => updateTraveler(index, "lastName", e.target.value)}
                  className="bg-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase font-semibold text-muted-foreground">
                  Date de naissance *
                </Label>
                <Input
                  type="date"
                  value={traveler.birthDate}
                  onChange={(e) => updateTraveler(index, "birthDate", e.target.value)}
                  className="bg-white"
                />
              </div>
            </div>

            {/* Ligne 2 : Lien de parenté */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              <div className="space-y-2">
                <Label className="text-xs uppercase font-semibold text-muted-foreground">
                  Lien avec l'assuré principal *
                </Label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={traveler.parental_link || "13"}
                  onChange={(e) => updateTraveler(index, "parental_link", e.target.value)}
                >
                  <option value="4">Conjoint(e)</option>
                  <option value="6">Enfant</option>
                  <option value="1">Père / Mère</option>
                  <option value="3">Frère / Sœur</option>
                  <option value="17">Collaborateur / Collègue</option>
                  <option value="21">Autre parenté</option>
                  <option value="13">Sans parenté</option>
                </select>
              </div>
            </div>
          </div>
        ))}

        {/* Message si aucun voyageur */}
        {formData.additionalTravelers.length === 0 && (
          <div className="text-center py-8 border-2 border-dashed rounded-lg text-muted-foreground bg-muted/10">
            <p>Vous voyagez seul ? Cliquez sur &quot;Continuer&quot;.</p>
            <p className="text-sm opacity-70">
              Sinon, ajoutez vos accompagnants ci-dessous.
            </p>
          </div>
        )}

        {/* Bouton d'ajout */}
        <Button
          variant="outline"
          onClick={addTraveler}
          className="w-full border-dashed border-2 py-6 hover:bg-primary/5 hover:border-primary/50 text-primary transition-all"
        >
          + Ajouter un voyageur
        </Button>
      </div>
    </div>
  );
};
