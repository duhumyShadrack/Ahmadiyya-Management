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

  // Load customers & service types on mount
  useEffect(() => {
    async function fetchData() {
      // Customers
      const { data: custData, error: custErr } = await supabase
        .from('customers')
        .select('id, name, phone, address')
        .order('name');

      if (custErr) toast.error('Failed to load customers');
      else setCustomers(custData || []);

      // Dynamic service types
      const { data: serviceData, error: serviceErr } = await supabase
        .from('service_types')
        .select('id, name, description, default_price')
        .order('name');

      if (serviceErr) toast.error('Failed to load service types');
      else setServiceTypes(serviceData || []);
    }

    fetchData();
  }, [supabase]);

  // Autofill pickup address & price when selections change
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

  // File attachments
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(Array.from(e.target.files));
    }
  };

  // Upload files to Supabase Storage
  const uploadAttachments = async () => {
    if (attachments.length === 0) return [];

    setUploading(true);
    const urls: string[] = [];

    try {
      for (const file of attachments) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
        const filePath = `job-attachments/${fileName}`;

        const { error: uploadErr } = await supabase.storage
          .from('attachments') // Create this public bucket in Supabase Storage if not exists
          .upload(filePath, file);

        if (uploadErr) throw uploadErr;

        const { data: publicUrl } = sup
