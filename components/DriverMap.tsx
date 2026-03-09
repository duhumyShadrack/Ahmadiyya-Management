'use client';

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

interface DriverMapProps {
  driversLocations: { driver_id: string; latitude: number; longitude: number }[];
}

export default function DriverMap({ driversLocations }: DriverMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://api.maptiler.com/maps/streets/style.json?key=YOUR_MAPTILER_KEY', // free key from maptiler.com
      center: [driversLocations[0]?.longitude || -88.5, driversLocations[0]?.latitude || 17.5], // Belize default
      zoom: 10,
    });

    driversLocations.forEach((loc) => {
      new maplibregl.Marker()
        .setLngLat([loc.longitude, loc.latitude])
        .addTo(map.current!);
    });

    return () => map.current?.remove();
  }, [driversLocations]);

  return <div ref={mapContainer} className="w-full h-96 rounded-lg shadow-md" />;
}
