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
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  const [newTeamEmail, setNewTeamEmail] = useState('');
  const [newTeamRole, setNewTeamRole] = useState<'manager' | 'driver'>('driver');
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', address: '', email: '' });

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
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

        // Orders fetch
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

          // Driver locations
          const { data: locs } = await supabase
            .from('driver_locations')
            .select('driver_id, latitude, longitude, last_updated');
          const enriched = locs?.map(l => ({
            ...l,
            email: team.find(m => m.id === l.driver_id)?.email || 'Driver'
          })) || [];
          if (isMounted) setDriverLocations(enriched);

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

    loadDashboard();

    // Realtime: orders, notifications, punches, locations
    const ordersChannel = supabase.channel('orders-live').on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
      toast.info(`Order update: ${payload.eventType}`);
      setOrders(prev => {
        let updated = [...prev];
        if (payload.eventType === 'INSERT') updated.unshift(payload.new);
        else if (payload.eventType === 'UPDATE') {
          const idx = updated.findIndex(o => o.id === payload.new.id);
          if (idx !== -1) updated[idx] = payload.new;
        } else if (payload.eventType === 'DELETE') {
          updated = updated.filter(o => o.id !== payload.old.id);
        }
        return updated.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      });
    }).subscribe();

    const notifChannel = supabase.channel('notifs-live').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
      if (payload.new.user_id === user?.id) {
        setUnreadNotifs(prev => prev + 1);
        toast.success(payload.new.title || 'New Notification', {
          description: payload.new.body,
          action: payload.new.order_id ? { label: 'View', onClick: () => router.push(`/orders/${payload.new.order_id}`) } : undefined,
        });
      }
    }).subscribe();

    const punchChannel = supabase.channel('punches-live').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'time_clock_entries' }, (payload) => {
      toast.info(`New ${payload.new.type.toUpperCase()} punch`);
      setPunches(prev => [payload.new, ...prev]);
    }).subscribe();

    const locChannel = supabase.channel('locations-live').on('postgres_changes', { event: '*', schema: 'public', table: 'driver_locations' }, (payload) => {
      setDriverLocations(prev => {
        const newLocs = [...prev];
        const idx = newLocs.findIndex(l => l.driver_id === payload.new.driver_id);
        if (idx !== -1) newLocs[idx] = payload.new;
        else newLocs.push(payload.new);
        return newLocs;
      });
    }).subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(notifChannel);
      supabase.removeChannel(punchChannel);
      supabase.removeChannel(locChannel);
    };
  }, [supabase, router]);

  // Admin: Invite team member
  const handleInviteTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamEmail) return toast.error('Email required');

    const { error } = await supabase.auth.inviteUserByEmail(newTeamEmail);

    if (error) {
      toast.error('Invite failed: ' + error.message);
      return;
    }

    toast.success(`Invitation sent to ${newTeamEmail} as ${newTeamRole}`);
    setNewTeamEmail('');
  };

  // Admin: Remove team member
  const handleRemoveTeamMember = async (id: string, email: string) => {
    if (!confirm(`Remove ${email}?`)) return;

    const { error: authErr } = await supabase.auth.admin.deleteUser(id);
    if (authErr) return toast.error('Delete failed');

    await supabase.from('profiles').delete().eq('id', id);
    toast.success(`${email} removed`);
    setTeamMembers(prev => prev.filter(m => m.id !== id));
  };

  // Manager/Admin: Add customer
  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomer.name || !newCustomer.email) return toast.error('Name & email required');

    const { error, data } = await supabase
      .from('customers')
      .insert({
        name: newCustomer.name,
        phone: newCustomer.phone || null,
        address: newCustomer.address || null,
        email: newCustomer.email,
        balance: 0,
        credit_approved: false,
      })
      .select()
      .single();

    if (error) return toast.error('Add failed');

    toast.success('Customer added');
    setCustomers(prev => [...prev, data]);
    setNewCustomer({ name: '', phone: '', address: '', email: '' });
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;

  if (errorMsg) return <div className="p-8 text-center text-red-600">Error: {errorMsg}</div>;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
          {isAdmin ? 'Admin Control Center' : isManager ? 'Manager Dashboard' : isDriver ? 'Driver Dashboard' : 'Your Dashboard'}
        </h1>

        {!isDriver && (
          <a href="/orders/new" className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-md font-medium shadow transition-colors">
            + New Order
          </a>
        )}
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

      {/* Customers - Admin & Manager */}
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

          {/* Add customer */}
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
            <div className="overflow-x-auto rounded-xl border shadow-sm mb-8">
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

          {/* Invite team */}
          <div className="bg-white p-6 rounded-lg shadow-md border">
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
    </div>
  );
}
