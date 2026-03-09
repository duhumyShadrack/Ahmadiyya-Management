'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';

export default function Profile() {
  const supabase = createClient();
  const [form, setForm] = useState({ name: '', phone: '', address: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase.from('customers').select('name, phone, address').eq('email', user.email).single();
      if (data) setForm(data);
      setLoading(false);
    }
    load();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('customers').update(form).eq('email', user?.email);
    if (error) toast.error('Update failed');
    else toast.success('Profile updated!');
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl mb-6">Your Profile</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Name" className="border p-2 w-full" />
        <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="Phone" className="border p-2 w-full" />
        <input value={form.address} onChange={e => setForm({...form, address: e.target.value})} placeholder="Address" className="border p-2 w-full" />
        <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded">Save</button>
      </form>
    </div>
  );
}
