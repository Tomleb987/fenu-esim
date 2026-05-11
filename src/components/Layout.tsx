import { ReactNode } from "react";
import Navbar from "./layout/Navbar";
import Footer from "./Footer";
// import LeadPopup from "./LeadPopup"; // Optionnel : vous pouvez aussi commenter l'import
import ChatWidget from "./ChatWidget";
import { useRouter } from "next/router"; 

interface LayoutProps {
  children?: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const router = useRouter();
  const hideChat = router.pathname.startsWith("/checkout");
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

      {/* Intégration du Chatbot — masqué sur /checkout */}
      {!hideChat && <ChatWidget />}
      
    </div>
  );
}
