'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import OrdersTable from '@/components/OrdersTable';
import CustomerList from '@/components/CustomerList';

export default function Dashboard() {
  const supabase = createClient();
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDriver, setIsDriver] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        // Get authenticated user
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser || !isMounted) return;
        setUser(authUser);

        // Get profile & determine role
        const { data: prof } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', authUser.id)
          .single();

        if (prof) {
          setProfile(prof);
          const admin = prof.role === 'admin' || prof.role === 'manager';
          const driver = prof.role === 'driver';
          setIsAdmin(admin);
          setIsDriver(driver);
        }

        // Get customer's ID for filtering orders
        const { data: cust } = await supabase
          .from('customers')
          .select('id')
          .eq('email', authUser.email ?? '')
          .maybeSingle();

        if (cust?.id) setCustomerId(cust.id);

        // Initial orders fetch
        let ordQuery = supabase
          .from('orders')
          .select(`
            id, status, amount, description, created_at, pickup_address, delivery_address,
            customer:customers (id, name, phone, address, balance, credit_approved),
            driver_id
          `)
          .order('created_at', { ascending: false });

        if (!isAdmin && cust?.id) {
          ordQuery = ordQuery.eq('customer_id', cust.id);
        }

        const { data: ords } = await ordQuery;
        if (isMounted) setOrders(ords || []);

        // Admins get full customer list
        if (isAdmin) {
          const { data: custs } = await supabase
            .from('customers')
            .select('id, name, phone, address, balance, credit_approved')
            .order('name');
          if (isMounted) setCustomers(custs || []);
        }

        // Fetch drivers for assignment dropdown (useful for admins)
        const { data: drvs } = await supabase
          .from('profiles')
          .select('id, email')
          .eq('role', 'driver')
          .order('email');
        if (isMounted) setDrivers(drvs || []);

      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to load dashboard');
        toast.error('Load error: ' + (err.message || 'Unknown'));
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();

    // ────────────────────────────────────────────────
    // Realtime: General orders changes (all roles)
    // ────────────────────────────────────────────────
    const ordersChannel = supabase
      .channel('orders-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          toast.info(`Order ${payload.eventType}: ${payload.new?.status || 'changed'}`);

          setOrders((prev) => {
            let updated = [...prev];

            if (payload.eventType === 'INSERT') {
              updated.unshift(payload.new);
            } else if (payload.eventType === 'UPDATE') {
              const idx = updated.findIndex(o => o.id === payload.new.id);
              if (idx !== -1) updated[idx] = payload.new;
            } else if (payload.eventType === 'DELETE') {
              updated = updated.filter(o => o.id !== payload.old.id);
            }

            // Keep sorted newest first
            return updated.sort(
              (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
          });
        }
      )
      .subscribe();

    // ────────────────────────────────────────────────
    // Realtime: Driver-specific notifications
    // ────────────────────────────────────────────────
    let driverNotifChannel: any = null;

    if (isDriver && user?.id) {
      driverNotifChannel = supabase
        .channel('driver-notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const notif = payload.new;

            toast.success(notif.title, {
              description: notif.body,
              duration: 8000,
              action: {
                label: 'View Order',
                onClick: () => {
                  if (notif.order_id) {
                    router.push(`/orders/${notif.order_id}`);
                  }
                },
              },
            });
          }
        )
        .subscribe();
    }

    return () => {
      isMounted = false;
      supabase.removeChannel(ordersChannel);
      if (driverNotifChannel) supabase.removeChannel(driverNotifChannel);
    };
  }, [supabase, router, isAdmin, isDriver, user?.id]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading dashboard...</div>;
  }

  if (errorMsg) {
    return (
      <div className="p-8 text-center text-red-600">
        {errorMsg}
        <button onClick={() => window.location.reload()} className="ml-4 underline">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold">
          {isAdmin ? 'Admin Dashboard' : isDriver ? 'Driver Dashboard' : 'Your Dashboard'}
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
          {isAdmin ? 'All Live Orders' : 'Your Live Orders'}
        </h2>

        {orders.length === 0 ? (
          <div className="bg-gray-50 border rounded-lg p-10 text-center text-gray-600">
            {isAdmin ? 'No orders in the system yet.' : 'No orders assigned / placed yet.'}
          </div>
        ) : (
          <OrdersTable orders={orders} drivers={drivers} isAdmin={isAdmin} />
        )}
      </section>

      {isAdmin && (
        <section>
          <h2 className="text-2xl font-semibold mb-4">Customers</h2>
          {customers.length === 0 ? (
            <div className="bg-gray-50 border rounded-lg p-10 text-center text-gray-600">
              No customers registered yet.
            </div>
          ) : (
            <CustomerList customers={customers} isAdmin={true} />
          )}
        </section>
      )}
    </div>
  );
}
