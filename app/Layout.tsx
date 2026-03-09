import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';
import { createClient } from '@/utils/supabase/server'; // optional – for server-side auth checks if needed

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Ahmadiyya Management – H Dee Handyman Services Inc',
  description: 'Management dashboard for orders, customers, drivers, and community operations',
  icons: {
    icon: '/favicon.ico',
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Optional: server-side session check (can be used for global auth state if needed)
  // const supabase = createClient();
  // const { data: { session } } = await supabase.auth.getSession();

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased bg-gray-50 min-h-screen`}>
        {/* Global Toaster for notifications */}
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              borderRadius: '8px',
              background: '#333',
              color: '#fff',
            },
          }}
        />

        {/* Optional global header / nav – can be conditional based on auth later */}
        <header className="bg-white border-b shadow-sm sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-bold text-blue-700">
                  Ahmadiyya Management
                </h1>
                <span className="ml-2 text-sm text-gray-500">
                  H Dee Handyman Services Inc
                </span>
              </div>

              {/* Placeholder for auth/user menu */}
              <div className="flex items-center space-x-4">
                {/* You can add conditional Login/Logout/Profile links here */}
              </div>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>

        {/* Optional footer */}
        <footer className="bg-white border-t mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-sm text-gray-500">
            © {new Date().getFullYear()} H Dee Handyman Services Inc. All rights reserved.
          </div>
        </footer>
      </body>
    </html>
  );
}
