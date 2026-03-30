import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = process.env.NX_MAPBOX_TOKEN ;

const STYLES: Record<string, { label: string; url: string }> = {
  satellite: { label: 'Satellite', url: 'mapbox://styles/mapbox/satellite-streets-v12' },
  dark: { label: 'Dark', url: 'mapbox://styles/mapbox/dark-v11' },
  street: { label: 'Street', url: 'mapbox://styles/mapbox/streets-v12' },
};

interface Props {
  markers: { lat: number; lng: number }[];
}

export default function PhotoMarkerMap({ markers }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [activeStyle, setActiveStyle] = useState('satellite');
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const container = containerRef.current;
    if (!container || container.clientWidth === 0) return;

    const map = new mapboxgl.Map({
      container,
      style: STYLES.satellite.url,
      center: [73.70, 18.56],
      zoom: 16,
      attributionControl: false,
    });

    map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');
    map.on('load', () => {
      if (mountedRef.current) addMarkers(map, markers);
    });
    mapRef.current = map;

    return () => {
      mountedRef.current = false;
      mapRef.current = null;
      map.remove();
    };
  }, []);

  // Style change — only if map still alive
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mountedRef.current) return;
    try {
      map.setStyle(STYLES[activeStyle]?.url || STYLES.satellite.url);
      map.once('style.load', () => {
        if (mountedRef.current && mapRef.current) addMarkers(mapRef.current, markers);
      });
    } catch {}
  }, [activeStyle]);

  // Update markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mountedRef.current) return;
    if (map.isStyleLoaded()) {
      addMarkers(map, markers);
    } else {
      map.once('style.load', () => {
        if (mountedRef.current && mapRef.current) addMarkers(mapRef.current, markers);
      });
    }
  }, [markers]);

  function addMarkers(map: mapboxgl.Map, pts: { lat: number; lng: number }[]) {
    for (const m of markersRef.current) m.remove();
    markersRef.current = [];
    try {
      if (map.getLayer('traj-line')) map.removeLayer('traj-line');
      if (map.getSource('traj')) map.removeSource('traj');
    } catch {}

    const valid = pts.filter(p => p.lat !== 0 && p.lng !== 0);
    if (valid.length === 0) return;

    for (const p of valid) {
      const el = document.createElement('div');
      Object.assign(el.style, { width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#2C7BF2', border: '2px solid #fff', boxShadow: '0 0 4px rgba(0,0,0,0.5)' });
      const marker = new mapboxgl.Marker({ element: el }).setLngLat([p.lng, p.lat]).addTo(map);
      markersRef.current.push(marker);
    }

    if (valid.length > 1) {
      map.addSource('traj', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: valid.map(p => [p.lng, p.lat]) } } });
      map.addLayer({ id: 'traj-line', type: 'line', source: 'traj', paint: { 'line-color': 'rgba(44,123,242,0.5)', 'line-width': 2, 'line-dasharray': [2, 2] } });
    }

    const bounds = new mapboxgl.LngLatBounds();
    for (const p of valid) bounds.extend([p.lng, p.lat]);
    map.fitBounds(bounds, { padding: 60, maxZoom: 18 });
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: 4, zIndex: 10 }}>
        {Object.entries(STYLES).map(([key, { label }]) => (
          <button key={key} onClick={() => setActiveStyle(key)} style={{
            padding: '4px 10px', fontSize: 10, fontWeight: 600,
            background: activeStyle === key ? 'var(--fb-primary)' : 'rgba(0,0,0,0.6)',
            color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer',
          }}>{label}</button>
        ))}
      </div>
    </div>
  );
}
