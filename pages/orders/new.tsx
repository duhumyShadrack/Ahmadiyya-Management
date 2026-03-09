// pages/orders/new.tsx
import { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../utils/supabaseClient';

export default function NewOrder() {
  const router = useRouter();
  const [form, setForm] = useState({
    customer_id: '',
    description: '',
    amount: '',
    pickup_address: '',
    delivery_address: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.from('orders').insert({
      ...form,
      amount: parseFloat(form.amount) || 0,
      status: 'pending',
    });

    if (error) {
      alert(error.message);
    } else {
      alert('Order created!');
      router.push('/dashboard');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Create New Order</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Customer ID"
          value={form.customer_id}
          onChange={(e) => setForm({ ...form, customer_id: e.target.value })}
          className="w-full border p-3 rounded"
          required
        />
        <textarea
          placeholder="Description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="w-full border p-3 rounded"
          required
        />
        <input
          type="number"
          placeholder="Amount"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
          className="w-full border p-3 rounded"
        />
        <input
          placeholder="Pickup Address"
          value={form.pickup_address}
          onChange={(e) => setForm({ ...form, pickup_address: e.target.value })}
          className="w-full border p-3 rounded"
        />
        <input
          placeholder="Delivery Address"
          value={form.delivery_address}
          onChange={(e) => setForm({ ...form, delivery_address: e.target.value })}
          className="w-full border p-3 rounded"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create Order'}
        </button>
      </form>
    </div>
  );
}
