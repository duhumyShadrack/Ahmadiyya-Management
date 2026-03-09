// app/settings/page.tsx
'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';

export default function Settings() {
  const supabase = createClient();
  const [newService, setNewService] = useState({ name: '', description: '', default_price: '' });

  const handleAddService = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('service_types').insert({
      name: newService.name,
      description: newService.description,
      default_price: parseFloat(newService.default_price) || null,
    });

    if (error) toast.error('Failed to add service');
    else {
      toast.success('Service type added');
      setNewService({ name: '', description: '', default_price: '' });
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>

      <section className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Service Catalog</h2>
        <form onSubmit={handleAddService} className="space-y-4">
          <input
            value={newService.name}
            onChange={e => setNewService({...newService, name: e.target.value})}
            placeholder="Service Name (e.g., Furniture Assembly)"
            required
            className="border p-3 w-full rounded"
          />
          <input
            value={newService.description}
            onChange={e => setNewService({...newService, description: e.target.value})}
            placeholder="Description"
            className="border p-3 w-full rounded"
          />
          <input
            type="number"
            value={newService.default_price}
            onChange={e => setNewService({...newService, default_price: e.target.value})}
            placeholder="Default Price ($)"
            className="border p-3 w-full rounded"
          />
          <button type="submit" className="bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700">
            Add Service Type
          </button>
        </form>
      </section>
    </div>
  );
}
