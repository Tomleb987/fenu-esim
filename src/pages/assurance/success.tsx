// src/pages/assurance/success.tsx
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export default function AssuranceSuccessPage() {
  const router = useRouter();
  const { session_id } = router.query;

  const [loading, setLoading] = useState(true);
  const [contract, setContract] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session_id) return;

    const validatePayment = async () => {
      try {
        // 1️⃣ Récupère la session Stripe
        const res = await fetch(`/api/stripe-session?session_id=${session_id}`);
        const data = await res.json();

        if (!data.session || data.session.payment_status !== "paid") {
          throw new Error("Paiement non validé.");
        }

        const adhesionNumber = data.session.metadata.adhesion_number;
        const insuranceId = data.session.metadata.insurance_id;

        // 2️⃣ Mise à jour du statut dans Supabase
        const updateRes = await fetch('/api/insurance/mark-paid', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ insuranceId }),
        });

        if (!updateRes.ok) {
          throw new Error("Erreur lors de la mise à jour de Supabase.");
        }

        setContract({ adhesionNumber });
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    validatePayment();
  }, [session_id]);

  if (loading) return <p className="text-center">⏳ Validation du paiement...</p>;
  if (error) return <p className="text-center text-red-600">❌ {error}</p>;

  return (
    <div className="max-w-lg mx-auto text-center p-6">
      <h1 className="text-2xl font-bold mb-4 text-green-600">✅ Assurance souscrite avec succès !</h1>
      <p>Merci pour votre confiance.</p>
      <p className="mt-2">
        Numéro d’adhésion AVA : <strong>{contract.adhesionNumber}</strong>
      </p>
      <p className="mt-4 text-sm text-gray-500">
        Vous recevrez votre contrat AVA par email.
      </p>
    </div>
  );
}
