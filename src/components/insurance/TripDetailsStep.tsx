import { useEffect, useState } from "react";
import { InsuranceFormData } from "@/types/insurance";
import { COUNTRIES } from "@/lib/countries";

interface TripDetailsStepProps {
  formData: InsuranceFormData;
  updateFormData: (data: Partial<InsuranceFormData>) => void;
  errors: Record<string, string>;
}

export const TripDetailsStep = ({
  formData,
  updateFormData,
  errors,
}: TripDetailsStepProps) => {
  const [today, setToday] = useState("");

  useEffect(() => {
    // Calcul côté client pour éviter les soucis d'hydratation
    setToday(new Date().toISOString().split("T")[0]);
  }, []);

  // Sécurité si COUNTRIES est mal importé
  const countryList = Array.isArray(COUNTRIES) ? COUNTRIES : [];

  const labelClass =
    "block text-sm font-semibold mb-2 text-gray-700";
  const inputClass =
    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background " +
    "file:border-0 file:bg-transparent file:text-sm file:font-medium " +
    "placeholder:text-muted-foreground focus-visible:outline-none " +
    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 " +
    "disabled:cursor-not-allowed disabled:opacity-50";
  const selectClass =
    "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm " +
    "ring-offset-background placeholder:text-muted-foreground focus:outline-none " +
    "focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed " +
    "disabled:opacity-50 appearance-none";

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Détails de votre voyage
        </h2>
        <p className="text-muted-foreground">
          Commençons par les informations sur votre séjour
        </p>
      </div>

      <div className="space-y-4">
        {/* PAYS RÉSIDENCE*
