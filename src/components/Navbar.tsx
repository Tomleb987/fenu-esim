'use client'

import Link from 'next/link'
import Image from 'next/image'
import { User, Menu, LogOut, ShoppingBag } from 'lucide-react'
import { useCart } from '@/context/CartContext'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import MobileMenu from '@/components/layout/MobileMenu'

export default function Navbar() {
  const { items } = useCart()
  const cartCount = items.reduce((sum, i) => sum + (i.quantity || 1), 0)
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user || null)
    }
    checkUser()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUserMenuOpen(false)
    router.push('/')
    router.reload()
  }

  const userName = user?.user_metadata?.full_name?.split(' ')[0]
    || user?.user_metadata?.first_name
    || user?.email?.split('@')[0]
    || 'Mon espace'

  return (
    <>
      {/* Urgency bar */}
      <div style={{
        background: 'linear-gradient(90deg, #A020F0, #FF7F11)',
        padding: '7px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
      }}>
        <span style={{
          display: 'inline-block',
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: '#fff',
          animation: 'blink 1.2s infinite',
        }} />
        <span style={{ fontSize: '11px', color: '#fff', fontWeight: 700, letterSpacing: '.02em' }}>
          ⚡ Activation instantanée · Livraison immédiate par email · Support WhatsApp 24/7
        </span>
        <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
      </div>

      <header
        className="w-full sticky top-0 z-50 transition-all duration-200"
        style={{
          background: 'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(12px)',
          borderBottom: scrolled ? '0.5px solid #E5E7EB' : '0.5px solid #F3F4F6',
          boxShadow: scrolled ? '0 2px 16px rgba(0,0,0,0.06)' : 'none',
        }}
      >
        <nav className="container mx-auto flex items-center justify-between px-4" style={{ height: '60px' }}>

          {/* Logo */}
          <Link href="/" className="flex items-center" style={{ height: '56px' }}>
            <Image
              src="/logo.png"
              alt="FENUA SIM"
              width={100}
              height={100}
              style={{ transform: 'scale(1.3)', objectFit: 'contain' }}
              priority
            />
          </Link>

          {/* Nav links — desktop, épuré à l'essentiel */}
          <ul className="hidden md:flex items-center gap-6">
            <li>
              <Link
                href="/shop"
                className="text-sm font-semibold transition-colors"
                style={{ color: router.pathname.startsWith('/shop') ? '#A020F0' : '#4B5563' }}
              >
                Nos eSIM
              </Link>
            </li>
            <li>
              <Link
                href="/assurance"
                className="text-sm font-semibold transition-colors"
                style={{ color: router.pathname === '/assurance' ? '#A020F0' : '#4B5563' }}
              >
                Assurance
              </Link>
            </li>
            <li>
              <Link
                href="/fenuasimbox"
                className="text-sm font-semibold"
                style={{ background: 'linear-gradient(90deg,#A020F0,#FF7F11)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
              >
                FENUASIMBOX
              </Link>
            </li>
          </ul>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-3">
            {/* Panier */}
            {cartCount > 0 && (
              <Link href="/checkout" style={{ position: 'relative', display: 'inline-flex' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%',
                  border: '1.5px solid #E5E7EB', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                }}>
                  <ShoppingBag size={16} color="#4B5563" />
                </div>
                <div style={{
                  position: 'absolute', top: '-3px', right: '-3px',
                  width: '16px', height: '16px', borderRadius: '50%',
                  background: 'linear-gradient(90deg,#A020F0,#FF7F11)',
                  border: '2px solid #fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '8px', color: '#fff', fontWeight: 800,
                }}>
                  {cartCount}
                </div>
              </Link>
            )}

            {/* User / Connexion */}
            {user ? (
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    background: 'linear-gradient(90deg,rgba(160,32,240,.08),rgba(255,127,17,.08))',
                    border: '1px solid rgba(160,32,240,.2)',
                    borderRadius: '50px', padding: '6px 14px',
                    fontSize: '12px', fontWeight: 700, color: '#A020F0',
                    cursor: 'pointer',
                  }}
                >
                  <User size={14} />
                  <span className="max-w-[100px] truncate">{userName}</span>
                </button>
                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                    <div className="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">
                      <Link href="/dashboard" onClick={() => setUserMenuOpen(false)} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                        <User size={14} /> Mon dashboard
                      </Link>
                      <hr className="my-1 border-gray-100" />
                      <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 flex items-center gap-2">
                        <LogOut size={14} /> Déconnexion
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Link
                href="/shop"
                style={{
                  background: 'linear-gradient(90deg,#A020F0,#FF7F11)',
                  color: '#fff', padding: '8px 18px',
                  borderRadius: '50px', fontSize: '13px',
                  fontWeight: 700, boxShadow: '0 2px 10px rgba(160,32,240,.3)',
                  whiteSpace: 'nowrap',
                }}
              >
                Trouver mon eSIM →
              </Link>
            )}
          </div>

          {/* Mobile burger */}
          <button onClick={() => setMenuOpen(true)} className="md:hidden p-2">
            <Menu size={24} color="#111827" />
          </button>
        </nav>
      </header>

      <MobileMenu
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        user={user}
        onLogout={handleLogout}
      />
    </>
  )
}
