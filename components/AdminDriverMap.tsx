'use client';

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

interface Props {
  locations: { driver_id: string; latitude: number; longitude: number; email?: string; last_updated?: string }[];
}

export default function AdminDriverMap({ locations }: Props) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<maplibregl.Marker[]>([]);

  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://api.maptiler.com/maps/streets/style.json?key=YOUR_MAPTILER_KEY', // sign up free at maptiler.com
      center: [-88.2, 17.5], // Belize City fallback
      zoom: 11,
    });

    markers.current.forEach(m => m.remove());
    markers.current = [];

    locations.forEach(loc => {
      if (loc.latitude && loc.longitude) {
        const marker = new maplibregl.Marker({ color: '#FF5733' })
          .setLngLat([loc.longitude, loc.latitude])
          .setPopup(
            new maplibregl.Popup().setHTML(`
              <h3 class="font-bold">${loc.email || 'Driver'}</h3>
              <p>Last updated: ${loc.last_updated ? new Date(loc.last_updated).toLocaleString() : 'N/A'}</p>
              <p>Lat: ${loc.latitude.toFixed(6)}, Lng: ${loc.longitude.toFixed(6)}</p>
            `)
          )
          .addTo(map.current!);
        markers.current.push(marker);
      }
    });

    return () => map.current?.remove();
  }, [locations]);

  return <div ref={mapContainer} className="w-full h-96 rounded-xl shadow-lg border border-gray-200" />;
}
