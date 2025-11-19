import { ReactNode } from 'react'
import Navbar from './layout/Navbar'
import Footer from './Footer'
import LeadPopup from '@/components/LeadPopup'  // ✅ AJOUT ICI

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">

      {/* Navigation */}
      <Navbar />

      {/* Pop-up lead -5% */}
      <LeadPopup />   {/* ✅ AJOUT ICI */}

      {/* Contenu principal */}
      <main className="flex-grow pt-16">
        {children}
      </main>

      {/* Pied de page */}
      <Footer />
    </div>
  )
}
