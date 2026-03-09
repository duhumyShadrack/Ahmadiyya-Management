'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';

export default function NewJob() {
  const router = useRouter();
  const supabase = createClient();

  const [customers, setCustomers] = useState<any[]>([]);
  const [serviceTypes, setServiceTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    customerId: '',
    serviceTypeId: '',
    description: '',
    amount: '',
    pickupAddress: '',
    deliveryAddress: '',
    urgency: 'normal',
    notes: '',
  });
  const [attachments, setAttachments] = useState<File[]>([]);
  const [attachmentUrls, setAttachmentUrls] = useState<string[]>([]);

  // Load customers & service types
  useEffect(() => {
    async function fetchData() {
      // Customers
      const { data: custData, error: custErr } = await supabase
        .from('customers')
        .select('id, name, phone, address')
        .order('name');

      if (custErr) toast.error('Failed to load customers');
      else setCustomers(custData || []);

      // Service Types (dynamic)
      const { data: serviceData, error: serviceErr } = await supabase
        .from('service_types')
        .select('id, name, description, default_price')
        .order('name');

      if (serviceErr) toast.error('Failed to load service types');
      else setServiceTypes(serviceData || []);
    }

    fetchData();
  }, [supabase]);

  // Autofill pickup & price when selections change
  const handleCustomerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const selected = customers.find(c => c.id === selectedId);

    setForm(prev => ({
      ...prev,
      customerId: selectedId,
      pickupAddress: selected?.address || '',
    }));
  };

  const handleServiceTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const selected = serviceTypes.find(s => s.id === selectedId);

    setForm(prev => ({
      ...prev,
      serviceTypeId: selectedId,
      amount: selected?.default_price ? selected.default_price.toString() : '',
    }));
  };

  // Handle file attachments
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(Array.from(e.target.files));
    }
  };

  const uploadAttachments = async () => {
    if (attachments.length === 0) return [];

    setUploading(true);
    const urls: string[] = [];

    for (const file of attachments) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
      const filePath = `job-attachments/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('attachments') // create this bucket in Supabase Storage
        .upload(filePath, file);

      if (uploadError) {
        toast.error(`Failed to upload ${file.name}`);
        continue;
      }

      const { data: publicUrl } = supabase.storage
        .from('attachments')
        .getPublicUrl(filePath);

      urls.push(publicUrl.publicUrl);
    }

    setUploading(false);
    return urls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('You must be logged in');

      if (!form.customerId || !form.serviceTypeId || !form.description) {
        throw new Error('Required fields missing');
      }

      // Upload attachments first
      const uploadedUrls = await uploadAttachments();

      const { error } = await supabase.from('jobs').insert({
        customer_id: form.customerId,
        service_type_id: form.serviceTypeId,
        description: form.description,
        amount: form.amount ? parseFloat(form.amount) : null,
        pickup_address: form.pickupAddress || null,
        delivery_address: form.deliveryAddress || null,
        urgency: form.urgency,
        notes: form.notes || null,
        attachments: uploadedUrls.length > 0 ? uploadedUrls : null,
        status: 'pending',
        created_by: user.id,
      });

      if (error) throw error;

      toast.success('Job created successfully!');
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create job');
      console.error(err);
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Create New Job / Task</h1>

      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-lg border border-gray-200 space-y-6">
        {/* Service Type */}
        <div>
          <label htmlFor="serviceTypeId" className="block text-sm font-medium text-gray-700 mb-1">
            Service Type <span className="text-red-500">*</span>
          </label>
          <select
            id="serviceTypeId"
            value={form.serviceTypeId}
            onChange={handleServiceTypeChange}
            required
            className="w-full border border-gray-300 rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select Service Type</option>
            {serviceTypes.map(s => (
              <option key={s.id} value={s.id}>
                {s.name} {s.default_price ? `($${s.default_price})` : ''}
              </option>
            ))}
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

        {/* Urgency */}
        <div>
          <label htmlFor="urgency" className="block text-sm font-medium text-gray-700 mb-1">
            Urgency Level
          </label>
          <select
            id="urgency"
            value={form.urgency}
            onChange={e => setForm({ ...form, urgency: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="normal">Normal</option>
            <option value="urgent">Urgent (within 24h)</option>
            <option value="emergency">Emergency (ASAP)</option>
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

        {/* Notes */}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
            Additional Notes
          </label>
          <textarea
            id="notes"
            value={form.notes}
            onChange={e => setForm({ ...form, notes: e.target.value })}
            rows={3}
            className="w-full border border-gray-300 rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Any extra information (e.g., access codes, special tools needed)..."
          />
        </div>

        {/* Amount (auto-filled from service type) */}
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
            placeholder="0.00 (auto-filled from service type)"
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

        {/* Attachments */}
        <div>
          <label htmlFor="attachments" className="block text-sm font-medium text-gray-700 mb-1">
            Attachments (photos, documents, etc.)
          </label>
          <input
            id="attachments"
            type="file"
            multiple
            accept="image/*,application/pdf"
            onChange={handleFileChange}
            className="w-full border border-gray-300 rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {attachments.length > 0 && (
            <p className="mt-2 text-sm text-gray-600">
              {attachments.length} file(s) selected {uploading ? '(uploading...)' : ''}
            </p>
          )}
        </div>

        {/* Submit */}
        <div className="pt-6">
          <button
            type="submit"
            disabled={loading || uploading || !form.customerId || !form.serviceTypeId || !form.description}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading || uploading ? 'Creating Job...' : 'Create New Job'}
          </button>
        </div>
      </form>
    </div>
  );
}
