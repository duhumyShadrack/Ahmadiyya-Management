'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function NewOrder() {
  const router = useRouter();
  const supabase = createClient();
  const = useState({
    customerId: '',
    description: '',
    amount: '',
    pickup: '',
    delivery: '',
  });
  const = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return alert('Log in first');

    const { error } = await supabase.from('orders').insert({
      customer_id: form.customerId,
      description: form.description,
      amount: parseFloat(form.amount) || 0,
      pickup_address: form.pickup,
      delivery_address: form.delivery,
      status: 'pending',
      profile_id: user.id, // who placed it
    });

    if (error) alert(error.message);
    else {
      alert('Order placed!');
      router.push('/dashboard');
    }
    setLoading(false);
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl mb-6">New Order</h1>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <input
          type="text"
          placeholder="Customer ID (or name—add dropdown later)"
          value={form.customerId}
          onChange={(e) => setForm({ ...form, customerId: e.target.value })}
          className="border p-2 w-full"
          required
        />
        <input
          type="text"
          placeholder="What're we moving?"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="border p-2 w-full"
          required
        />
        <input
          type="number"
          placeholder="Amount ($)"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
          className="border p-2 w-full"
        />
        <input
          type="text"
          placeholder="Pickup address"
          value={form.pickup}
          onChange={(e) => setForm({ ...form, pickup: e.target.value })}
          className="border p-2 w-full"
        />
        <input
          type="text"
          placeholder="Delivery address"
          value={form.delivery}
          onChange={(e) => setForm({ ...form, delivery: e.target.value })}
          className="border p-2 w-full"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
        >
          {loading ? 'Placing...' : 'Place Order'}
        </button>
      </form>
    </div>
  );
}
