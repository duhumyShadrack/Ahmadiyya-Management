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

        // Get profile & role
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

        // Get customer's ID for order filtering
        const { data: cust } = await supabase
          .from('customers')
          .select('id')
          .eq('email', authUser.email ?? '')
          .maybeSingle();

        if (cust?.id) setCustomerId(cust.id);

        // Initial orders
        let ordQuery = supabase
          .from('orders')
          .select(`
            id, status, amount, description, created_at, pickup_address, delivery_address,
            customer:customers (id, name, phone, address, balance, credit_approved),
            driver_id
          `)
          .order('created_at', { ascending: false });

        if (!admin && cust?.id) {
          ordQuery = ordQuery.eq('customer_id', cust.id);
        }

        const { data: ords } = await ordQuery;
        if (isMounted) setOrders(ords || []);

        // Admins: customers list
        if (admin) {
          const { data: custs } = await supabase
            .from('customers')
            .select('id, name, phone, address, balance, credit_approved')
            .order('name');
          if (isMounted) setCustomers(custs || []);
        }

        // Drivers assignment dropdown (admins need this)
        const { data: drvs } = await supabase
          .from('profiles')
          .select('id, email')
          .eq('role', 'driver')
          .order('email');
        if (isMounted) setDrivers(drvs || []);

      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to load dashboard');
        toast.error('Dashboard load error');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();

    // ────────────────────────────────────────────────
    // Realtime: All order changes (visible to everyone)
    // ────────────────────────────────────────────────
    const ordersChannel = supabase
      .channel('orders-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          toast.info(`Order update: ${payload.eventType} (${payload.new?.status || 'changed'})`);

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

            return updated.sort(
              (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
          });
        }
      )
      .subscribe();

    // ────────────────────────────────────────────────
    // Driver-specific realtime notifications (only for drivers)
    // ────────────────────────────────────────────────
    let driverChannel: any = null;

    if (isDriver && user?.id) {
      driverChannel = supabase
        .channel(`driver-notifs:${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const notif = payload.new as any;

            toast.success(notif.title || 'New Notification', {
              description: notif.body,
              duration: 10000,
              action: notif.order_id
                ? {
                    label: 'View Order',
                    onClick: () => router.push(`/orders/${notif.order_id}`),
                  }
                : undefined,
            });
          }
        )
        .subscribe();
    }

    return () => {
      isMounted = false;
      supabase.removeChannel(ordersChannel);
      if (driverChannel) supabase.removeChannel(driverChannel);
    };
  }, [supabase, router, isAdmin, isDriver, user?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-xl font-medium text-gray-700">Loading dashboard...</div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="p-10 text-center text-red-600 bg-white min-h-screen">
        {errorMsg}
        <button
          onClick={() => window.location.reload()}
          className="ml-4 px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
          {isAdmin ? 'Admin Dashboard' : isDriver ? 'Driver Dashboard' : 'Your Dashboard'}
        </h1>

        {!isDriver && (
          <a
            href="/orders/new"
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-md font-medium shadow transition-colors"
          >
            + Place New Order
          </a>
        )}
      </div>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">
          {isAdmin ? 'All Live Orders' : isDriver ? 'Assigned Orders' : 'Your Orders'}
        </h2>

        {orders.length === 0 ? (
          <div className="bg-gray-100 border border-gray-200 rounded-xl p-12 text-center text-gray-600">
            {isAdmin
              ? 'No orders in the system yet.'
              : isDriver
              ? 'No orders assigned to you at the moment.'
              : 'You have no orders yet.'}
          </div>
        ) : (
          <OrdersTable orders={orders} drivers={drivers} isAdmin={isAdmin} />
        )}
      </section>

      {isAdmin && (
        <section>
          <h2 className="text-2xl font-semibold mb-4">Customers & Credit</h2>
          {customers.length === 0 ? (
            <div className="bg-gray-100 border border-gray-200 rounded-xl p-12 text-center text-gray-600">
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
