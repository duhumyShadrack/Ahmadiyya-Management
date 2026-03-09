'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export default function TimeClockPunch() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'punching'>('loading');
  const [lastPunch, setLastPunch] = useState<any>(null);

  useEffect(() => {
    // Optional: fetch last punch on load
    async function fetchLastPunch() {
      const res = await fetch('/api/time-clock/last'); // create this endpoint if needed
      if (res.ok) {
        const data = await res.json();
        setLastPunch(data);
      }
      setStatus('ready');
    }
    fetchLastPunch();
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
            body: JSON.stringify({ type, latitude, longitude, accuracy }),
          });

          const data = await res.json();

          if (res.ok) {
            toast.success(data.message);
            setLastPunch({ type, timestamp: new Date(), latitude, longitude });
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
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 mt-8">
      <h2 className="text-xl font-bold mb-4">Time Clock</h2>

      {lastPunch && (
        <div className="mb-6 p-4 bg-gray-50 rounded border">
          <p className="font-medium">
            Last action: <span className="capitalize">{lastPunch.type === 'in' ? 'Clocked In' : 'Clocked Out'}</span>
          </p>
          <p className="text-sm text-gray-600">
            {new Date(lastPunch.timestamp).toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Location: {lastPunch.latitude.toFixed(6)}, {lastPunch.longitude.toFixed(6)}
          </p>
        </div>
      )}

      <div className="flex gap-4">
        <button
          onClick={() => handlePunch('in')}
          disabled={status === 'punching'}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-md font-medium disabled:opacity-50 transition-colors"
        >
          {status === 'punching' ? 'Punching...' : 'Punch In'}
        </button>

        <button
          onClick={() => handlePunch('out')}
          disabled={status === 'punching'}
          className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 px-6 rounded-md font-medium disabled:opacity-50 transition-colors"
        >
          {status === 'punching' ? 'Punching...' : 'Punch Out'}
        </button>
      </div>

      {status === 'loading' && <p className="mt-4 text-gray-500">Checking status...</p>}
    </div>
  );
}
