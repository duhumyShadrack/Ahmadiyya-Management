'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';

export default function Signup() {
  const router = useRouter();
  const supabase = createClient();
  const [form, setForm] = useState({ email: '', password: '', name: '', phone: '' });
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { full_name: form.name } },
    });

    if (error) {
      toast.error(error.message);
    } else if (data.user) {
      // Auto create customer & profile
      await supabase.from('customers').insert({
        name: form.name,
        phone: form.phone,
        email: form.email,
        address: '',
        balance: 0,
        credit_approved: false,
      });

      await supabase.from('profiles').upsert({
        id: data.user.id,
        email: form.email,
        role: 'customer',
      });

      toast.success('Account created! Check email if confirmation needed.');
      router.push('/dashboard');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto p-8 mt-20 bg-white rounded shadow">
      <h1 className="text-3xl mb-6">Sign Up</h1>
      <input placeholder="Name" onChange={e => setForm({...form, name: e.target.value})} className="border p-3 w-full mb-4" />
      <input placeholder="Phone" onChange={e => setForm({...form, phone: e.target.value})} className="border p-3 w-full mb-4" />
      <input placeholder="Email" onChange={e => setForm({...form, email: e.target.value})} className="border p-3 w-full mb-4" />
      <input type="password" placeholder="Password" onChange={e => setForm({...form, password: e.target.value})} className="border p-3 w-full mb-4" />
      <button onClick={handleSignup} disabled={loading} className="bg-blue-600 text-white w-full py-3 rounded">
        {loading ? 'Creating...' : 'Sign Up'}
      </button>
    </div>
  );
}
