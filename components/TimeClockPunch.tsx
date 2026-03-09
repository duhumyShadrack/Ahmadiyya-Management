'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export default function TimeClockPunch() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'punching'>('loading');
  const [lastPunch, setLastPunch] = useState<{ type: string; timestamp: string } | null>(null);

  useEffect(() => {
    // Optional: fetch last punch (you can create /api/time-clock/last later)
    setStatus('ready');
  }, []);

  const handlePunch = async (type: 'in' | 'out') => {
    setStatus('punching');

    if (!navigator.geolocation) {
      toast.error('Location services not available');
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
            setLastPunch({ type, timestamp: new Date().toISOString() });
          } else {
            toast.error(data.error || 'Could not record punch');
          }
        } catch (err) {
          toast.error('Network error – please try again');
        } finally {
          setStatus('ready');
        }
      },
      (err) => {
        toast.error(`Location error: ${err.message}`);
        setStatus('ready');
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
      <h2 className="text-xl font-bold mb-5 text-gray-800">Time Clock</h2>

      {lastPunch && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <p className="font-medium text-lg">
            Last: <span className={lastPunch.type === 'in' ? 'text-green-700' : 'text-red-700'}>
              Clocked {lastPunch.type.toUpperCase()}
            </span>
          </p>
          <p className="text-sm text-gray-600 mt-1">
            {new Date(lastPunch.timestamp).toLocaleString()}
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => handlePunch('in')}
          disabled={status === 'punching'}
          className="bg-green-600 hover:bg-green-700 text-white py-4 px-6 rounded-lg font-semibold text-lg disabled:opacity-60 transition-all shadow-sm"
        >
          {status === 'punching' ? 'Punching In...' : 'Punch In'}
        </button>

        <button
          onClick={() => handlePunch('out')}
          disabled={status === 'punching'}
          className="bg-red-600 hover:bg-red-700 text-white py-4 px-6 rounded-lg font-semibold text-lg disabled:opacity-60 transition-all shadow-sm"
        >
          {status === 'punching' ? 'Punching Out...' : 'Punch Out'}
        </button>
      </div>

      {status === 'loading' && <p className="mt-6 text-gray-500 text-center">Initializing...</p>}
    </div>
  );
}
