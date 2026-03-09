import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';
import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'hAhmadiyya Management',
  description: 'Operations dashboard for orders, customers, drivers, time clock, and team management',
  keywords: 'handyman, management, ahmadiyya, belize, delivery, time clock, location tracking',
  authors: [{ name: 'ahmadiyya_management', url: 'https://versatilehandy.com' }],
  openGraph: {
    title: 'H Dee Handyman Services Inc',
    description: 'Professional management dashboard for operations in Belize',
    url: 'https://yourdomain.com',
    siteName: 'Ahmadiyya Management',
    images: [
      {
        url: '/og-image.jpg', // add this image to public/
        width: 1200,
        height: 630,
        alt: 'H Dee Handyman Services Dashboard',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'H Dee Handyman Services Inc',
    description: 'Operations & team management dashboard',
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile = null;
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('role, email')
      .eq('id', user.id)
      .single();
    profile = data;
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100 min-h-screen flex flex-col`}>
        {/* Header */}
        <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              {/* Logo / Brand */}
              <Link href="/" className="flex items-center space-x-2">
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  H Dee
                </span>
                <span className="text-lg font-medium text-gray-700 dark:text-gray-300">
                  Management
                </span>
              </Link>

              {/* Navigation / Auth */}
              <nav className="flex items-center space-x-6">
                {user ? (
                  <>
                    <Link
                      href="/dashboard"
                      className="text-sm font-medium text-gray-700 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 transition-colors"
                    >
                      Dashboard
                    </Link>

                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {profile?.role ? (
                          <span className="capitalize font-medium">
                            {profile.role}
                          </span>
                        ) : (
                          profile?.email
                        )}
                      </span>

                      <form action="/api/auth/signout" method="post">
                        <button
                          type="submit"
                          className="text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                        >
                          Sign Out
                        </button>
                      </form>
                    </div>
                  </>
                ) : (
                  <Link
                    href="/login"
                    className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                  >
                    Sign In
                  </Link>
                )}
              </nav>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-500 dark:text-gray-400">
            © {new Date().getFullYear()} H Dee Handyman Services Inc. All rights reserved.
            <span className="mx-2">•</span>
            Belize City, Belize
          </div>
        </footer>

        {/* Global Toaster */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 5000,
            style: {
              borderRadius: '10px',
              background: '#333',
              color: '#fff',
            },
          }}
        />
      </body>
    </html>
  );
}
