'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import OrdersTable from '@/components/OrdersTable';
import CustomerList from '@/components/CustomerList';
import DriverLocationTracker from '@/components/DriverLocationTracker';
import TimeClockPunch from '@/components/TimeClockPunch';
import AdminDriverMap from '@/components/AdminDriverMap'; // new – code below

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

  useEffect(() => {
    let isMounted = true;

    const loadAll = async () => {
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

          // Driver locations
          const { data: locs } = await supabase
            .from('driver_locations')
            .select('driver_id, latitude, longitude, last_updated');
          const enriched = locs?.map(l => ({
            ...l,
            email: team.find(m => m.id === l.driver_id)?.email || 'Driver'
          })) || [];
          if (isMounted) setDriverLocations(enriched);

          // Unread notifications count
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

    loadAll();

    // Realtime subscriptions (orders, notifications, punches, locations)
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
      toast.info(`New punch: ${payload.new.type.toUpperCase()}`);
      setPunches(prev => [payload.new, ...prev]);
    }).subscribe();

    const locChannel = supabase.channel('locations-live').on('postgres_changes', { event: '*', schema: 'public', table: 'driver_locations' }, (payload) => {
      set
