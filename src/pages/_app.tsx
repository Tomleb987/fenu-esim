import "@/styles/globals.css";
import type { AppProps } from "next/app";
import type { NextPage } from "next";
import type { ReactElement, ReactNode } from "react";
import Layout from "@/components/Layout";
import { CartProvider } from "@/context/CartContext";
import { supabase } from '@/lib/supabase';
import { useEffect } from "react";
import { useRouter } from "next/router";

type NextPageWithLayout = NextPage & {
  getLayout?: (page: ReactElement) => ReactNode;
}
type AppPropsWithLayout = AppProps & {
  Component: NextPageWithLayout;
}

export default function App({ Component, pageProps }: AppPropsWithLayout) {
  const router = useRouter();

  useEffect(() => {
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        router.push('/reset-password');
      }
    });
    const script = document.createElement("script");
    script.defer = true;
    script.dataset.domain = "fenuasim.com";
    script.dataset.api = "https://plausible.io/api/event";
    script.src = "https://plausible.io/js/script.js";
    document.head.appendChild(script);
  }, [router]);

  useEffect(() => {
    async function fetchMargin() {
      const { data } = await supabase
        .from('config')
        .select('value')
        .eq('key', 'global_margin')
        .single();
      if (data?.value) localStorage.setItem('global_margin', data.value);
    }
    fetchMargin();
  }, []);

  // Pages avec getLayout (ex: admin) → pas de navbar/footer
  if (Component.getLayout) {
    return (
      <CartProvider>
        {Component.getLayout(<Component {...pageProps} />)}
      </CartProvider>
    );
  }

  return (
    <CartProvider>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </CartProvider>
  );
}
