'use client'

import Link from 'next/link'
import Image from 'next/image'
import { User, ShoppingCart } from 'lucide-react'
import { useCart } from '@/context/CartContext'

export default function Navbar() {
  const { items } = useCart();
  const cartCount = items.reduce((sum, i) => sum + i.quantity, 0)

  return (
    <header className="w-full bg-white/80 backdrop-blur border-b border-gray-100 shadow-sm sticky top-0 z-50">
      <nav className="container mx-auto flex items-center justify-between px-4" style={{ height: '56px' }}>
        {/* Logo */}
        <Link href="/" className="flex items-center" style={{ height: '48px' }}>
          <div style={{ height: '48px', width: '48px', overflow: 'visible', display: 'flex', alignItems: 'center' }}>
            <Image
              src="https://hptbhujyrhjsquckzckc.supabase.co/storage/v1/object/public/logo//logo%201.PNG"
              alt="FENUA SIM"
              width={80}
              height={80}
              style={{ transform: 'scale(1.3)', objectFit: 'contain' }}
              priority
            />
          </div>
        </Link>

        {/* Liens */}
        <ul className="hidden md:flex items-center gap-6 font-medium text-gray-700">
          <li>
            <Link href="/" className="nav-link">Accueil</Link>
          </li>
          <li>
            <Link href="/shop" className="nav-link">Nos eSIM</Link>
          </li>

          {/* ✅ Nouveau lien Blog */}
          <li>
            <Link href="/blog" className="nav-link">Blog</Link>
          </li>

          <li>
            <Link href="/recharge" className="nav-link">Recharger votre eSIM</Link>
          </li>
          <li>
            <Link href="/contact" className="nav-link">Contactez-nous</Link>
          </li>
          <li>
            <Link href="/about" className="nav-link">À propos</Link>
          </li>
          <li>
            <Link href="/cart" className="relative group nav-link">
              <ShoppingCart className="inline-block" size={22} />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-gradient-to-br from-fenua-purple to-fenua-orange text-white text-xs font-bold rounded-full px-2 py-0.5 shadow-lg border-2 border-white animate-bounce">
                  {cartCount}
                </span>
              )}
            </Link>
          </li>
          <li>
            <Link href="/dashboard" className="nav-link">
              <User className="inline-block" size={22} />
            </Link>
          </li>
        </ul>

        {/* Menu mobile (à améliorer plus tard) */}
        <div className="md:hidden">
          {/* À implémenter : menu burger */}
        </div>
      </nav>
    </header>
  )
}
