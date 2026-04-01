import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Props {
  src: string;
  alt?: string;
}

export default function ImageViewer({ src, alt = 'Map' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const img = new Image();
    img.onload = () => {
      if (!container || mapRef.current) return;

      const w = img.naturalWidth;
      const h = img.naturalHeight;

      const southWest = L.latLng(0, 0);
      const northEast = L.latLng(h, w);
      const bounds = L.latLngBounds(southWest, northEast);

      const map = L.map(container, {
        crs: L.CRS.Simple,
        minZoom: -5,
        maxZoom: 5,
        zoomSnap: 0,
        zoomDelta: 0.15,
        wheelPxPerZoomLevel: 400,
        wheelDebounceTime: 40,
        zoomAnimation: true,
        fadeAnimation: true,
        attributionControl: false,
        zoomControl: false,
      });

      mapRef.current = map;

      L.imageOverlay(src, bounds).addTo(map);
      map.fitBounds(bounds, { padding: [20, 20] });

      L.control.zoom({ position: 'bottomright' }).addTo(map);
    };

    img.src = src;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [src]);

  return (
    <div ref={containerRef} style={{
      width: '100%', height: '100%',
      background: '#1e2127',
    }} />
  );
}
