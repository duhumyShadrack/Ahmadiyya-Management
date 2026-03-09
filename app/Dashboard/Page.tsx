'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import OrdersTable from '@/components/OrdersTable';
import CustomerList from '@/components/CustomerList';
import DriverLocationTracker from '@/components/DriverLocationTracker';
import TimeClockPunch from '@/components/TimeClockPunch';
import AdminDriverMap from '@/components/AdminDriverMap'; // new component below

export default function Dashboard() {
  const supabase = createClient();
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isManager, setIsManager] = useState(false);
  const [isDriver, setIsDriver] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [punches, setPunches] = useState<any[]>([]);
  const [driverLocations, setDriverLocations] = useState<any[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser || !isMounted) return;
        setUser(authUser);

        const { data: prof } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', authUser.id)
          .single();

        if (prof) {
          setProfile(prof);
          setIsAdmin(prof.role === 'admin');
          setIsManager(prof.role === 'manager' || prof.role === 'admin');
          setIsDriver(prof.role === 'driver');
        }

        const { data: cust } = await supabase
          .from('customers')
          .select('id')
          .eq('email', authUser.email ?? '')
          .maybeSingle();

        if (cust?.id) setCustomerId(cust.id);

        // Orders
        let ordQuery = supabase
          .from('orders')
          .select(`
            id, status, amount, description, created_at, pickup_address, delivery_address,
            customer:customers (id, name, phone, address, balance, credit_approved),
            driver_id
          `)
          .order('created_at', { ascending: false });

        if (!isAdmin && !isManager) {
          if (isDriver) ordQuery = ordQuery.eq('driver_id', authUser.id);
          else if (cust?.id) ordQuery = ordQuery.eq('customer_id', cust.id);
        }

        const { data: ords } = await ordQuery;
        if (isMounted) setOrders(ords || []);

        if (isAdmin || isManager) {
          const { data: custs } = await supabase
            .from('customers')
            .select('id, name, phone, address, balance, credit_approved')
            .order('name');
          if (isMounted) setCustomers(custs || []);
        }

        if (isAdmin) {
          const { data: team } = await supabase
            .from('profiles')
            .select('id, email, role')
            .in('role', ['admin', 'manager', 'driver'])
            .order('role, email');
          if (isMounted) setTeamMembers(team || []);

          // Driver locations for map
          const { data: locs } = await supabase
            .from('driver_locations')
            .select('driver_id, latitude, longitude, last_updated');
          const enrichedLocs = locs?.map(loc => ({
            ...loc,
            email: team.find(m => m.id === loc.driver_id)?.email || 'Driver'
          })) || [];
          if (isMounted) setDriverLocations(enrichedLocs);
        }

        // Unread notifications count
        const { count } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', authUser.id)
          .eq('read', false);
        if (isMounted) setUnreadNotifications(count || 0);

      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to load dashboard');
        toast.error('Dashboard load error');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();

    // Realtime: orders, notifications, punches, locations (add your existing channels here)

    // Example: realtime for new punches
    const punchChannel = supabase
      .channel('time-clock-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'time_clock_entries' }, (payload) => {
        toast.info(`New ${payload.new.type} punch recorded`);
        setPunches(prev => [payload.new, ...prev]);
      })
      .subscribe();

    // Realtime for driver locations (admin only)
    const locChannel = supabase
      .channel('driver-locations-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_locations' }, (payload) => {
        toast.info('Driver location updated');
        // Update map data
        setDriverLocations(prev => {
          const newLocs = [...prev];
          const idx = newLocs.findIndex(l => l.driver_id === payload.new.driver_id);
          if (idx !== -1) newLocs[idx] = payload.new;
          else newLocs.push(payload.new);
          return newLocs;
        });
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(punchChannel);
      supabase.removeChannel(locChannel);
      // Remove other channels
    };
  }, [supabase, router]);

  // ... (keep your existing handlers: invite, remove, add customer)

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header with notification bell */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
          {isAdmin ? 'Admin Control Center' : isManager ? 'Manager Dashboard' : isDriver ? 'Driver Dashboard' : 'Your Dashboard'}
        </h1>

        <div className="relative">
          <button className="p-2 text-gray-600 hover:text-gray-900 relative">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {unreadNotifications > 0 && (
              <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
                {unreadNotifications}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ... existing sections: orders, driver features, customers ... */}

      {isAdmin && (
        <>
          {/* ... existing team management ... */}

          {/* Live Driver Map */}
          <section className="mt-12">
            <h2 className="text-2xl font-semibold mb-4">Live Driver Locations</h2>
            {driverLocations.length === 0 ? (
              <div className="bg-gray-100 border rounded-xl p-12 text-center text-gray-600">
                No drivers sharing location yet.
              </div>
            ) : (
              <AdminDriverMap locations={driverLocations} />
            )}
          </section>

          {/* Punch Reports */}
          <section className="mt-12">
            <h2 className="text-2xl font-semibold mb-4">Punch Reports & Hours</h2>
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
              <p className="text-lg font-medium mb-4">
                Total punches today: {punches.filter(p => new Date(p.timestamp).toDateString() === new Date().toDateString()).length}
              </p>
              {/* Simple hours calc example – group by user/day */}
              <div className="space-y-4">
                {Object.entries(
                  punches.reduce((acc: any, p: any) => {
                    const date = new Date(p.timestamp).toDateString();
                    const user = p.user?.email || 'Unknown';
                    if (!acc[user]) acc[user] = {};
                    if (!acc[user][date]) acc[user][date] = [];
                    acc[user][date].push(p);
                    return acc;
                  }, {})
                ).map(([user, dates]: [string, any]) => (
                  <div key={user}>
                    <h4 className="font-semibold">{user}</h4>
                    {Object.entries(dates).map(([date, entries]: [string, any[]]) => {
                      let hours = 0;
                      for (let i = 0; i < entries.length; i += 2) {
                        const inP = entries[i];
                        const outP = entries[i + 1];
                        if (inP?.type === 'in' && outP?.type === 'out') {
                          const diff = new Date(outP.timestamp).getTime() - new Date(inP.timestamp).getTime();
                          hours += diff / (1000 * 60 * 60);
                        }
                      }
                      return (
                        <p key={date} className="text-sm text-gray-700">
                          {date}: {hours.toFixed(2)} hours ({entries.length} punches)
                        </p>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
