"use client";

import { useEffect, useState } from "react";

type Role = "user" | "assistant";
type Message = {
  role: Role;
  content: string;
};

const QUICK_DESTINATIONS = ["États-Unis", "France", "Japon", "Australie", "Nouvelle-Zélande"];

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "👋 Bonjour ! Je suis votre assistant eSIM. Pour quelle destination souhaitez-vous un forfait ?",
    } as const,
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // Empêche le scroll du fond quand le chat est ouvert (mobile-friendly)
  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isOpen]);

  async function sendMessage(message: string) {
    const newMessages: Message[] = [...messages, { role: "user" as const, content: message }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      const data = await res.json();

      if (typeof data?.reply === "string" && data.reply.length > 0) {
        setMessages([...newMessages, { role: "assistant" as const, content: data.reply }]);
      } else if (data?.plans) {
        // Fallback: si l'API renvoie des plans (cas function_call direct)
        const list = data.plans
          .map(
            (p: any) =>
              `- ${p.name} : ${p.data_amount} Go, ${p.validity} jours, ${p.final_price_eur} €`
          )
          .join("\n");
        setMessages([
          ...newMessages,
          {
            role: "assistant" as const,
            content:
              list?.length > 0
                ? `Voici les forfaits disponibles :\n${list}`
                : "Désolé, aucun forfait trouvé pour cette destination. Pouvez-vous préciser le pays ou la durée ?",
          },
        ]);
      } else {
        setMessages([
          ...newMessages,
          {
            role: "assistant" as const,
            content:
              "⚠️ Désolé, je n’ai pas pu répondre pour le moment. Pourriez-vous préciser votre destination et la durée du séjour ?",
          },
        ]);
      }
    } catch (error) {
      setMessages([
        ...newMessages,
        { role: "assistant" as const, content: "❌ Erreur de connexion au serveur." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {/* Bouton flottant (z-index élevé) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 z-50 bg-purple-600 text-white p-4 rounded-full shadow-lg hover:bg-purple-700 transition"
        aria-label={isOpen ? "Fermer l’assistant" : "Ouvrir l’assistant"}
      >
        💬
      </button>

      {/* Fenêtre du chat */}
      {isOpen && (
        <div className="fixed bottom-[calc(64px+env(safe-area-inset-bottom))] right-4 left-4 sm:left-auto sm:w-96 w-auto z-50 bg-white rounded-xl shadow-xl flex flex-col overflow-hidden border border-purple-200 max-h-[75vh]">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-orange-500 text-white px-4 py-3 flex justify-between items-center">
            <h3 className="font-semibold">Assistant FENUA SIM</h3>
            <button onClick={() => setIsOpen(false)} aria-label="Fermer">✖️</button>
          </div>

          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 text-sm">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`p-3 rounded-lg max-w-[80%] whitespace-pre-wrap ${
                  m.role === "user"
                    ? "ml-auto bg-purple-100 text-purple-900"
                    : "mr-auto bg-gray-100 text-gray-900"
                }`}
              >
                {m.content}
              </div>
            ))}

            {loading && (
              <div className="mr-auto bg-gray-100 text-gray-600 p-3 rounded-lg max-w-[80%]">
                ⏳ Je cherche les meilleurs forfaits pour vous...
              </div>
            )}
          </div>

          {/* Suggestions rapides */}
          <div className="px-3 py-2 border-t border-gray-200 flex flex-wrap gap-2">
            {QUICK_DESTINATIONS.map((dest) => (
              <button
                key={dest}
                onClick={() => sendMessage(dest)}
                className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-full hover:bg-purple-100"
              >
                {dest}
              </button>
            ))}
          </div>

          {/* Input (évite le zoom iOS avec font-size >= 16px) */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (input.trim()) sendMessage(input.trim());
            }}
            className="flex border-t border-gray-200 pb-[env(safe-area-inset-bottom)]"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Écrivez votre message..."
              className="flex-1 p-3 text-[16px] focus:outline-none"
              inputMode="text"
              autoComplete="off"
            />
            <button
              type="submit"
              className="bg-purple-600 text-white px-4 py-2 text-sm font-semibold hover:bg-purple-700"
            >
              Envoyer
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
