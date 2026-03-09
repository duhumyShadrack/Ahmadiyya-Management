import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';
import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Ahmadiyya Management – Multi-Service Operations Platform',
  description: 'Complete dashboard for managing jobs, customers, team, time tracking, location, fleet maintenance and more. Scalable for delivery, cleaning, repair, and other services.',
  keywords: 'operations dashboard, job management, time clock, driver tracking, fleet maintenance, multi-service platform',
  openGraph: {
    title: 'Ahmadiyya Management',
    description: 'Business operations platform for service-based companies',
    url: 'https://yourdomain.com',
    siteName: 'Ahmadiyya Management',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630 }],
    locale: 'en_US',
    type: 'website',
  },
  icons: {
    icon: '/favicon.ico',
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

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
      <body className={`${inter.className} antialiased bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 min-h-screen flex flex-col`}>
        {/* Header */}
        <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              {/* Brand */}
              <Link href="/" className="flex items-center space-x-2">
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  Ahmadiyya
                </span>
                <span className="text-lg font-medium text-gray-700 dark:text-gray-300">
                  Management
                </span>
              </Link>

              {/* Navigation */}
              <nav className="flex items-center space-x-6">
                {user ? (
                  <>
                    <Link
                      href="/dashboard"
                      className="text-sm font-medium text-gray-700 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 transition-colors"
                    >
                      Dashboard
                    </Link>

                    {/* Notification Bell */}
                    <div className="relative">
                      <button
                        className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 relative transition-colors"
                      >
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                        {/* Placeholder unread count - replace with real data later */}
                        <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                          2
                        </span>
                      </button>
                    </div>

                    {/* User info & logout */}
                    <div className="flex items-center space-x-4">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {profile?.role ? (
                          <span className="capitalize font-medium px-3 py-1 bg-blue-100 dark:bg-blue-900 rounded-full text-xs">
                            {profile.role}
                          </span>
                        ) : profile?.email || 'User'}
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
                  <div className="flex items-center space-x-4">
                    <Link
                      href="/login"
                      className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/signup"
                      className="text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
                    >
                      Sign Up
                    </Link>
                  </div>
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
        <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 py-6 mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-500 dark:text-gray-400">
            © {new Date().getFullYear()} Ahmadiyya Management Platform. All rights reserved.
            <span className="mx-2">•</span>
            Built for service businesses worldwide
          </div>
        </footer>

        {/* Global Toaster */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 5000,
            style: {
              borderRadius: '10px',
              background: '#1f2937',
              color: '#f3f4f6',
              border: '1px solid #374151',
            },
          }}
        />
      </body>
    </html>
  );
}
