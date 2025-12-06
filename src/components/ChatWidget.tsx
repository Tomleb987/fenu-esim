"use client";

import { useChat } from "ai/react";
import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot } from "lucide-react";

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false); // État pour la bulle
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: "/api/assistant",
    onError: (err) => console.error("Erreur Chat:", err),
  });

  // 1. DÉCLENCHEMENT AUTOMATIQUE DE LA BULLE
  useEffect(() => {
    // Attend 3 secondes après le chargement de la page
    const timer = setTimeout(() => {
      // Si le chat n'est pas déjà ouvert, on montre la bulle
      if (!isOpen) {
        setShowPrompt(true);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [isOpen]);

  // Scroll automatique
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Fonction pour ouvrir le chat (et cacher la bulle)
  const toggleChat = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setShowPrompt(false); // On cache la bulle dès qu'on ouvre
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end font-sans gap-4">
      
      {/* --- BULLE D'ACCROCHE (PROMPT) --- */}
      {/* Elle s'affiche seulement si showPrompt est vrai ET que le chat est fermé */}
      {showPrompt && !isOpen && (
        <div className="animate-in slide-in-from-bottom-2 fade-in duration-500 max-w-[250px]">
          <div className="bg-white p-4 rounded-2xl rounded-br-none shadow-xl border border-gray-100 relative">
            {/* Bouton pour fermer juste la bulle */}
            <button 
              onClick={(e) => { e.stopPropagation(); setShowPrompt(false); }}
              className="absolute -top-2 -right-2 bg-gray-200 rounded-full p-1 hover:bg-gray-300 transition"
            >
              <X className="w-3 h-3 text-gray-600" />
            </button>
            
            <div className="flex items-start gap-3">
              <div className="bg-purple-100 p-1.5 rounded-full flex-shrink-0">
                <span className="text-xl">👋</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">
                  Ia ora na ! Besoin d'aide pour choisir votre eSIM ?
                </p>
                <button 
                  onClick={toggleChat}
                  className="text-xs text-purple-600 font-bold mt-2 hover:underline"
                >
                  Discuter maintenant →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- FENÊTRE DE CHAT --- */}
      {isOpen && (
        <div className="bg-white w-[350px] h-[500px] rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-300 mb-2">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-orange-500 p-4 flex justify-between items-center text-white">
            <div className="flex items-center gap-2">
              <div className="bg-white/20 p-1.5 rounded-full">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm">Assistant FenuaSIM</h3>
                <p className="text-xs text-white/80">Réponse instantanée</p>
              </div>
            </div>
            <button onClick={toggleChat} className="hover:bg-white/20 p-1 rounded transition">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.length === 0 && (
              <div className="text-center text-gray-500 text-sm mt-10">
                <p>👋 Bonjour !</p>
                <p>Je suis là pour vous aider.</p>
              </div>
            )}
            
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                    m.role === "user"
                      ? "bg-purple-600 text-white rounded-br-none"
                      : "bg-white text-gray-800 border border-gray-100 rounded-bl-none"
                  }`}
                >
                  <div dangerouslySetInnerHTML={{ __html: m.content }} />
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white p-3 rounded-2xl rounded-bl-none shadow-sm border border-gray-100">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-3 bg-white border-t border-gray-100 flex gap-2">
            <input
              className="flex-1 bg-gray-100 text-gray-900 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={input}
              onChange={handleInputChange}
              placeholder="Écrivez votre message..."
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-purple-600 text-white p-2 rounded-full hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      )}

      {/* --- BOUTON PRINCIPAL (ROND) --- */}
      <button
        onClick={toggleChat}
        className="group flex items-center justify-center w-14 h-14 bg-purple-600 text-white rounded-full shadow-lg hover:bg-purple-700 hover:scale-110 transition-all duration-300 relative"
      >
        {/* Badge de notification (point rouge) si la bulle est affichée */}
        {showPrompt && !isOpen && (
          <span className="absolute top-0 right-0 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
          </span>
        )}
        
        {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-7 h-7" />}
      </button>
    </div>
  );
}
