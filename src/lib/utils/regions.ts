export const REGION_TRANSLATIONS: Record<string, string> = {
  "Discover Global": "Monde",
  "Asia": "Asie",
  "Europe": "Europe",
  "Japan": "Japon",
  "United States": "États-Unis",
  "Australia": "Australie",
  "New Zealand": "Nouvelle-Zélande",
  "Mexico": "Mexique",
  "Fiji": "Fidji",
  "France": "France",
};

export function getFrenchRegionName(
  regionFr: string | null,
  region: string | null
): string {
  if (regionFr?.trim()) {
    const t = regionFr.trim();
    return REGION_TRANSLATIONS[t] ?? t;
  }

  if (region?.trim()) {
    const t = region.trim();
    if (REGION_TRANSLATIONS[t]) return REGION_TRANSLATIONS[t];

    const lower = t.toLowerCase();
    for (const [k, v] of Object.entries(REGION_TRANSLATIONS)) {
      if (k.toLowerCase() === lower) return v;
    }

    return t;
  }

  return "Autres";
}
