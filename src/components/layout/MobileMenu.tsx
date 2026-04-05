import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import Image from 'next/image'
import { User, LogOut, X } from 'lucide-react'

interface MobileMenuProps {
  isOpen: boolean
  onClose: () => void
  user: any
  onLogout: () => void
}

export default function MobileMenu({ isOpen, onClose, user, onLogout }: MobileMenuProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.width = '100%'
    } else {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
    }
    return () => {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
    }
  }, [isOpen])

  if (!isOpen || typeof document === 'undefined') return null

  return createPortal(
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'white',
      zIndex: 999999,
      display: 'flex',
      flexDirection: 'column',
      overflowY: 'auto'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
        <Image src="/logo.png" alt="FENUA SIM" width={60} height={60} style={{ objectFit: 'contain' }} />
        <button onClick={onClose} style={{ padding: '8px' }}>
          <X size={28} />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', padding: '0 24px', flex: 1 }}>
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
            onClick={onClose}
            style={{ padding: '14px 0', fontSize: '18px', fontWeight: 500, color: '#1f2937', borderBottom: '1px solid #f3f4f6', display: 'block' }}
          >
            {item.label}
          </Link>
        ))}

        <Link
          href="/fenuasimbox"
          onClick={onClose}
          style={{ padding: '14px 0', fontSize: '18px', fontWeight: 700, borderBottom: '1px solid #f3f4f6', display: 'block' }}
        >
          <span style={{ background: 'linear-gradient(135deg, #A020F0, #FF7F11)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            FENUASIMBOX
          </span>
        </Link>

        <Link
          href="/partner/login"
          onClick={onClose}
          style={{ padding: '14px 0', fontSize: '14px', fontWeight: 600, color: '#9333ea', borderBottom: '1px solid #f3f4f6', display: 'block' }}
        >
          Espace partenaire →
        </Link>

        {user ? (
          <>
            <div style={{ padding: '14px 0', borderBottom: '1px solid #f3f4f6' }}>
              <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>Connecté</p>
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#1f2937' }}>{user.email}</p>
            </div>
            <Link
              href="/dashboard"
              onClick={onClose}
              style={{ padding: '14px 0', fontSize: '18px', fontWeight: 500, color: '#1f2937', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <User size={20} />
              Mon dashboard
            </Link>
            <button
              onClick={() => { onLogout(); onClose(); }}
              style={{ padding: '14px 0', fontSize: '18px', fontWeight: 500, color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left' }}
            >
              <LogOut size={20} />
              Déconnexion
            </button>
          </>
        ) : (
          <Link
            href="/login"
            onClick={onClose}
            style={{ padding: '14px 0', fontSize: '18px', fontWeight: 500, color: '#1f2937', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <User size={20} />
            Connexion
          </Link>
        )}
      </div>
    </div>,
    document.body
  )
}
