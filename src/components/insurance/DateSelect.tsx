import { useState, useEffect, useMemo } from "react";

interface DateSelectProps {
  value: string; // format YYYY-MM-DD
  onChange: (value: string) => void;
  className?: string;
  minYear?: number;
  maxYear?: number;
}

export function DateSelect({
  value,
  onChange,
  className = "",
  minYear = 1920,
  maxYear = new Date().getFullYear(),
}: DateSelectProps) {
  // État local indépendant de value
  const [day,   setDay]   = useState("");
  const [month, setMonth] = useState("");
  const [year,  setYear]  = useState("");

  // Initialiser depuis value si fourni
  useEffect(() => {
    if (value) {
      const parts = value.split("-");
      setYear(parts[0]  || "");
      setMonth(parts[1] || "");
      setDay(parts[2]   || "");
    }
  }, []); // seulement au montage

  const emit = (d: string, m: string, y: string) => {
    if (d && m && y) {
      onChange(`${y}-${m}-${d.padStart(2, "0")}`);
    }
  };

  const handleDay = (v: string) => {
    setDay(v);
    emit(v, month, year);
  };

  const handleMonth = (v: string) => {
    setMonth(v);
    emit(day, v, year);
  };

  const handleYear = (v: string) => {
    setYear(v);
    emit(day, month, v);
  };

  const days = useMemo(() => Array.from({ length: 31 }, (_, i) => i + 1), []);
  const months = useMemo(() => [
    { value: "01", label: "Janvier" },
    { value: "02", label: "Février" },
    { value: "03", label: "Mars" },
    { value: "04", label: "Avril" },
    { value: "05", label: "Mai" },
    { value: "06", label: "Juin" },
    { value: "07", label: "Juillet" },
    { value: "08", label: "Août" },
    { value: "09", label: "Septembre" },
    { value: "10", label: "Octobre" },
    { value: "11", label: "Novembre" },
    { value: "12", label: "Décembre" },
  ], []);
  const years = useMemo(
    () => Array.from({ length: maxYear - minYear + 1 }, (_, i) => maxYear - i),
    [minYear, maxYear]
  );

  const hasError = className.includes("border-red");
  const baseSelect = `border rounded-md px-2 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${hasError ? "border-red-400" : "border-gray-300"}`;

  return (
    <div className="flex gap-2">
      <select value={day} onChange={(e) => handleDay(e.target.value)} className={`${baseSelect} w-20`}>
        <option value="">Jour</option>
        {days.map((d) => (
          <option key={d} value={String(d).padStart(2, "0")}>{d}</option>
        ))}
      </select>

      <select value={month} onChange={(e) => handleMonth(e.target.value)} className={`${baseSelect} flex-1`}>
        <option value="">Mois</option>
        {months.map((m) => (
          <option key={m.value} value={m.value}>{m.label}</option>
        ))}
      </select>

      <select value={year} onChange={(e) => handleYear(e.target.value)} className={`${baseSelect} w-24`}>
        <option value="">Année</option>
        {years.map((y) => (
          <option key={y} value={String(y)}>{y}</option>
        ))}
      </select>
    </div>
  );
}
