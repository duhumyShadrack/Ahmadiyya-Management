'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';

export default function NewJob() {
  const router = useRouter();
  const supabase = createClient();

  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    customerId: '',
    serviceType: '',
    description: '',
    amount: '',
    pickupAddress: '',
    deliveryAddress: '',
  });

  // Load customers for dropdown
  useEffect(() => {
    async function fetchCustomers() {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, phone, address')
        .order('name');

      if (error) {
        toast.error('Failed to load customers');
      } else {
        setCustomers(data || []);
      }
    }

    fetchCustomers();
  }, [supabase]);

  // Autofill pickup address when customer is selected
  const handleCustomerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const selected = customers.find(c => c.id === selectedId);

    setForm(prev => ({
      ...prev,
      customerId: selectedId,
      pickupAddress: selected?.address || '',
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in to create a job');
        return;
      }

      if (!form.customerId || !form.serviceType || !form.description) {
        toast.error('Please fill all required fields');
        return;
      }

      const { error } = await supabase.from('jobs').insert({
        customer_id: form.customerId,
        service_type: form.serviceType,
        description: form.description,
        amount: form.amount ? parseFloat(form.amount) : null,
        pickup_address: form.pickupAddress || null,
        delivery_address: form.deliveryAddress || null,
        status: 'pending',
        created_by: user.id,
      });

      if (error) throw error;

      toast.success('Job created successfully!');
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create job');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Create New Job / Task</h1>

      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-lg border border-gray-200 space-y-6">
        {/* Service Type */}
        <div>
          <label htmlFor="serviceType" className="block text-sm font-medium text-gray-700 mb-1">
            Service Type <span className="text-red-500">*</span>
          </label>
          <select
            id="serviceType"
            name="service_type"
            value={form.serviceType}
            onChange={e => setForm({ ...form, serviceType: e.target.value })}
            required
            className="w-full border border-gray-300 rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select Service Type</option>
            <option value="delivery">Delivery / Courier</option>
            <option value="cleaning">Cleaning / Housekeeping</option>
            <option value="repair">Repair / Handyman</option>
            <option value="installation">Installation / Assembly</option>
            <option value="moving">Moving / Relocation Help</option>
            <option value="other">Other Custom Service</option>
          </select>
        </div>

        {/* Customer */}
        <div>
          <label htmlFor="customerId" className="block text-sm font-medium text-gray-700 mb-1">
            Customer <span className="text-red-500">*</span>
          </label>
          <select
            id="customerId"
            value={form.customerId}
            onChange={handleCustomerChange}
            required
            className="w-full border border-gray-300 rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select Customer</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>
                {c.name} {c.phone ? `(${c.phone})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Job Details / Description <span className="text-red-500">*</span>
          </label>
          <textarea
            id="description"
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            required
            rows={4}
            className="w-full border border-gray-300 rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Describe the job, requirements, special instructions..."
          />
        </div>

        {/* Amount */}
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
            Price / Quote ($)
          </label>
          <input
            id="amount"
            type="number"
            step="0.01"
            value={form.amount}
            onChange={e => setForm({ ...form, amount: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="0.00"
          />
        </div>

        {/* Addresses */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="pickupAddress" className="block text-sm font-medium text-gray-700 mb-1">
              Pickup / Start Location
            </label>
            <input
              id="pickupAddress"
              value={form.pickupAddress}
              onChange={e => setForm({ ...form, pickupAddress: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Customer address or pickup point"
            />
          </div>

          <div>
            <label htmlFor="deliveryAddress" className="block text-sm font-medium text-gray-700 mb-1">
              Delivery / End Location
            </label>
            <input
              id="deliveryAddress"
              value={form.deliveryAddress}
              onChange={e => setForm({ ...form, deliveryAddress: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Drop-off location or job end point"
            />
          </div>
        </div>

        {/* Submit */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating Job...' : 'Create New Job'}
          </button>
        </div>
      </form>
    </div>
  );
}
