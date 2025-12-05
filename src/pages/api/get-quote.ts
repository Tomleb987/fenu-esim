export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  try {
    const { quoteData } = req.body;
    console.log("💰 [API] Calcul Tarif AVA...");

    const avaResult = await getAvaPrice(quoteData);

    console.log("[DEBUG] Réponse AVA brute :", avaResult);

    if (!avaResult || avaResult.error) {
      console.error("❌ Erreur Devis:", avaResult);
      return res.status(400).json({ error: "Impossible de calculer le tarif", details: avaResult });
    }

    // Examine toutes les clés de retour
    const price = avaResult.montant_total || avaResult.prime_totale || avaResult.tarif || 0;
    console.log("[DEBUG] Prix extrait :", price);

    return res.status(200).json({ price, currency: "EUR" });

  } catch (error: any) {
    console.error("💥 Erreur Serveur:", error);
    return res.status(500).json({ error: error.message });
  }
}
