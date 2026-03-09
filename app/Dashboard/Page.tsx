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
            .select('*')
            .order('scheduled_date', { ascending: false });
          if (isMounted) setFleetMaintenance(maint || []);

          // Unread notifications
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

    // Realtime subscriptions (orders, notifications, punches, locations, fleet maintenance)
    // ... (add your existing ones here)

    // Example: realtime for fleet maintenance
    const maintChannel = supabase
      .channel('fleet-maintenance-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fleet_maintenance' }, (payload) => {
        toast.info(`Fleet maintenance update: ${payload.eventType}`);
        setFleetMaintenance(prev => {
          let updated = [...prev];
          if (payload.eventType === 'INSERT') updated.unshift(payload.new);
          else if (payload.eventType === 'UPDATE') {
            const idx = updated.findIndex(m => m.id === payload.new.id);
            if (idx !== -1) updated[idx] = payload.new;
          } else if (payload.eventType === 'DELETE') {
            updated = updated.filter(m => m.id !== payload.old.id);
          }
          return updated;
        });
      })
      .subscribe();

    return () => {
      // Cleanup channels
    };
  }, [supabase, router]);

  // Admin: Add fleet vehicle
  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    // Implement form for name, model, year, etc.
  };

  // Admin: Add maintenance schedule
  const handleAddMaintenance = async (e: React.FormEvent) => {
    e.preventForm();
    // Implement form for vehicle_id, type, scheduled_date, etc.
  };

  // ... (keep your existing handlers: invite, remove, add customer)

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
          {/* Dropdown preview */}
          <div className="absolute right-0 mt-2 w-72 bg-white rounded-md shadow-lg py-2 z-10 hidden">
            {/* Fetch and show recent notifs */}
            <p className="px-4 py-2 text-sm text-gray-600">No new notifications</p>
          </div>
        </div>
      </div>

      {/* Orders */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">
          {isAdmin || isManager ? 'All Orders' : isDriver ? 'Assigned Orders' : 'Your Orders'}
        </h2>
        {orders.length === 0 ? (
          <div className="bg-gray-100 border rounded-xl p-12 text-center text-gray-600">
            No orders yet.
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

          <div className="mt-8 bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h3 className="text-lg font-semibold mb-4">Add New Customer</h3>
            <form onSubmit={handleAddCustomer} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input value={newCustomer.name} onChange={e => setNewCustomer({...newCustomer, name: e.target.value})} placeholder="Name" required className="border p-3 rounded" />
              <input value={newCustomer.phone} onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})} placeholder="Phone" className="border p-3 rounded" />
              <input value={newCustomer.address} onChange={e => setNewCustomer({...newCustomer, address: e.target.value})} placeholder="Address" className="border p-3 rounded md:col-span-2" />
              <input value={newCustomer.email} onChange={e => setNewCustomer({...newCustomer, email: e.target.value})} placeholder="Email" required className="border p-3 rounded" />
              <button type="submit" className="md:col-span-2 bg-blue-600 text-white py-3 rounded hover:bg-blue-700">Add Customer</button>
            </form>
          </div>
        </section>
      )}

      {/* Admin: Team Management */}
      {isAdmin && (
        <section className="mt-12">
          <h2 className="text-2xl font-semibold mb-4">Team Management</h2>
          {teamMembers.length === 0 ? (
            <div className="bg-gray-100 border rounded-xl p-12 text-center text-gray-600">
              No team members yet.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm mb-8">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Email</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Role</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {teamMembers.map(member => (
                    <tr key={member.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{member.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm capitalize">{member.role}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button onClick={() => handleRemoveTeamMember(member.id, member.email)} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-xs">
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h3 className="text-lg font-semibold mb-4">Invite New Team Member</h3>
            <form onSubmit={handleInviteTeam} className="flex flex-col md:flex-row gap-4">
              <input type="email" value={newTeamEmail} onChange={e => setNewTeamEmail(e.target.value)} placeholder="Email" required className="flex-1 border p-3 rounded" />
              <select value={newTeamRole} onChange={e => setNewTeamRole(e.target.value as 'manager' | 'driver')} className="border p-3 rounded min-w-[160px]">
                <option value="manager">Manager</option>
                <option value="driver">Driver</option>
              </select>
              <button type="submit" className="bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700">Send Invite</button>
            </form>
          </div>
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
          <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold">Summary (Last 30 Days)</h3>
            </div>
            <div className="p-6">
              {punches.length === 0 ? (
                <p className="text-gray-600 text-center py-8">No punch data yet.</p>
              ) : (
                <div className="space-y-6">
                  {Object.entries(
                    punches.reduce((acc: any, p: any) => {
                      const userEmail = p.user?.email || 'Unknown';
                      if (!acc[userEmail]) acc[userEmail] = [];
                      acc[userEmail].push(p);
                      return acc;
                    }, {})
                  ).map(([email, userPunches]: [string, any[]]) => {
                    userPunches.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

                    let totalHours = 0;
                    for (let i = 0; i < userPunches.length; i += 2) {
                      const inP = userPunches[i];
                      const outP = userPunches[i + 1];
                      if (inP?.type === 'in' && outP?.type === 'out') {
                        const diff = new Date(outP.timestamp).getTime() - new Date(inP.timestamp).getTime();
                        totalHours += diff / (1000 * 60 * 60);
                      }
                    }

                    return (
                      <div key={email} className="border-b pb-6 last:border-b-0">
                        <h4 className="font-semibold text-lg mb-2">{email}</h4>
                        <p className="text-xl font-bold text-blue-600 mb-3">
                          Total hours: {totalHours.toFixed(2)}
                        </p>
                        <ul className="space-y-2 text-sm text-gray-700">
                          {userPunches.map(p => (
                            <li key={p.id}>
                              {p.type.toUpperCase()} at {new Date(p.timestamp).toLocaleString()} – Lat/Lng: {p.latitude.toFixed(6)}, {p.longitude.toFixed(6)} (±{p.accuracy ? Math.round(p.accuracy) : 'N/A'}m)
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Admin: Fleet Maintenance Schedule */}
      {isAdmin && (
        <section className="mt-12">
          <h2 className="text-2xl font-semibold mb-4">Fleet Maintenance Schedule</h2>
          {fleetMaintenance.length === 0 ? (
            <div className="bg-gray-100 border rounded-xl p-12 text-center text-gray-600">
              No maintenance scheduled.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Vehicle</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Type</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Scheduled</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Completed</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Cost</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {fleetMaintenance.map(m => (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {fleetVehicles.find(v => v.id === m.vehicle_id)?.name || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm capitalize">{m.type}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{new Date(m.scheduled_date).toLocaleDateString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{m.completed_date ? new Date(m.completed_date).toLocaleDateString() : 'Pending'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">${m.cost?.toFixed(2) || '0.00'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Add new maintenance */}
          <div className="mt-8 bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h3 className="text-lg font-semibold mb-4">Schedule New Maintenance</h3>
            <form onSubmit={handleAddMaintenance} className="space-y-4">
              <select placeholder="Vehicle" required className="border p-3 w-full rounded">
                <option value="">Select Vehicle</option>
                {fleetVehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
              <input placeholder="Type (e.g., oil change)" required className="border p-3 w-full rounded" />
              <input type="date" placeholder="Scheduled Date" required className="border p-3 w-full rounded" />
              <button type="submit" className="bg-blue-600 text-white py-3 w-full rounded hover:bg-blue-700">
                Schedule
              </button>
            </form>
          </div>
        </section>
      )}
    </div>
  );
}
