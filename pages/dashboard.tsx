// pages/dashboard.tsx
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../utils/supabaseClient';

export default function Dashboard({ session }: { session: any }) {
  const router = useRouter();

  useEffect(() => {
    if (!session) {
      router.replace('/login');
    }
  }, [session, router]);

  if (!session) return null;

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Recent Orders</h2>
          {/* Placeholder – replace with <OrdersTable /> later */}
          <p className="text-gray-500">Loading orders... (implement fetch here)</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <button
              onClick={() => router.push('/orders/new')}
              className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
            >
              New Order
            </button>
            <button
              onClick={() => router.push('/customers/new')}
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
            >
              Add Customer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

Dashboard.getInitialProps = async (ctx) => {
  const { req } = ctx;
  const { data } = await supabase.auth.getSession(); // server-side check if possible
  return { session: data.session };
};
