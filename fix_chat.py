content = open('src/pages/api/assistant.ts').read()

content = content.replace(
    '  const { messages } = req.body;',
    '  const { messages, sessionId, zone } = req.body;'
)

content = content.replace(
    '  const { systemPrompt } = await import("../../lib/systemPrompt");',
    '''  const { systemPrompt } = await import("../../lib/systemPrompt");

  const lastUserMsg = messages[messages.length - 1];
  if (lastUserMsg?.role === "user" && sessionId) {
    supabase.from("chat_conversations").insert({
      session_id: sessionId,
      role: "user",
      content: lastUserMsg.content,
      zone: zone || null,
    }).then(({ error }) => { if (error) console.error("[chat] save user:", error); });
  }'''
)

content = content.replace(
    '    onFinish: async ({ text }) => { await handleLeadDetection(text); },',
    '''    onFinish: async ({ text }) => {
      await handleLeadDetection(text);
      if (sessionId) {
        supabase.from("chat_conversations").insert({
          session_id: sessionId,
          role: "assistant",
          content: text,
          zone: zone || null,
          lead_detected: text.includes("||LEAD|"),
        }).then(({ error }) => { if (error) console.error("[chat] save assistant:", error); });
      }
    },'''
)

open('src/pages/api/assistant.ts', 'w').write(content)
print("assistant.ts OK")

content = open('src/components/ChatWidget.tsx').read()

content = content.replace(
    '  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({\n    api: "/api/assistant",\n    onError: (err) => console.error("Erreur Chat:", err),',
    '  const sessionId = typeof window !== "undefined" ? (sessionStorage.getItem("chat_session") || (() => { const id = Math.random().toString(36).slice(2); sessionStorage.setItem("chat_session", id); return id; })()) : "";\n  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({\n    api: "/api/assistant",\n    body: { sessionId, zone },\n    onError: (err) => console.error("Erreur Chat:", err),'
)

open('src/components/ChatWidget.tsx', 'w').write(content)
print("ChatWidget.tsx OK")