'use client'

import Link from 'next/link'
import Image from 'next/image'
import { User, Menu, LogOut, ShoppingBag, ChevronDown } from 'lucide-react'
import { useCart } from '@/context/CartContext'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import MobileMenu from '@/components/layout/MobileMenu'

export default function Navbar() {
  const { items } = useCart()
  const cartCount = items.reduce((sum, i) => sum + (i.quantity || 1), 0)
  const router = useRouter()
  const pathname = router.pathname
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

  const navLink = (active: boolean) => ({
    fontSize: '14px', fontWeight: 600,
    color: active ? '#A020F0' : '#4B5563',
    textDecoration: 'none', whiteSpace: 'nowrap' as const,
  })

  return (
    <>
      {/* Urgency bar */}
      <div style={{ background: 'linear-gradient(90deg,#A020F0,#FF7F11)', padding: '7px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fff', display: 'inline-block', animation: 'blink 1.2s infinite' }} />
        <span style={{ fontSize: '11px', color: '#fff', fontWeight: 700 }}>
          ⚡ Activation instantanée · Livraison immédiate par email · Support WhatsApp 24/7
        </span>
        <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
      </div>

      <header
        className="w-full sticky top-0 z-50"
        style={{
          background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(12px)',
          borderBottom: scrolled ? '0.5px solid #E5E7EB' : '0.5px solid #F3F4F6',
          boxShadow: scrolled ? '0 2px 16px rgba(0,0,0,0.06)' : 'none',
          transition: 'all .2s',
        }}
      >
        <nav className="container mx-auto flex items-center justify-between px-4" style={{ height: '60px' }}>

          {/* Logo */}
          <Link href="/" className="flex items-center flex-shrink-0" style={{ height: '56px' }}>
            <Image src="/logo.png" alt="FENUA SIM" width={100} height={100}
              style={{ transform: 'scale(1.3)', objectFit: 'contain' }} priority />
          </Link>

          {/* Nav links desktop */}
          <ul className="hidden md:flex items-center gap-6 flex-1 justify-center">
            <li>
              <Link href="/shop" style={{ display: 'inline-block', background: 'linear-gradient(90deg,#A020F0,#FF7F11)', color: '#fff', padding: '8px 18px', borderRadius: '50px', fontSize: '14px', fontWeight: 700, textDecoration: 'none', boxShadow: '0 2px 10px rgba(160,32,240,.25)' }}>
                Trouver mon eSIM →
              </Link>
            </li>
            <li><Link href="/assurance" style={navLink(pathname === '/assurance')}>Assurance voyage</Link></li>
            <li>
              <Link href="/fenuasimbox" style={{ fontSize: '14px', fontWeight: 700, background: 'linear-gradient(90deg,#A020F0,#FF7F11)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textDecoration: 'none' }}>
                FENUASIMBOX
              </Link>
            </li>
            <li><Link href="/blog" style={navLink(pathname === '/blog')}>Blog</Link></li>
            <li><Link href="/faq" style={navLink(pathname === '/faq')}>FAQ</Link></li>
          </ul>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-3 flex-shrink-0">

            {/* Espace partenaire */}
            <Link href="/partner/login" style={{
              fontSize: '13px', fontWeight: 700, color: '#A020F0',
              textDecoration: 'none', padding: '7px 14px', borderRadius: '50px',
              border: '1.5px solid rgba(160,32,240,.25)',
              background: 'rgba(160,32,240,.04)', whiteSpace: 'nowrap',
            }}>
              Espace partenaire
            </Link>

            {/* Panier */}
            {cartCount > 0 && (
              <Link href="/checkout" style={{ position: 'relative', display: 'inline-flex' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '50%', border: '1.5px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShoppingBag size={15} color="#4B5563" />
                </div>
                <div style={{ position: 'absolute', top: '-3px', right: '-3px', width: '16px', height: '16px', borderRadius: '50%', background: 'linear-gradient(90deg,#A020F0,#FF7F11)', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', color: '#fff', fontWeight: 800 }}>
                  {cartCount}
                </div>
              </Link>
            )}

            {/* Connecté → dropdown avec espace client + espace partenaire */}
            {user ? (
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    background: 'linear-gradient(90deg,rgba(160,32,240,.08),rgba(255,127,17,.08))',
                    border: '1px solid rgba(160,32,240,.2)', borderRadius: '50px',
                    padding: '6px 12px', fontSize: '12px', fontWeight: 700,
                    color: '#A020F0', cursor: 'pointer',
                  }}
                >
                  <User size={14} />
                  <span className="max-w-[90px] truncate">{userName}</span>
                  <ChevronDown size={12} style={{ transform: userMenuOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform .2s' }} />
                </button>

                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                    <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', width: '190px', background: '#fff', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,.1)', border: '0.5px solid #E5E7EB', padding: '6px', zIndex: 50 }}>
                      <Link href="/dashboard" onClick={() => setUserMenuOpen(false)}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 12px', fontSize: '13px', fontWeight: 600, color: '#374151', textDecoration: 'none', borderRadius: '8px' }}
                        className="hover:bg-gray-50"
                      >
                        <User size={14} /> Mon espace client
                      </Link>
                      <Link href="/partner/login" onClick={() => setUserMenuOpen(false)}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 12px', fontSize: '13px', fontWeight: 600, color: '#A020F0', textDecoration: 'none', borderRadius: '8px' }}
                        className="hover:bg-purple-50"
                      >
                        Espace partenaire
                      </Link>
                      <div style={{ height: '0.5px', background: '#F3F4F6', margin: '4px 0' }} />
                      <button onClick={handleLogout}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 12px', fontSize: '13px', fontWeight: 600, color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', borderRadius: '8px' }}
                        className="hover:bg-red-50"
                      >
                        <LogOut size={14} /> Déconnexion
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              /* Non connecté */
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Link href="/dashboard" style={{ fontSize: '13px', fontWeight: 600, color: '#6B7280', textDecoration: 'none' }}>
                  Espace client
                </Link>
                <Link href="/shop" style={{
                  background: 'linear-gradient(90deg,#A020F0,#FF7F11)',
                  color: '#fff', padding: '10px 20px', borderRadius: '50px',
                  fontSize: '14px', fontWeight: 700,
                  boxShadow: '0 2px 10px rgba(160,32,240,.3)',
                  whiteSpace: 'nowrap', textDecoration: 'none',
                }}>
                  Trouver mon eSIM →
                </Link>
              </div>
            )}
          </div>

          {/* Mobile burger */}
          <button onClick={() => setMenuOpen(true)} className="md:hidden p-2">
            <Menu size={24} color="#111827" />
          </button>
        </nav>
      </header>

      <MobileMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} user={user} onLogout={handleLogout} />
    </>
  )
}
