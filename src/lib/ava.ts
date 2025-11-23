// src/lib/ava.ts — Version complète, stable et loguée
//-------------------------------------------------------
//    MODULE AVA POUR FENUASIM
//-------------------------------------------------------

/**
 * Format une date ISO (2025-01-02) → 02/01/2025
 */
function formatDateFR(date: string) {
  if (!date) return "";
  const d = new Date(date);
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
}


//-------------------------------------------------------
//  1. AUTHENTIFICATION AVA
//-------------------------------------------------------
export async function getAvaToken() {
  const endpoint = `${process.env.AVA_URL}/authentification/connexion.php`;

  const formData = new URLSearchParams();
  formData.append("identifiant", process.env.AVA_USERNAME || "");
  formData.append("motdepasse", process.env.AVA_PASSWORD || "");

  console.log("🔵 [AVA] Auth → URL:", endpoint);
  console.log("🔵 [AVA] Auth → Identifiant:", process.env.AVA_USERNAME);

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    });

    const raw = await res.text();
    console.log("🟧 [AVA] Auth → RAW:", raw);

    let data: any;
    try {
      data = JSON.parse(raw);
    } catch {
      console.error("❌ [AVA] Auth → Réponse invalide:", raw);
      return null;
    }

    console.log("🟩 [AVA] Auth → PARSED:", data);

    if
