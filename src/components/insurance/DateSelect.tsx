import { useMemo } from "react";

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
  const [year, month, day] = value ? value.split("-") : ["", "", ""];

  const days = useMemo(() => Array.from({ length: 31 }, (_, i) => i + 1), []);
  const months = useMemo(
    () => [
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
    ],
    []
  );
  const years = useMemo(
    () => Array.from({ length: maxYear - minYear + 1 }, (_, i) => maxYear - i),
    [minYear, maxYear]
  );

  const update = (d: string, m: string, y: string) => {
    if (d && m && y) {
      onChange(`${y}-${m}-${d.padStart(2, "0")}`);
    } else {
      onChange("");
    }
  };

  const selectClass = `border border-gray-300 rounded-md px-2 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${className}`;

  return (
    <div className="flex gap-2">
      {/* Jour */}
      <select
        value={day || ""}
        onChange={(e) => update(e.target.value, month, year)}
        className={`${selectClass} w-20`}
      >
        <option value="">Jour</option>
        {days.map((d) => (
          <option key={d} value={String(d).padStart(2, "0")}>
            {d}
          </option>
        ))}
      </select>

      {/* Mois */}
      <select
        value={month || ""}
        onChange={(e) => update(day, e.target.value, year)}
        className={`${selectClass} flex-1`}
      >
        <option value="">Mois</option>
        {months.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </select>

      {/* Année */}
      <select
        value={year || ""}
        onChange={(e) => update(day, month, e.target.value)}
        className={`${selectClass} w-24`}
      >
        <option value="">Année</option>
        {years.map((y) => (
          <option key={y} value={String(y)}>
            {y}
          </option>
        ))}
      </select>
    </div>
  );
}
