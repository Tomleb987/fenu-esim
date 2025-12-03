import { ReactNode, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Package, History, Activity, MessageSquare, CreditCard, LogOut, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface NavItem {
  label: string;
  icon: ReactNode;
  href: string;
}

const navItems: NavItem[] = [
  { label: 'Mes forfaits', icon: <Package className="w-5 h-5" />, href: '/dashboard' },
  { label: 'Mes eSIM', icon: <CreditCard className="w-5 h-5" />, href: '/dashboard/my-esims' },
  { label: 'Consommation', icon: <Activity className="w-5 h-5" />, href: '/dashboard/usage' },
  { label: 'Support', icon: <MessageSquare className="w-5 h-5" />, href: '/dashboard/support' },
];

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    };
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation mobile */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <nav className="flex justify-around items-center h-16">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center w-full h-full ${
                router.pathname === item.href
                  ? 'text-purple-600'
                  : 'text-gray-600 hover:text-purple-600'
              }`}
            >
              {item.icon}
              <span className="text-xs mt-1">{item.label}</span>
            </Link>
          ))}
          <button
            onClick={handleLogout}
            className="flex flex-col items-center justify-center w-full h-full text-red-600 hover:text-red-700"
            title="Déconnexion"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-xs mt-1">Déconnexion</span>
          </button>
        </nav>
      </div>

      {/* Navigation desktop */}
      <div className="hidden lg:block fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-purple-600">FENUA SIM</h1>
          {user && (
            <div className="mt-3 text-xs text-gray-500 truncate" title={user.email}>
              {user.email}
            </div>
          )}
        </div>
        <nav className="mt-6 flex-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center px-6 py-3 text-sm ${
                router.pathname === item.href
                  ? 'bg-purple-50 text-purple-600 border-r-4 border-purple-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-purple-600'
              }`}
            >
              {item.icon}
              <span className="ml-3">{item.label}</span>
            </Link>
          ))}
        </nav>
        
        {/* Logout Button */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-6 py-3 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="ml-3">Déconnexion</span>
          </button>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="lg:ml-64 pb-16 lg:pb-0">
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
} 