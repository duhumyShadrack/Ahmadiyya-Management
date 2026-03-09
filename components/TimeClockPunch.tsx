'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export default function TimeClockPunch() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'punching'>('loading');
  const [lastPunch, setLastPunch] = useState<{ type: string; timestamp: string } | null>(null);
  const [jobSites, setJobSites] = useState<any[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');

  useEffect(() => {
    async function fetchSites() {
      const res = await fetch('/api/job-sites');
      if (res.ok) {
        const data = await res.json();
        setJobSites(data || []);
        if (data?.length > 0) setSelectedSiteId(data[0].id);
      } else {
        toast.error('Failed to load job sites');
      }
      setStatus('ready');
    }
    fetchSites();
  }, []);

  const handlePunch = async (type: 'in' | 'out') => {
    setStatus('punching');

    if (!navigator.geolocation) {
      toast.error('Location not supported');
      setStatus('ready');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;

        try {
          const res = await fetch('/api/time-clock/punch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, latitude, longitude, accuracy, job_site_id: selectedSiteId }),
          });

          const data = await res.json();

          if (res.ok) {
            toast.success(data.message);
            setLastPunch({ type, timestamp: new Date().toISOString() });
          } else {
            toast.error(data.error || 'Punch failed');
          }
        } catch (err) {
          toast.error('Network error');
        } finally {
          setStatus('ready');
        }
      },
      (err) => {
        toast.error(`Location error: ${err.message}`);
        setStatus('ready');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
      <h2 className="text-xl font-semibold mb-4">Time Clock</h2>
      <select
        value={selectedSiteId}
        onChange={e => setSelectedSiteId(e.target.value)}
        className="border p-3 w-full rounded mb-4"
      >
        <option value="">Select Job Site</option>
        {jobSites.map(site => (
          <option key={site.id} value={site.id}>
            {site.name} ({site.radius_meters}m radius)
          </option>
        ))}
      </select>
      {lastPunch && (
        <p className="mb-4 text-sm text-gray-600">
          Last punch: {lastPunch.type.toUpperCase()} at {new Date(lastPunch.timestamp).toLocaleString()}
        </p>
      )}

      <div className="flex gap-4">
        <button onClick={() => handlePunch('in')} disabled={status === 'punching' || !selectedSiteId} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded disabled:opacity-50">
          {status === 'punching' ? 'Punching...' : 'Punch In'}
        </button>
        <button onClick={() => handlePunch('out')} disabled={status === 'punching' || !selectedSiteId} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded disabled:opacity-50">
          {status === 'punching' ? 'Punching...' : 'Punch Out'}
        </button>
      </div>
    </div>
  );
}
