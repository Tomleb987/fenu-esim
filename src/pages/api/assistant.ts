"use client";

import { useState } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const QUICK_DESTINATIONS = ["États-Unis", "France", "Japon", "Australie", "Nouvelle-Zélande"];

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "👋 Bonjour ! Je suis votre assistant eSIM. Pour quelle destination souhaitez-vous un forfait ?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // Envoi message
  async function sendMessage(message: string) {
    const newMessages = [...messages, { role: "user", content: message }];
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
      if (data.reply) {
        setMessages([...newMessages, { role: "assistant", content: data.reply }]);
      } else {
        setMessages([
          ...newMessages,
          { role: "assistant", content: "⚠️ Désolé, je n’ai pas pu répondre. Réessayez plus tard." },
        ]);
      }
    } catch (error) {
      setMessages([
        ...newMessages,
        { role: "assistant", content: "❌ Erreur de connexion au serveur." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {/* Bouton flottant */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 bg-purple-600 text-white p-4 rounded-full shadow-lg hover:bg-purple-700 transition"
      >
        💬
      </button>

      {/* Fenêtre du chat */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 w-80 sm:w-96 bg-white rounded-xl shadow-xl flex flex-col overflow-hidden border border-purple-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-orange-500 text-white px-4 py-3 flex justify-between items-center">
            <h3 className="font-semibold">Assistant FENUA SIM</h3>
            <button onClick={() => setIsOpen(false)}>✖️</button>
          </div>

          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 text-sm">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`p-3 rounded-lg max-w-[80%] ${
                  m.role === "user"
                    ? "ml-auto bg-purple-100 text-purple-900"
                    : "mr-auto bg-gray-100 text-gray-900"
                }`}
              >
                {m.content}
              </div>
            ))}

            {loading && (
              <div className="mr-auto bg-gray-100 text-gray-500 p-3 rounded-lg max-w-[80%]">
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

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (input.trim()) sendMessage(input.trim());
            }}
            className="flex border-t border-gray-200"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Écrivez votre message..."
              className="flex-1 p-2 text-sm focus:outline-none"
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
