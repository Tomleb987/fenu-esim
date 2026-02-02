import { ReactNode } from "react";
import Navbar from "./layout/Navbar";
import Footer from "./Footer";
// import LeadPopup from "./LeadPopup"; // Optionnel : vous pouvez aussi commenter l'import
import ChatWidget from "./ChatWidget"; 

interface LayoutProps {
  children?: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col relative">

      {/* Navigation */}
      <Navbar />

      {/* Popup Lead -5% - DÉSACTIVÉ ICI */}
      {/* <LeadPopup /> */}

      {/* Contenu principal */}
      <main className="flex-grow pt-16">
        {children}
      </main>

      {/* Pied de page */}
      <Footer />

      {/* Intégration du Chatbot */}
      <ChatWidget />
      
    </div>
  );
}
