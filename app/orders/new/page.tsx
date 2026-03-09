'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function NewOrder() {
  const router = useRouter();
  const supabase = createClient();

  const = useState([]);
  const = useState({
    customerId: '',
    description: '',
    amount: '',
    pickup: '',
    delivery: '',
  });
  const = useState(false);

  // Load customers
  useEffect(() => {
    async function fetchCustomers() {
      const { data } = await supabase
        .from('customers')
        .select('id, name, phone, address')
        .order('name');
      setCustomers(data ?? []);
    }
    fetchCustomers();
  }, []);

  // Autofill pickup address
  const handleCustomerChange = (e) => {
    const selected = customers.find(c => c.id === e.target.value);
    if (selected) {
      setForm({
        ...form,
        customerId: selected.id,
        pickup: selected.address || '',
      });
    } else {
      setForm({ ...form, customerId: '', pickup: '' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert('Please log in first');
      setLoading(false);
      return;
    }

    const { error } = await supabase.from('orders').insert({
      customer_id: form.customerId,
      description: form.description,
      amount: parseFloat(form.amount) || 0,
      pickup_address: form.pickup,
      delivery_address: form.delivery,
      status: 'pending',
      profile_id: user.id, // who created it
    });

    if (error) {
      alert('Error: ' + error.message);
    } else {
      alert('Order placed!');
      router.push('/dashboard');
    }
    setLoading(false);
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Place New Order</h1>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
        <div>
          <label className="block mb-1">Customer</label>
          <select
            value={form.customerId}
            onChange={handleCustomerChange}
            className="border p-2 w-full rounded"
            required
          >
            <option value="">Select customer...</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.phone || 'no phone'})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block mb-1">What are we delivering?</label>
          <input
            type="text"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="border p-2 w-full rounded"
            required
          />
        </div>

        <div>
          <label className="block mb-1">Amount ($)</label>
          <input
            type="number"
            step="0.01"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            className="border p-2 w-full rounded"
          />
        </div>

        <div>
          <label className="block mb-1">Pickup Address</label>
          <input
            type="text"
            value={form.pickup}
            onChange={(e) => setForm({ ...form, pickup: e.target.value })}
            className="border p-2 w-full rounded"
            required
          />
        </div>

        <div>
          <label className="block mb-1">Delivery Address</label>
          <input
            type="text"
            value={form.delivery}
            onChange={(e) => setForm({ ...form, delivery: e.target.value })}
            className="border p-2 w-full rounded"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading || !form.customerId}
          className={`px-6 py-3 rounded text-white ${loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
        >
          {loading ? 'Placing...' : 'Submit Order'}
        </button>
      </form>
    </div>
  );
}
