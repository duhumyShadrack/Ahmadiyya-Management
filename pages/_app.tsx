// pages/_app.tsx
import type { AppProps } from 'next/app';
import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient'; // adjust path if needed
import '../styles/globals.css';

function MyApp({ Component, pageProps }: AppProps) {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;

  // Redirect logic can be handled per-page or via middleware later
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-600 text-white p-4">
        <div className="container mx-auto flex justify-between">
          <h1 className="text-xl font-bold">Ahmadiyya Management</h1>
          {session && (
            <button
              onClick={() => supabase.auth.signOut()}
              className="bg-red-500 px-4 py-2 rounded hover:bg-red-600"
            >
              Logout
            </button>
          )}
        </div>
      </header>
      <main className="container mx-auto py-8">
        <Component {...pageProps} session={session} />
      </main>
    </div>
  );
}

export default MyApp;
