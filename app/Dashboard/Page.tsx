'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import OrdersTable from '@/components/OrdersTable';
import CustomerList from '@/components/CustomerList';
import DriverLocationTracker from '@/components/DriverLocationTracker'; // ← new import

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

    const initialize = async () => {
      try {
        // Get user
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser || !isMounted) return;
        setUser(authUser);

        // Profile & role
        const { data: prof } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', authUser.id)
          .single();

        if (prof) {
          setProfile(prof);
          setIsAdmin(prof.role === 'admin' || prof.role === 'manager');
          setIsDriver(prof.role === 'driver');
        }

        // Customer ID for filtering
        const { data: cust } = await supabase
          .from('customers')
          .select('id')
          .eq('email', authUser.email ?? '')
          .maybeSingle();

        if (cust?.id) setCustomerId(cust.id);

        // Initial orders (role-filtered)
        let ordQuery = supabase
          .from('orders')
          .select(`
            id, status, amount, description, created_at, pickup_address, delivery_address,
            customer:customers (id, name, phone, address, balance, credit_approved),
            driver_id
          `)
          .order('created_at', { ascending: false });

        if (isAdmin) {
          // all orders
        } else if (isDriver) {
          ordQuery = ordQuery.eq('driver_id', authUser.id);
        } else if (cust?.id) {
          ordQuery = ordQuery.eq('customer_id', cust.id);
        }

        const { data: ords } = await ordQuery;
        if (isMounted) setOrders(ords || []);

        // Admins: customers
        if (isAdmin) {
          const { data: custs } = await supabase
            .from('customers')
            .select('id, name, phone, address, balance, credit_approved')
            .order('name');
          if (isMounted) setCustomers(custs || []);
        }

        // Drivers list (for assignment dropdown)
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

    initialize();

    // Realtime: Orders changes (with role-aware filtering)
    const ordersChannel = supabase
      .channel('orders-changes-global')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          toast.info(`Order ${payload.eventType}: ${payload.new?.status || 'updated'}`);

          setOrders((prev) => {
            let updated = [...prev];

            if (payload.eventType === 'INSERT') {
              if (isDriver && payload.new.driver_id !== user.id) return prev;
              if (!isAdmin && !isDriver && payload.new.customer_id !== customerId) return prev;
              updated.unshift(payload.new);
            } else if (payload.eventType === 'UPDATE') {
              const idx = updated.findIndex((o) => o.id === payload.new.id);
              if (idx !== -1) {
                if (isDriver && payload.new.driver_id !== user.id) {
                  updated.splice(idx, 1);
                } else {
                  updated[idx] = payload.new;
                }
              }
            } else if (payload.eventType === 'DELETE') {
              updated = updated.filter((o) => o.id !== payload.old.id);
            }

            return updated.sort(
              (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
          });
        }
      )
      .subscribe();

    // Realtime: Driver-specific notifications
    let driverChannel: any = null;

    if (isDriver && user?.id) {
      driverChannel = supabase
        .channel(`driver-notifs-${user.id}`)
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
  }, [supabase, router, isAdmin, isDriver, user?.id, customerId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-xl font-medium text-gray-700 animate-pulse">Loading dashboard...</div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-700 mb-6">{errorMsg}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-md font-medium transition-colors"
          >
            Retry
          </button>
        </div>
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
          <div className="bg-gray-100 border border-gray-200 rounded-xl p-12 text-center text-gray-600 shadow-inner">
            {isAdmin
              ? 'No orders exist in the system yet.'
              : isDriver
              ? 'You currently have no assigned orders.'
              : 'You haven’t placed any orders yet.'}
          </div>
        ) : (
          <OrdersTable
            orders={orders}
            drivers={drivers}
            isAdmin={isAdmin}
            isDriver={isDriver}
            currentUserId={user?.id || ''}
          />
        )}
      </section>

      {/* Driver Live Location Section – only shown to drivers */}
      {isDriver && (
        <section className="mt-10">
          <h2 className="text-2xl font-semibold mb-4">Your Live Location</h2>
          <DriverLocationTracker />
        </section>
      )}

      {isAdmin && (
        <section className="mt-12">
          <h2 className="text-2xl font-semibold mb-4">Customers & Credit Management</h2>
          {customers.length === 0 ? (
            <div className="bg-gray-100 border border-gray-200 rounded-xl p-12 text-center text-gray-600 shadow-inner">
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
