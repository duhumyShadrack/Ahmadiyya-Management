'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import OrdersTable from '@/components/OrdersTable';
import CustomerList from '@/components/CustomerList';
import DriverLocationTracker from '@/components/DriverLocationTracker';
import TimeClockPunch from '@/components/TimeClockPunch';
import AdminDriverMap from '@/components/AdminDriverMap';

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
  const [jobSites, setJobSites] = useState<any[]>([]);
  const [fleetVehicles, setFleetVehicles] = useState<any[]>([]);
  const [fleetMaintenance, setFleetMaintenance] = useState<any[]>([]);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
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
          .from('jobs') // using generic 'jobs' table
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

          const { data: sites } = await supabase
            .from('job_sites')
            .select('id, name, latitude, longitude, radius_meters')
            .order('name');
          if (isMounted) setJobSites(sites || []);
        }

        if (isAdmin) {
          const { data: team } = await supabase
            .from('profiles')
            .select('id, email, role')
            .in('role', ['admin', 'manager', 'driver'])
            .order('role, email');
          if (isMounted) setTeamMembers(team || []);

          const { data: locs } = await supabase
            .from('driver_locations')
            .select('driver_id, latitude, longitude, last_updated');
          const enriched = locs?.map(l => ({
            ...l,
            email: team.find(m => m.id === l.driver_id)?.email || 'Driver'
          })) || [];
          if (isMounted) setDriverLocations(enriched);

          const { data: vehicles } = await supabase
            .from('fleet_vehicles')
            .select('*')
            .order('name');
          if (isMounted) setFleetVehicles(vehicles || []);

          const { data: maint } = await supabase
            .from('fleet_maintenance')
            .select(`
              id, vehicle_id, type, scheduled_date, completed_date, mileage_at_service, notes, cost,
              vehicle:fleet_vehicles (name)
            `)
            .order('scheduled_date', { ascending: false });
          if (isMounted) setFleetMaintenance(maint || []);

          const { count } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', authUser.id)
            .eq('read', false);
          if (isMounted) setUnreadNotifs(count || 0);
        }

      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to load dashboard');
        toast.error('Dashboard load error');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();

    // Realtime subscriptions (orders, notifications, punches, locations, fleet)
    // ... add your existing channels here

  }, [supabase, router]);

  // ... keep your existing handlers (invite, remove, add customer, etc.)

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header with notification bell */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
          {isAdmin ? 'Admin Control Center' : isManager ? 'Manager Dashboard' : isDriver ? 'Driver Dashboard' : 'Your Dashboard'}
        </h1>

        <div className="relative">
          <button className="p-2 text-gray-600 hover:text-gray-900 relative">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {unreadNotifs > 0 && (
              <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                {unreadNotifs}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Orders */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">
          {isAdmin || isManager ? 'All Jobs' : isDriver ? 'Assigned Jobs' : 'Your Jobs'}
        </h2>
        {orders.length === 0 ? (
          <div className="bg-gray-100 border rounded-xl p-12 text-center text-gray-600">
            No jobs yet.
          </div>
        ) : (
          <OrdersTable orders={orders} drivers={drivers} isAdmin={isAdmin} isDriver={isDriver} currentUserId={user?.id || ''} />
        )}
      </section>

      {/* Driver Features */}
      {isDriver && (
        <>
          <section className="mt-10">
            <h2 className="text-2xl font-semibold mb-4">Your Live Location</h2>
            <DriverLocationTracker />
          </section>

          <section className="mt-10">
            <h2 className="text-2xl font-semibold mb-4">Time Clock</h2>
            <TimeClockPunch />
          </section>
        </>
      )}

      {/* Customers */}
      {(isAdmin || isManager) && (
        <section className="mt-12">
          <h2 className="text-2xl font-semibold mb-4">Customers</h2>
          {customers.length === 0 ? (
            <div className="bg-gray-100 border rounded-xl p-12 text-center text-gray-600">
              No customers yet.
            </div>
          ) : (
            <CustomerList customers={customers} isAdmin={isAdmin} />
          )}
        </section>
      )}

      {/* Admin: Team Management */}
      {isAdmin && (
        <section className="mt-12">
          <h2 className="text-2xl font-semibold mb-4">Team Management</h2>
          {/* ... team table and invite form ... */}
        </section>
      )}

      {/* Admin: Live Driver Map */}
      {isAdmin && (
        <section className="mt-12">
          <h2 className="text-2xl font-semibold mb-4">Live Driver Locations</h2>
          {driverLocations.length === 0 ? (
            <div className="bg-gray-100 border rounded-xl p-12 text-center text-gray-600">
              No drivers sharing location.
            </div>
          ) : (
            <AdminDriverMap locations={driverLocations} />
          )}
        </section>
      )}

      {/* Admin: Punch Reports */}
      {isAdmin && (
        <section className="mt-12">
          <h2 className="text-2xl font-semibold mb-4">Time Clock Reports</h2>
          {/* ... punch report with hours calc ... */}
        </section>
      )}

      {/* Admin: Fleet Maintenance */}
      {isAdmin && (
        <section className="mt-12">
          <h2 className="text-2xl font-semibold mb-4">Fleet Maintenance Schedule</h2>
          {/* ... fleet table and add form ... */}
        </section>
      )}
    </div>
  );
}
