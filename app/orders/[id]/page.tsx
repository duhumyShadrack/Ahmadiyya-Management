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
    const fetchOrder = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id, status, amount, description, created_at, pickup_address, delivery_address,
          customer:customers (name, phone, address),
          driver_id
        `)
        .eq('id', id)
        .single();

      if (error) toast.error('Order not found');
      else setOrder(data);
      setLoading(false);
    };

    fetchOrder();
  }, [id]);

  if (loading) return <div>Loading order...</div>;
  if (!order) return <div>Order not found</div>;

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Order #{id.slice(0, 8)}</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Details</h2>
          <p><strong>Status:</strong> {order.status}</p>
          <p><strong>Description:</strong> {order.description || 'N/A'}</p>
          <p><strong>Amount:</strong> ${order.amount?.toFixed(2) || '0.00'}</p>
          <p><strong>Pickup:</strong> {order.pickup_address || 'N/A'}</p>
          <p><strong>Delivery:</strong> {order.delivery_address || 'N/A'}</p>
          <p><strong>Created:</strong> {new Date(order.created_at).toLocaleString()}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Customer</h2>
          <p><strong>Name:</strong> {order.customer?.name}</p>
          <p><strong>Phone:</strong> {order.customer?.phone}</p>
          <p><strong>Address:</strong> {order.customer?.address}</p>
        </div>
      </div>

      {/* Add map if addresses exist */}
      {(order.pickup_address || order.delivery_address) && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Route Map</h2>
          {/* Embed simple map or link */}
          <a
            href={`https://www.google.com/maps/dir/?api=1&origin=${order.pickup_address}&destination=${order.delivery_address}`}
            target="_blank"
            className="text-blue-600 hover:underline"
          >
            View Route on Google Maps
          </a>
        </div>
      )}
    </div>
  );
}
