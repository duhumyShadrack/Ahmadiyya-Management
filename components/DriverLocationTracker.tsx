'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';

export default function DriverLocationTracker() {
  const supabase = createClient();
  const [status, setStatus] = useState<'off' | 'requesting' | 'active' | 'denied'>('off');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let watchId: number | null = null;

    const startTracking = () => {
      setStatus('requesting');
      setError(null);

      if (!navigator.geolocation) {
        setError('Geolocation is not supported by your browser');
        setStatus('denied');
        return;
      }

      watchId = navigator.geolocation.watchPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;

          try {
            const res = await fetch('/api/driver/location', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ latitude, longitude }),
            });

            if (!res.ok) {
              const err = await res.json();
              throw new Error(err.error || 'Failed to send location');
            }

            setStatus('active');
          } catch (err: any) {
            setError(err.message);
            toast.error('Location update failed');
            setStatus('denied');
          }
        },
        (err) => {
          setError(err.message);
          setStatus('denied');
          toast.error(`Location permission denied: ${err.message}`);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    };

    const stopTracking = () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }
      setStatus('off');
    };

    // Auto-start tracking when component mounts (driver dashboard)
    startTracking();

    return () => stopTracking();
  }, []);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Live Location Sharing</h3>
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            status === 'active'
              ? 'bg-green-100 text-green-800'
              : status === 'denied'
              ? 'bg-red-100 text-red-800'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {status === 'active'
            ? 'Active'
            : status === 'requesting'
            ? 'Requesting...'
            : status === 'denied'
            ? 'Denied'
            : 'Off'}
        </span>
      </div>

      {status === 'off' && (
        <button
          onClick={() => {
            // Trigger permission request
            navigator.geolocation.getCurrentPosition(() => {}, () => {}, {});
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-md font-medium"
        >
          Enable Location Sharing
        </button>
      )}

      {status === 'active' && (
        <p className="text-green-700 text-sm">
          Your location is being shared in real-time. Admins can see your position on the map.
        </p>
      )}

      {error && (
        <p className="mt-4 text-red-600 text-sm">
          {error}
          <button
            onClick={() => window.location.reload()}
            className="ml-3 text-blue-600 underline"
          >
            Retry
          </button>
        </p>
      )}
    </div>
  );
}
