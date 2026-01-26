"use client"
import { Database } from '@/lib/supabase/config'
import { stripePromise } from '@/lib/stripe/config'
import { Elements } from '@stripe/react-stripe-js'
import { useState } from 'react'
type Package = Database['public']['Tables']['airalo_packages']['Row']

interface CheckoutFormProps {
  pkg: Package 
  email: string
}

function PaymentForm({ pkg, email }: CheckoutFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cartItems: [{
            id: pkg.id,  //Include package ID for webhook processing
            name: pkg.name,
            description: pkg.description,
            final_price_eur: pkg.price_eur
          }],
          customer_email: email,
        }),
      })

      const { sessionId } = await response.json()

      const stripe = await stripePromise
      if (!stripe) throw new Error('Stripe not loaded')

      const { error } = await stripe.redirectToCheckout({
        sessionId,
      })

      if (error) {
        throw error
      }
    } catch (err) {
      setError('Une erreur est survenue. Veuillez réessayer.')
      console.error('Checkout error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 text-red-500 p-4 rounded-lg">
          {error}
        </div>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-gradient-to-r from-fenua-purple to-fenua-coral text-white py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {loading ? 'Chargement...' : 'Payer maintenant'}
      </button>
    </form>
  )
}

export default function CheckoutForm({ pkg, email }: CheckoutFormProps) {
  return (
    <Elements stripe={stripePromise}>
      <PaymentForm pkg={pkg} email={email} />
    </Elements>
  )
} 