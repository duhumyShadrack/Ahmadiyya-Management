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
  const [isDriver, setIsDriver] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [punches, setPunches] = useState<any[]>([]);
  const [punchFilter, setPunchFilter] = useState<'today' | 'week' | 'all'>('today');
  const [loadingPunches, setLoadingPunches] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      try {
        // User & profile
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
          setIsAdmin(prof.role === 'admin' || prof.role === 'manager');
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

        if (isAdmin) {
          // all
        } else if (isDriver) {
          ordQuery = ordQuery.eq('driver_id', authUser.id);
        } else if (cust?.id) {
          ordQuery = ordQuery.eq('customer_id', cust.id);
        }

        const { data: ords } = await ordQuery;
        if (isMounted) setOrders(ords || []);

        if (isAdmin) {
          const { data: custs } = await supabase
            .from('customers')
            .select('id, name, phone, address, balance, credit_approved')
            .order('name');
          if (isMounted) setCustomers(custs || []);

          const { data: drvs } = await supabase
            .from('profiles')
            .select('id, email')
            .eq('role', 'driver')
            .order('email');
          if (isMounted) setDrivers(drvs || []);

          // Admin punches (initial fetch)
          await loadPunches();
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to load dashboard');
        toast.error('Dashboard load error');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initialize();

    // Realtime: orders
    const ordersChannel = supabase
      .channel('orders-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        toast.info(`Order ${payload.eventType}: ${payload.new?.status || 'updated'}`);
        setOrders((prev) => {
          let updated = [...prev];
          if (payload.eventType === 'INSERT') {
            if (isDriver && payload.new.driver_id !== user.id) return prev;
            if (!isAdmin && !isDriver && payload.new.customer_id !== customerId) return prev;
            updated.unshift(payload.new);
          } else if (payload.eventType === 'UPDATE') {
            const idx = updated.findIndex(o => o.id === payload.new.id);
            if (idx !== -1) {
              if (isDriver && payload.new.driver_id !== user.id) {
                updated.splice(idx, 1);
              } else {
                updated[idx] = payload.new;
              }
            }
          } else if (payload.eventType === 'DELETE') {
            updated = updated.filter(o => o.id !== payload.old.id);
          }
          return updated.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        });
      })
      .subscribe();

    // Realtime: driver notifications
    let driverChannel: any = null;
    if (isDriver && user?.id) {
      driverChannel = supabase
        .channel(`driver-notifs-${user.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
          (payload) => {
            const notif = payload.new;
            toast.success(notif.title || 'New Notification', {
              description: notif.body,
              duration: 10000,
              action: notif.order_id ? { label: 'View Order', onClick: () => router.push(`/orders/${notif.order_id}`) } : undefined,
            });
          }
        )
        .subscribe();
    }

    // Realtime: time clock punches (admins only)
    let punchChannel: any = null;
    if (isAdmin) {
      punchChannel = supabase
        .channel('time-clock-live')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'time_clock_entries' },
          (payload) => {
            toast.info(`New ${payload.new.type === 'in' ? 'punch in' : 'punch out'} recorded`);
            setPunches((prev) => [payload.new, ...prev]);
          }
        )
        .subscribe();
    }

    return () => {
      isMounted = false;
      supabase.removeChannel(ordersChannel);
      if (driverChannel) supabase.removeChannel(driverChannel);
      if (punchChannel) supabase.removeChannel(punchChannel);
    };
  }, [supabase, router, isAdmin, isDriver, user?.id, customerId]);

  // Load punches when filter changes (admin only)
  useEffect(() => {
    if (isAdmin) {
      loadPunches();
    }
  }, [punchFilter, isAdmin]);

  const loadPunches = async () => {
    setLoadingPunches(true);
    try {
      let query = supabase
        .from('time_clock_entries')
        .select(`
          id, type, timestamp, latitude, longitude, accuracy,
          user:user_id (email)
        `)
        .order('timestamp', { ascending: false });

      if (punchFilter === 'today') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        query = query.gte('timestamp', today.toISOString());
      } else if (punchFilter === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        query = query.gte('timestamp', weekAgo.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      setPunches(data || []);
    } catch (err: any) {
      toast.error('Failed to load punches');
      console.error(err);
    } finally {
      setLoadingPunches(false);
    }
  };

  const exportToCSV = () => {
    if (punches.length === 0) return toast.warning('No punches to export');

    const headers = ['User Email', 'Type', 'Timestamp', 'Latitude', 'Longitude', 'Accuracy (m)'];
    const rows = punches.map(p => [
      p.user?.email || 'Unknown',
      p.type.toUpperCase(),
      new Date(p.timestamp).toLocaleString(),
      p.latitude,
      p.longitude,
      p.accuracy || 'N/A',
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `time_clock_punches_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  if (errorMsg) return <div className="p-8 text-center text-red-600">Error: {errorMsg}</div>;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-
