// src/pages/assurance/success.tsx
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function AssuranceSuccessPage() {
  const router = useRouter();
  const { session_id } = router.query;

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [adhesionNumber, setAdhesionNumber] = useState<string | null>(null);

  useEffect(() => {
    if (!session_id || typeof session_id !== 'string') return;

    async function handleSession() {
      try {
        // 1️⃣ Récupère la session Stripe
        const res = await fetch(`/api/assurance/stripe-session?session_id=${session_id}`);
        const { session } = await res.json();

        if (!session || session.payment_status !== 'paid') {
          setStatus('error');
          return;
        }

        // 2️⃣ Marque comme payé dans Supabase
        const resMark = await fetch(`/api/assurance/mark-paid`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            insurance_id: session.metadata.insurance_id,
            adhesion_number: session.metadata.adhesion_number,
          }),
        });

        const markResult = await resMark.json();
        if (markResult.success) {
          setAdhesionNumber(session.metadata.adhesion_number);
          setStatus('success');
        } else {
          setStatus('error');
        }
      } catch (err) {
        console.error("💥 Erreur success:", err);
        setStatus('error');
      }
    }

    handleSession();
  }, [session_id]);

  if (status === 'loading') return <p>⏳ Vérification du paiement...</p>;
  if (status === 'error') return <p>❌ Une erreur est survenue. Merci de nous contacter.</p>;

  return (
    <div className="max-w-xl mx-auto text-center py-12">
      <h1 className="text-2xl font-bold text-green-600">✅ Paiement confirmé !</h1>
      <p className="mt-4">
        Votre contrat d’assurance AVA est validé. Référence : <strong>{adhesionNumber}</strong>
      </p>
    </div>
  );
}
