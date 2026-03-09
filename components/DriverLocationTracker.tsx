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
        setError('Geolocation not supported');
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

            if (!res.ok) throw new Error('Update failed');

            setStatus('active');
          } catch (err: any) {
            setError(err.message);
            toast.error('Location update failed');
          }
        },
        (err) => {
          setError(err.message);
          setStatus('denied');
          toast.error(`Location permission: ${err.message}`);
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
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

    // Auto-start if driver wants (or add toggle button)
    // startTracking(); // Uncomment for auto-start

    return () => stopTracking();
  }, []);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
      <h3 className="text-lg font-semibold mb-3">Driver Location Sharing</h3>

      {status === 'off' && (
        <button
          onClick={() => {
            // Toggle start
            navigator.geolocation.getCurrentPosition(() => {}, () => {}, {}); // Trigger permission
            // start logic is in useEffect
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-md font-medium"
        >
          Start Sharing Location
        </button>
      )}

      {status === 'requesting' && <p className="text-blue-600">Requesting permission...</p>}
      {status === 'active' && <p className="text-green-600 font-medium">Sharing live location (updated every few seconds)</p>}
      {status === 'denied' && (
        <p className="text-red-600">
          Location access denied. {error && `(${error})`}
          <br />
          <button
            onClick={() => window.location.reload()}
            className="mt-2 text-blue-600 underline"
          >
            Retry
          </button>
        </p>
      )}
    </div>
  );
}
