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

  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://api.maptiler.com/maps/streets/style.json?key=YOUR_MAPTILER_KEY',
      center: [-88.2, 17.5],
      zoom: 11,
    });

    locations.forEach(loc => {
      if (loc.latitude && loc.longitude) {
        new maplibregl.Marker({ color: '#FF5733' })
          .setLngLat([loc.longitude, loc.latitude])
          .setPopup(new maplibregl.Popup().setHTML(`<h3>${loc.email || 'Driver'}</h3><p>Updated: ${loc.last_updated ? new Date(loc.last_updated).toLocaleString() : 'N/A'}</p>`))
          .addTo(map.current!);
      }
    });

    return () => map.current?.remove();
  }, [locations]);

  return <div ref={mapContainer} className="w-full h-96 rounded-xl shadow-lg border" />;
}
