'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import OrdersTable from '@/components/OrdersTable';
import CustomerList from '@/components/CustomerList';
import DriverLocationTracker from '@/components/DriverLocationTracker';
import TimeClockPunch from '@/components/TimeClockPunch';

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
  const [teamMembers, setTeamMembers] = useState<any[]>([]); // managers + drivers
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'manager' | 'driver'>('driver');

  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', address: '', email: '' });

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
          setIsManager(prof.role === 'manager');
          setIsDriver(prof.role === 'driver');
        }

        const { data: cust } = await supabase
          .from('customers')
          .select('id')
          .eq('email', authUser.email ?? '')
          .maybeSingle();

        if (cust?.id) setCustomerId(cust.id);

        // Orders - managers/admins see all, drivers see assigned, customers see own
        let ordQuery = supabase
          .from('orders')
          .select(`
            id, status, amount, description, created_at, pickup_address, delivery_address,
            customer:customers (id, name, phone, address, balance, credit_approved),
            driver_id
          `)
          .order('created_at', { ascending: false });

        if (isAdmin || isManager) {
          // full access
        } else if (isDriver) {
          ordQuery = ordQuery.eq('driver_id', authUser.id);
        } else if (cust?.id) {
          ordQuery = ordQuery.eq('customer_id', cust.id);
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
          // Admin sees all team members (managers + drivers)
          const { data: team } = await supabase
            .from('profiles')
            .select('id, email, role')
            .in('role', ['manager', 'driver'])
            .order('role, email');
          if (isMounted) setTeamMembers(team || []);
        }

      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to load dashboard');
        toast.error('Dashboard load error');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();

    // Realtime subscriptions (orders, notifications, etc.) — add your existing ones here

  }, [supabase, router]);

  // Admin: Invite new team member (manager or driver)
  const handleInviteTeamMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail) return toast.error('Email required');

    const { data, error } = await supabase.auth.inviteUserByEmail(newUserEmail);

    if (error) {
      toast.error('Invite failed: ' + error.message);
      return;
    }

    // After invite, on first login they can set password
    // We can auto-set role in a trigger or on signup callback
    toast.success(`Invitation sent to ${newUserEmail} as ${newUserRole}`);
    setNewUserEmail('');
  };

  // Admin: Remove team member
  const handleRemoveTeamMember = async (memberId: string, email: string) => {
    if (!confirm(`Remove ${email}? This cannot be undone.`)) return;

    const { error: deleteError } = await supabase.auth.admin.deleteUser(memberId);
    if (deleteError) {
      toast.error('Delete failed: ' + deleteError.message);
      return;
    }

    await supabase.from('profiles').delete().eq('id', memberId);
    toast.success(`${email} removed from team`);
    setTeamMembers(prev => prev.filter(m => m.id !== memberId));
  };

  // Manager/Admin: Add new customer
  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomer.name || !newCustomer.email) return toast.error('Name and email required');

    const { error } = await supabase.from('customers').insert({
      name: newCustomer.name,
      phone: newCustomer.phone || null,
      address: newCustomer.address || null,
      email: newCustomer.email,
      balance: 0,
      credit_approved: false,
    });

    if (error) {
      toast.error('Failed to add customer: ' + error.message);
      return;
    }

    toast.success('Customer added successfully');
    setCustomers(prev => [...prev, { ...newCustomer, id: 'new', balance: 0, credit_approved: false }]);
    setNewCustomer({ name: '', phone: '', address: '', email: '' });
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen">Loading dashboard...</div>;

  if (errorMsg) return <div className="p-8 text-center text-red-600">Error: {errorMsg}</div>;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
          {isAdmin ? 'Admin Dashboard' : isManager ? 'Manager Dashboard' : isDriver ? 'Driver Dashboard' : 'Your Dashboard'}
        </h1>

        {!isDriver && (
          <a href="/orders/new" className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-md font-medium shadow transition-colors">
            + Place New Order
          </a>
        )}
      </div>

      {/* Orders Section */}
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

      {/* Shared Admin/Manager: Customers */}
      {(isAdmin || isManager) && (
        <section className="mt-12">
          <h2 className="text-2xl font-semibold mb-4">Customers</h2>
          {customers.length === 0 ? (
            <div className="bg-gray-100 border rounded-xl p-12 text-center text-gray-600">
              No customers registered yet.
            </div>
          ) : (
            <CustomerList customers={customers} isAdmin={isAdmin} />
          )}

          {/* Add new customer – allowed for managers and admins */}
          <div className="mt-8 bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h3 className="text-lg font-semibold mb-4">Add New Customer</h3>
            <form onSubmit={handleAddCustomer} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                value={newCustomer.name}
                onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })}
                placeholder="Full Name"
                required
                className="border p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                value={newCustomer.phone}
                onChange={e => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                placeholder="Phone Number"
                className="border p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                value={newCustomer.address}
                onChange={e => setNewCustomer({ ...newCustomer, address: e.target.value })}
                placeholder="Address"
                className="border p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 md:col-span-2"
              />
              <input
                value={newCustomer.email}
                onChange={e => setNewCustomer({ ...newCustomer, email: e.target.value })}
                placeholder="Email"
                required
                className="border p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="md:col-span-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-md font-medium transition-colors"
              >
                Add Customer
              </button>
            </form>
          </div>
        </section>
      )}

      {/* Admin-only: Team Management */}
      {isAdmin && (
        <section className="mt-12">
          <h2 className="text-2xl font-semibold mb-4">Team Management</h2>

          {teamMembers.length === 0 ? (
            <div className="bg-gray-100 border rounded-xl p-12 text-center text-gray-600">
              No managers or drivers added yet.
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
                  {teamMembers.map((member) => (
                    <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                        {member.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm capitalize font-medium">
                        {member.role}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => handleRemoveTeamMember(member.id, member.email)}
                          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-xs font-medium transition-colors"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Add new team member */}
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h3 className="text-lg font-semibold mb-4">Invite New Team Member</h3>
            <form onSubmit={handleInviteTeamMember} className="flex flex-col md:flex-row gap-4">
              <input
                type="email"
                value={newUserEmail}
                onChange={e => setNewUserEmail(e.target.value)}
                placeholder="Email address"
                required
                className="flex-1 border p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={newUserRole}
                onChange={e => setNewUserRole(e.target.value as 'manager' | 'driver')}
                className="border p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="manager">Manager</option>
                <option value="driver">Driver</option>
              </select>
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md font-medium transition-colors"
              >
                Send Invite
              </button>
            </form>
            <p className="mt-3 text-sm text-gray-500">
              Invited users will receive an email to set up their account and password.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
