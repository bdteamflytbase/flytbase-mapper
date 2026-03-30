import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Props { output: any; }

export default function Viewer2D({ output }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Guard: wait for container to be in DOM with dimensions
    if (container.clientWidth === 0 || container.clientHeight === 0) return;

    const map = L.map(container, { zoomControl: true, attributionControl: false });
    mapRef.current = map;

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 22 }).addTo(map);

    if (output?.tile_url) {
      L.tileLayer(output.tile_url, { tms: false, opacity: 1, maxZoom: 24 }).addTo(map);

      const tilejsonUrl = output.tile_url.replace('/tiles/WebMercatorQuad/{z}/{x}/{y}.png?', '/WebMercatorQuad/tilejson.json?');

      fetch(tilejsonUrl)
        .then(r => r.json())
        .then(tj => {
          if (!mapRef.current) return; // component unmounted
          if (tj.bounds) {
            const [w, s, e, n] = tj.bounds;
            mapRef.current.fitBounds([[s, w], [n, e]], { padding: [20, 20] });
          }
        })
        .catch(() => {
          if (mapRef.current) mapRef.current.setView([18.56, 73.70], 17);
        });
    } else {
      map.setView([20, 78], 5);
    }

    return () => {
      mapRef.current = null;
      map.remove();
    };
  }, [output?._id]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
