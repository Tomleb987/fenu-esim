content = open('src/pages/admin/dashboard.tsx').read()

# 1. Ajouter conversations au type activeTab
content = content.replace(
    'useState<"global" | "partenaires" | "bordereaux" | "stock">("global")',
    'useState<"global" | "partenaires" | "bordereaux" | "stock" | "conversations">("global")'
)

# 2. Ajouter onglet dans TABS
content = content.replace(
    '    { key: "stock",       label: "Stock",        icon: Package },\n  ] as const;',
    '    { key: "stock",       label: "Stock",        icon: Package },\n    { key: "conversations", label: "Conversations", icon: MessageCircle },\n  ] as const;'
)

# 3. Ajouter import MessageCircle
content = content.replace(
    'import {\n  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,\n  ResponsiveContainer, PieChart, Pie, Cell,\n} from "recharts";',
    'import {\n  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,\n  ResponsiveContainer, PieChart, Pie, Cell,\n} from "recharts";\nimport { MessageCircle } from "lucide-react";'
)

open('src/pages/admin/dashboard.tsx', 'w').write(content)
print("OK")
