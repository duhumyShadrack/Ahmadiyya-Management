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
  // In layout.tsx header
<div className="relative">
  <button className="p-2 text-gray-600 hover:text-gray-900">
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
    {/* Badge */}
    <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
      3
    </span>
  </button>
</div>
}
