'use client'; // Required for realtime subscriptions

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import OrdersTable from '@/components/OrdersTable';
import CustomerList from '@/components/CustomerList';
import { toast } from 'sonner';

export default function Dashboard() {
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const fetchUserAndData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) window.location.href = '/login';
      setUser(user);

      const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      setProfile(prof);
      const admin = prof?.role === 'admin';
      setIsAdmin(admin);

      // Fetch initial orders
      let query = supabase.from('orders').select(`
        id, status, amount, description, created_at, pickup_address, delivery_address,
        customer:customers(id, name, phone, address, balance, credit_approved)
      `).order('created_at', { ascending: false });

      const { data: cust } = await supabase.from('customers').select('id').eq('email', user.email).maybeSingle();
      if (!admin && cust?.id) query = query.eq('customer_id', cust.id);

      const { data: ords } = await query;
      setOrders(ords || []);

      // Admins get customers
      if (admin) {
        const { data: custs } = await supabase.from('customers').select('*').order('name');
        setCustomers(custs || []);
      }

      setLoading(false);
    };

    fetchUserAndData();

    // Realtime subscription
    const channel = supabase.channel('orders-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        console.log('Change received!', payload);
        toast.info(`Order update: ${payload.eventType} - ${payload.new?.status || 'unknown'}`);

        setOrders((prev) => {
          if (payload.eventType === 'INSERT') return [payload.new, ...prev];
          if (payload.eventType === 'UPDATE') return prev.map(o => o.id === payload.new.id ? payload.new : o);
          if (payload.eventType === 'DELETE') return prev.filter(o => o.id !== payload.old.id);
          return prev;
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) return <div className="p-10 text-center">Loading dashboard...</div>;

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-4xl font-bold mb-8">{isAdmin ? 'Admin Control Center' : 'Your Dashboard'}</h1>

      <section className="mb-12">
        <h2 className="text-2xl mb-4">{isAdmin ? 'Live Orders' : 'Your Live Orders'}</h2>
        <OrdersTable orders={orders} />
      </section>

      {isAdmin && (
        <section>
          <h2 className="text-2xl mb-4">Customers Management</h2>
          <CustomerList customers={customers} isAdmin={true} />
        </section>
      )}

      <div className="mt-8">
        <a href="/orders/new" className="bg-green-600 text-white px-6 py-3 rounded hover:bg-green-700">
          Place New Order
        </a>
      </div>
    </div>
  );
}
