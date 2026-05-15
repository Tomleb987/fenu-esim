content = open('src/pages/admin/dashboard.tsx').read()

# 1. Ajouter le rendu de l'onglet
content = content.replace(
    '          {activeTab === "stock"       && <VueStock stock={stock} loading={loading} />}',
    '          {activeTab === "stock"       && <VueStock stock={stock} loading={loading} />}\n          {activeTab === "conversations" && <VueConversations />}'
)

# 2. Ajouter le composant VueConversations avant AdminDashboard
old_export = 'export default function AdminDashboard() {'
new_component = '''function VueConversations() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("chat_conversations")
      .select("session_id, zone, created_at, lead_detected")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (!data) return;
        const sessions: Record<string, any> = {};
        data.forEach((r: any) => {
          if (!sessions[r.session_id]) {
            sessions[r.session_id] = {
              session_id: r.session_id,
              zone: r.zone,
              created_at: r.created_at,
              lead_detected: r.lead_detected,
              count: 0,
            };
          }
          sessions[r.session_id].count++;
          if (r.lead_detected) sessions[r.session_id].lead_detected = true;
        });
        setConversations(Object.values(sessions).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        setLoading(false);
      });
  }, []);

  const loadMessages = async (sessionId: string) => {
    setSelected(sessionId);
    const { data } = await supabase
      .from("chat_conversations")
      .select("role, content, created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });
    setMessages(data || []);
  };

  if (loading) return <div className="flex justify-center py-8"><div className="w-7 h-7 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" /></div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-50">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Sessions ({conversations.length})</p>
        </div>
        <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
          {conversations.map((c: any) => (
            <button key={c.session_id} onClick={() => loadMessages(c.session_id)}
              className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${selected === c.session_id ? "bg-purple-50" : ""}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-700">{c.zone || "inconnu"}</span>
                {c.lead_detected && <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-medium">🔥 Lead</span>}
              </div>
              <p className="text-xs text-gray-400">{new Date(c.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
              <p className="text-xs text-gray-400 mt-0.5">{c.count} messages</p>
            </button>
          ))}
        </div>
      </div>

      <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {!selected ? (
          <div className="flex items-center justify-center h-full text-sm text-gray-400 py-20">
            Sélectionne une conversation
          </div>
        ) : (
          <>
            <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Conversation</p>
              <p className="text-xs text-gray-400">{selected}</p>
            </div>
            <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
              {messages.map((m: any, i: number) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${m.role === "user" ? "bg-purple-600 text-white rounded-br-none" : "bg-gray-100 text-gray-800 rounded-bl-none"}`}>
                    <div dangerouslySetInnerHTML={{ __html: m.content.replace(/\n/g, "<br>") }} />
                    <p className={`text-xs mt-1 ${m.role === "user" ? "text-purple-200" : "text-gray-400"}`}>
                      {new Date(m.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function AdminDashboard() {'''

content = content.replace(old_export, new_component)
open('src/pages/admin/dashboard.tsx', 'w').write(content)
print("OK")
