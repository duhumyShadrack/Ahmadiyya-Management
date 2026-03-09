'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';

export default function DriverLocationTracker() {
  const supabase = createClient();
  const [status, setStatus] = useState<'active' | 'error' | 'initializing'>('initializing');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let watchId: number | null = null;

    const startTracking = () => {
      setStatus('initializing');
      setError(null);

      if (!navigator.geolocation) {
        setError('Geolocation not supported on this device');
        setStatus('error');
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
              const errData = await res.json();
              throw new Error(errData.error || 'Location update failed');
            }

            // Only set active once first successful update happens
            setStatus('active');
          } catch (err: any) {
            console.error('Location send error:', err);
            setError(err.message);
            setStatus('error');
            // Optional: toast only once, not every failure
            // toast.error('Failed to send location – will retry');
          }
        },
        (err) => {
          console.error('Geolocation error:', err);
          setError(err.message || 'Location access issue');
          setStatus('error');
        },
        {
          enableHighAccuracy: true,      // most accurate possible
          timeout: 10000,                // wait up to 10s for fix
          maximumAge: 5000,              // accept position up to 5s old
          distanceFilter: 10,            // only update if moved ≥10 meters
        }
      );
    };

    const stopTracking = () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }
    };

    // Start immediately on mount (company phone = no prompt expected)
    startTracking();

    // Restart when tab/app becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        stopTracking();
        startTracking();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopTracking();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Minimal UI — silent operation preferred for company devices
  return (
    <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
      {status === 'active' ? (
        <div className="flex items-center text-sm text-green-700 font-medium">
          <span className="w-3 h-3 bg-green-500 rounded-full mr-2 animate-pulse"></span>
          Location tracking active
        </div>
      ) : status === 'error' ? (
        <div className="text-sm text-red-600">
          Location tracking paused — {error || 'unknown issue'}
        </div>
      ) : (
        <div className="text-sm text-gray-500">Initializing location tracking...</div>
      )}
    </div>
  );
}
