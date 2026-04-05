'use client'

import Link from 'next/link'
import Image from 'next/image'
import { User, Menu, X, LogOut, ChevronDown } from 'lucide-react'
import { useCart } from '@/context/CartContext'
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
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user || null)
      setLoading(false)
    }
    checkUser()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
    })
    return () => subscription.unsubscribe()
  }, [])

  // Bloquer le scroll du body quand le menu mobile est ouvert
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

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

  const userName = user?.user_metadata?.full_name?.split(' ')[0] ||
    user?.user_metadata?.first_name ||
    user?.email?.split('@')[0] ||
    'Mon espace'

  return (
    <header className="w-full bg-white/80 backdrop-blur border-b border-gray-100 shadow-sm sticky top-0 z-50">
      <nav className="container mx-auto flex items-center justify-between px-4" style={{ height: '88px' }}>
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

        <ul className="hidden md:flex items-center gap-6 font-medium text-gray-700">
          <li><Link href="/" className="nav-link">Accueil</Link></li>
          <li><Link href="/shop" className="nav-link">Nos eSIM</Link></li>
          <li><Link href="/assurance" className="nav-link">Assurance</Link></li>
          <li>
            <Link href="/fenuasimbox" className={`nav-link font-semibold ${pathname === '/fenuasimbox' ? 'text-purple-600' : ''}`}>
              <span style={{ background: 'linear-gradient(135deg, #A020F0, #FF7F11)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                FENUASIMBOX
              </span>
            </Link>
          </li>
          <li><Link href="/blog" className="nav-link">Blog</Link></li>
          <li><Link href="/compatibilite" className="nav-link">Compatibilité</Link></li>
          <li><Link href="/faq" className="nav-link">FAQ</Link></li>
          <li><Link href="/contact" className="nav-link">Contact</Link></li>
          <li>
            <Link href="/partner/login" className="nav-link text-xs font-semibold px-3 py-1.5 rounded-full border border-purple-200 text-purple-600 hover:bg-purple-50 transition-colors">
              Espace partenaire
            </Link>
          </li>
          {user ? (
            <li className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="nav-link inline-flex items-center gap-2 hover:text-purple-600 transition-colors"
              >
                <User className="inline-block" size={22} />
                <span className="max-w-[120px] truncate">{userName}</span>
                <ChevronDown size={16} className={`transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                    <Link
                      href="/dashboard"
                      onClick={() => setUserMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <User size={16} />
                      Mon dashboard
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

        <div className="md:hidden">
          <button onClick={() => setMenuOpen(true)} className="p-2">
            <Menu size={26} />
          </button>
        </div>
      </nav>

      {/* Menu Mobile — z-[9999] pour passer au dessus de tout (dashboard bar + agent IA) */}
      {menuOpen && (
        <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,backgroundColor:"white",zIndex:99999,overflowY:"auto",WebkitOverflowScrolling:"touch",display:"flex",flexDirection:"column"}}>
          {/* Header du menu */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 flex-shrink-0">
            <Image src="/logo.png" alt="FENUA SIM" width={60} height={60} style={{ objectFit: 'contain' }} />
            <button onClick={() => setMenuOpen(false)} className="p-2">
              <X size={28} />
            </button>
          </div>

          {/* Liens */}
          <div className="flex flex-col px-6 py-4 gap-1 flex-1">
            {[
              { href: '/', label: 'Accueil' },
              { href: '/shop', label: 'Nos eSIM' },
              { href: '/assurance', label: 'Assurance' },
              { href: '/blog', label: 'Blog' },
              { href: '/compatibilite', label: 'Compatibilité' },
              { href: '/faq', label: 'FAQ' },
              { href: '/contact', label: 'Contact' },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="py-3 text-lg font-medium text-gray-800 border-b border-gray-100 hover:text-purple-600 transition-colors"
              >
                {item.label}
              </Link>
            ))}

            <Link
              href="/fenuasimbox"
              onClick={() => setMenuOpen(false)}
              className="py-3 text-lg font-bold border-b border-gray-100"
            >
              <span style={{ background: 'linear-gradient(135deg, #A020F0, #FF7F11)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                FENUASIMBOX
              </span>
            </Link>

            <Link
              href="/partner/login"
              onClick={() => setMenuOpen(false)}
              className="py-3 text-sm font-semibold text-purple-600 border-b border-gray-100"
            >
              Espace partenaire →
            </Link>

            {user ? (
              <>
                <div className="py-3 border-b border-gray-100">
                  <p className="text-xs text-gray-400 mb-1">Connecté</p>
                  <p className="text-sm font-semibold text-gray-800">{user.email}</p>
                </div>
                <Link
                  href="/dashboard"
                  onClick={() => setMenuOpen(false)}
                  className="py-3 text-lg font-medium text-gray-800 border-b border-gray-100 flex items-center gap-2 hover:text-purple-600"
                >
                  <User size={20} />
                  Mon dashboard
                </Link>
                <button
                  onClick={() => { handleLogout(); setMenuOpen(false); }}
                  className="py-3 text-lg font-medium text-red-500 flex items-center gap-2 text-left"
                >
                  <LogOut size={20} />
                  Déconnexion
                </button>
              </>
            ) : (
              <Link
                href="/login"
                onClick={() => setMenuOpen(false)}
                className="py-3 text-lg font-medium text-gray-800 flex items-center gap-2 hover:text-purple-600"
              >
                <User size={20} />
                Connexion
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
