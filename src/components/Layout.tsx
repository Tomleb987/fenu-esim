import { ReactNode } from "react";
import Navbar from "./layout/Navbar";
import Footer from "./Footer";
import LeadPopup from "./LeadPopup";
import ChatWidget from "./ChatWidget"; // 1. Import du Widget

interface LayoutProps {
  children?: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col relative">

      {/* Navigation */}
      <Navbar />

      {/* Popup Lead -5% */}
      <LeadPopup />

      {/* Contenu principal */}
      <main className="flex-grow pt-16">
        {children}
      </main>

      {/* Pied de page */}
      <Footer />

      {/* 2. Intégration du Chatbot (il flottera par-dessus tout le reste) */}
      <ChatWidget />
      
    </div>
  );
}
