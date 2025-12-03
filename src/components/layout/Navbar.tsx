'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ShoppingCart, User, Menu, X, LogOut, ChevronDown } from 'lucide-react'
import { useCart } from '@/context/CartContext'
import LanguageSelector from '@/components/LanguageSelector'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function Navbar() {
  const { items } = useCart();
  const cartCount = items.reduce((sum, i) => sum + (i.quantity || 1), 0)
  const router = useRouter();
  const pathname = router.pathname;
  const [menuOpen, setMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check auth state
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user || null)
      setLoading(false)
    }

    checkUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      setUserMenuOpen(false)
      router.push('/')
      router.reload()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return (
    <header className="w-full bg-white/80 backdrop-blur border-b border-gray-100 shadow-sm sticky top-0 z-50">
      <nav className="container mx-auto flex items-center justify-between px-4" style={{ height: '88px' }}>
        {/* Logo */}
        <Link href="/" className="flex items-center" style={{ height: '80px' }}>
          <div style={{ height: '80px', width: '80px', overflow: 'visible', display: 'flex', alignItems: 'center' }}>
            <Image 
              src="/logo.png" 
              alt="FENUA SIM" 
              width={120} 
              height={120} 
              style={{ transform: 'scale(1.5)', objectFit: 'contain' }} 
              priority={true}
            />
          </div>
        </Link>

        {/* Liens Desktop */}
        <ul className="hidden md:flex items-center gap-6 font-medium text-gray-700">
          <li><Link href="/" className="nav-link">Accueil</Link></li>
          <li><Link href="/shop" className="nav-link">Nos eSIM</Link></li>
          <li><Link href="/compatibilite" className="nav-link">Compatibilité</Link></li>
          <li><Link href="/faq" className="nav-link">FAQ</Link></li>
          <li><Link href="/contact" className="nav-link">Contact</Link></li>
          
          {/* User Menu */}
          {user ? (
            <li className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="nav-link inline-flex items-center gap-2 hover:text-purple-600 transition-colors"
              >
                <User className="inline-block" size={22} />
                <span className="max-w-[120px] truncate">{user.email?.split('@')[0] || 'Mon espace'}</span>
                <ChevronDown size={16} className={`transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {/* Dropdown Menu */}
              {userMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                    <Link
                      href="/dashboard"
                      onClick={() => setUserMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <User size={16} />
                      Mon espace
                    </Link>
                    <Link
                      href="/account"
                      onClick={() => setUserMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <User size={16} />
                      Mon compte
                    </Link>
                    <hr className="my-1 border-gray-200" />
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                    >
                      <LogOut size={16} />
                      Déconnexion
                    </button>
                  </div>
                </>
              )}
            </li>
          ) : (
            <li>
              <Link href="/login" className="nav-link">
                <span className="inline-flex items-center gap-1">
                  <User className="inline-block" size={22} />
                  <span>Connexion</span>
                </span>
              </Link>
            </li>
          )}
        </ul>

        {/* Bouton Menu Mobile */}
        <div className="md:hidden">
          <button onClick={() => setMenuOpen(true)} className="p-2">
            <Menu size={26} />
          </button>
        </div>
      </nav>

      {/* Menu Mobile plein écran */}
      {menuOpen && (
        <div className="fixed inset-0 bg-white z-50 h-screen p-6 pt-24 flex flex-col gap-6 text-gray-800 font-medium text-lg">
          <button onClick={() => setMenuOpen(false)} className="absolute top-6 right-6">
            <X size={28} />
          </button>
          <Link href="/" onClick={() => setMenuOpen(false)}>Accueil</Link>
          <Link href="/shop" onClick={() => setMenuOpen(false)}>Nos eSIM</Link>
          <Link href="/compatibilite" onClick={() => setMenuOpen(false)}>Compatibilité</Link>
          <Link href="/faq" onClick={() => setMenuOpen(false)}>FAQ</Link>
          <Link href="/contact" onClick={() => setMenuOpen(false)}>Contact</Link>
          <Link href="/cart" onClick={() => setMenuOpen(false)}>Panier</Link>
          
          {user ? (
            <>
              <hr className="my-2 border-gray-200" />
              <div className="text-sm text-gray-500 mb-2">
                Connecté en tant que: <br />
                <span className="text-gray-800 font-semibold">{user.email}</span>
              </div>
              <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="flex items-center gap-2">
                <User size={20} />
                Mon espace
              </Link>
              <Link href="/account" onClick={() => setMenuOpen(false)} className="flex items-center gap-2">
                <User size={20} />
                Mon compte
              </Link>
              <button
                onClick={() => {
                  handleLogout()
                  setMenuOpen(false)
                }}
                className="flex items-center gap-2 text-red-600 mt-2"
              >
                <LogOut size={20} />
                Déconnexion
              </button>
            </>
          ) : (
            <Link href="/login" onClick={() => setMenuOpen(false)} className="flex items-center gap-2">
              <User size={20} />
              Connexion
            </Link>
          )}
        </div>
      )}
    </header>
  )
}
