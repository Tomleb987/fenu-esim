import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";
import { Session } from "@supabase/supabase-js";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import OrdersList from "@/components/dashboard/OrdersList";
import ReferralBlock from "@/components/dashboard/ReferralBlock";

export default function Dashboard() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setIsLoading(false);
    };
    getSession();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => { subscription.unsubscribe(); };
  }, []);

  if (isLoading) return <div>Loading...</div>;
  if (!session) { router.push("/login"); }

  return (
    <>
      {session ? (
        <DashboardLayout>
          <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-900">Tableau de bord</h1>
            <OrdersList />
            <ReferralBlock />
          </div>
        </DashboardLayout>
      ) : <></>}
    </>
  );
}
