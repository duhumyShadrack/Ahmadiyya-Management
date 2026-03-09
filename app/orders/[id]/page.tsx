'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';

export default function OrderDetail() {
  const { id } = useParams();
  const supabase = createClient();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrder() {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id, status, amount, description, created_at, pickup_address, delivery_address,
          customer:customers (name, phone, address),
          driver:driver_id (email)
        `)
        .eq('id', id)
        .single();

      if (error) toast.error('Order not found');
      else setOrder(data);
      setLoading(false);
    }

    fetchOrder();
  }, [id]);

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!order) return <div className="p-8 text-center text-red-600">Order not found</div>;

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Order #{id.slice(0, 8)}</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Details</h2>
          <p><strong>Status:</strong> {order.status}</p>
          <p><strong>Description:</strong> {order.description || 'N/A'}</p>
          <p><strong>Amount:</strong> ${order.amount?.toFixed(2) || '0.00'}</p>
          <p><strong>Pickup:</strong> {order.pickup_address || 'N/A'}</p>
          <p><strong>Delivery:</strong> {order.delivery_address || 'N/A'}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">People</h2>
          <p><strong>Customer:</strong> {order.customer?.name}</p>
          <p><strong>Driver:</strong> {order.driver?.email || 'Unassigned'}</p>
        </div>
      </div>
    </div>
  );
}
