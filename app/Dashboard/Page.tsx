'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import OrdersTable from '@/components/OrdersTable';
import CustomerList from '@/components/CustomerList';

export default function Dashboard() {
  const supabase = createClient();

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        // Get user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !mounted) return;
        setUser(user);

        // Get profile & role
        const { data: prof, error: profErr } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profErr) throw profErr;
        setProfile(prof);
        const admin = prof?.role === 'admin' || prof?.role === 'manager';
        setIsAdmin(admin);

        // Get customer's own ID for filtering
        const { data: cust } = await supabase
          .from('customers')
          .select('id')
          .eq('email', user.email ?? '')
          .maybeSingle();

        if (cust?.id) setCustomerId(cust.id);

        // Initial orders fetch
        let query = supabase
          .from('orders')
          .select(`
            id,
            status,
            amount,
            description,
            created_at,
            pickup_address,
            delivery_address,
            customer:customers (
              id, name, phone, address, balance, credit_approved
            ),
            driver_id
          `)
          .order('created_at', { ascending: false });

        if (!admin && cust?.id) {
          query = query.eq('customer_id', cust.id);
        }

        const { data: ords, error: ordErr } = await query;
        if (ordErr) throw ordErr;
        if (mounted) setOrders(ords || []);

        // Admins fetch customers
        if (admin) {
          const { data: custs, error: custErr } = await supabase
            .from('customers')
            .select('id, name, phone, address, balance, credit_approved')
            .order('name');

          if (custErr) throw custErr;
          if (mounted) setCustomers(custs || []);
        }

        // Fetch drivers (for assignment dropdown)
        const { data: drvs, error: drvErr } = await supabase
          .from('profiles')
          .select('id, email')
          .eq('role', 'driver')
          .order('email');

        if (drvErr) throw drvErr;
        if (mounted) setDrivers(drvs || []);

      } catch (err: any) {
        setError(err.message || 'Failed to load dashboard');
        toast.error('Dashboard load error: ' + (err.message || 'Unknown'));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initialize();

    // Realtime subscription
    const channel = supabase
      .channel('public:orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          toast.info(`Order ${payload.eventType}: ${payload.new?.status || 'updated'}`);

          setOrders((prev) => {
            const newList = [...prev];

            if (payload.eventType === 'INSERT') {
              newList.unshift(payload.new);
            } else if (payload.eventType === 'UPDATE') {
              const index = newList.findIndex((o) => o.id === payload.new.id);
              if (index !== -1) newList[index] = payload.new;
            } else if (payload.eventType === 'DELETE') {
              return newList.filter((o) => o.id !== payload.old.id);
            }

            // Re-sort by created_at descending
            return newList.sort(
              (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
          });
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg font-medium">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-600">
        Error: {error}
        <button
          onClick={() => window.location.reload()}
          className="ml-4 px-4 py-2 bg-red-100 rounded hover:bg-red-200"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold text-gray-900">
          {isAdmin ? 'Admin Dashboard' : 'Your Dashboard'}
        </h1>
        <a
          href="/orders/new"
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-md font-medium shadow-sm transition-colors"
        >
          + New Order
        </a>
      </div>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">
          {isAdmin ? 'Live Orders' : 'Your Live Orders'}
        </h2>

        {orders.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-10 text-center text-gray-600">
            {isAdmin ? 'No orders exist yet.' : 'You have no orders yet.'}
          </div>
        ) : (
          <OrdersTable orders={orders} drivers={drivers} isAdmin={isAdmin} />
        )}
      </section>

      {isAdmin && (
        <section>
          <h2 className="text-2xl font-semibold mb-4">Customers</h2>
          {customers.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-10 text-center text-gray-600">
              No customers registered.
            </div>
          ) : (
            <CustomerList customers={customers} isAdmin={true} />
          )}
        </section>
      )}
    </div>
  );
}
