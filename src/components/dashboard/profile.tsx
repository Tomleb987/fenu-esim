import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabaseClient';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import ProfileCard from '@/components/dashboard/ProfileCard';

export default function ProfilePage() {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) router.push('/login');
    };
    checkAuth();
  }, [router]);

  return (
    <DashboardLayout>
      <div className="max-w-xl">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">Mon profil</h1>
        <ProfileCard />
      </div>
    </DashboardLayout>
  );
}
