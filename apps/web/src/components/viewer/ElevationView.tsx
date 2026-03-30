import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Props { dsm?: any; dtm?: any; }

export default function ElevationView({ dsm, dtm }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [activeLayer, setActiveLayer] = useState<'dsm' | 'dtm'>('dsm');
  const active = activeLayer === 'dsm' ? dsm : dtm;

  useEffect(() => {
    const container = containerRef.current;
    if (!container || container.clientWidth === 0) return;

    const map = L.map(container, { zoomControl: true, attributionControl: false });
    mapRef.current = map;
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 22 }).addTo(map);
    map.setView([18.56, 73.70], 17);

    return () => { mapRef.current = null; map.remove(); };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !active?.tile_url) return;

    map.eachLayer((layer: any) => { if (layer.options?.attribution === 'elev') map.removeLayer(layer); });

    const statsUrl = active.tile_url.replace('/tiles/WebMercatorQuad/{z}/{x}/{y}.png?', '/statistics?');
    const tilejsonUrl = active.tile_url.replace('/tiles/WebMercatorQuad/{z}/{x}/{y}.png?', '/WebMercatorQuad/tilejson.json?');

    fetch(statsUrl).then(r => r.json()).then(stats => {
      if (!mapRef.current) return;
      const b1 = stats.b1 || Object.values(stats)[0] as any;
      const min = Math.floor(b1?.min ?? 0);
      const max = Math.ceil(b1?.max ?? 100);
      L.tileLayer(`${active.tile_url}&colormap_name=terrain&rescale=${min},${max}`, {
        attribution: 'elev', opacity: 0.9, maxZoom: 24,
      }).addTo(mapRef.current);
    }).catch(() => {
      if (mapRef.current) {
        L.tileLayer(`${active.tile_url}&colormap_name=terrain`, { attribution: 'elev', opacity: 0.9, maxZoom: 24 }).addTo(mapRef.current);
      }
    });

    fetch(tilejsonUrl).then(r => r.json()).then(tj => {
      if (!mapRef.current || !tj.bounds) return;
      const [w, s, e, n] = tj.bounds;
      mapRef.current.fitBounds([[s, w], [n, e]], { padding: [20, 20] });
    }).catch(() => {});
  }, [active]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 1000, display: 'flex', gap: 4 }}>
        {dsm && <StyleBtn label="DSM" active={activeLayer === 'dsm'} onClick={() => setActiveLayer('dsm')} />}
        {dtm && <StyleBtn label="DTM" active={activeLayer === 'dtm'} onClick={() => setActiveLayer('dtm')} />}
      </div>
      <div style={{
        position: 'absolute', bottom: 16, left: 16, zIndex: 1000,
        background: 'rgba(17,24,39,0.9)', borderRadius: 8, padding: '8px 12px', fontSize: 11, color: 'var(--fb-text-3)',
      }}>
        <p style={{ marginBottom: 4 }}>Elevation</p>
        <div style={{ width: 100, height: 10, borderRadius: 4, background: 'linear-gradient(to right, #313695,#4575b4,#74add1,#abd9e9,#ffffbf,#fee090,#fdae61,#f46d43,#d73027,#a50026)' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2, fontSize: 9 }}><span>Low</span><span>High</span></div>
      </div>
    </div>
  );
}

function StyleBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: '4px 12px', fontSize: 11, fontWeight: 600, borderRadius: 6, border: 'none', cursor: 'pointer',
      background: active ? 'var(--fb-primary)' : 'rgba(0,0,0,0.6)', color: '#fff',
    }}>{label}</button>
  );
}
