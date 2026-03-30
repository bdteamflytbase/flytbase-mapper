import { useRef, useState, useCallback, useEffect } from 'react';
import { ZoomIn, ZoomOut, Maximize2, RotateCcw } from 'lucide-react';

interface Props {
  src: string;
  alt?: string;
  overlay?: React.ReactNode;
  gridType?: 'pixel' | 'geo' | 'elevation';
}

export default function PanZoomViewer({ src, alt = 'Map', overlay, gridType = 'pixel' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // State: camera position (what world-coordinate is at screen center) + zoom
  const [cam, setCam] = useState({ x: 0, y: 0, zoom: 1 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ mx: 0, my: 0, cx: 0, cy: 0 });
  const [loaded, setLoaded] = useState(false);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });

  const MIN_ZOOM = 0.05;
  const MAX_ZOOM = 15;

  // When image loads, center it
  const handleLoad = useCallback(() => {
    const img = imgRef.current;
    const container = containerRef.current;
    if (!img || !container) return;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    setImgSize({ w: iw, h: ih });

    // Fit image to container
    const fitScale = Math.min(cw / iw, ch / ih) * 0.9;
    setCam({ x: iw / 2, y: ih / 2, zoom: fitScale });
    setLoaded(true);
  }, []);

  // World <-> Screen transforms
  const worldToScreen = useCallback((wx: number, wy: number) => {
    const container = containerRef.current;
    if (!container) return { x: 0, y: 0 };
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    return {
      x: (wx - cam.x) * cam.zoom + cw / 2,
      y: (wy - cam.y) * cam.zoom + ch / 2,
    };
  }, [cam]);

  const screenToWorld = useCallback((sx: number, sy: number) => {
    const container = containerRef.current;
    if (!container) return { x: 0, y: 0 };
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    return {
      x: (sx - cw / 2) / cam.zoom + cam.x,
      y: (sy - ch / 2) / cam.zoom + cam.y,
    };
  }, [cam]);

  // Wheel zoom — zooms toward cursor position
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    // World point under cursor (before zoom)
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const worldX = (sx - cw / 2) / cam.zoom + cam.x;
    const worldY = (sy - ch / 2) / cam.zoom + cam.y;

    // Gentle zoom factor
    const delta = -e.deltaY;
    const factor = 1 + Math.sign(delta) * 0.08;

    setCam(prev => {
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev.zoom * factor));
      // Adjust camera so the world point stays under cursor
      const newCx = worldX - (sx - cw / 2) / newZoom;
      const newCy = worldY - (sy - ch / 2) / newZoom;
      return { x: newCx, y: newCy, zoom: newZoom };
    });
  }, [cam]);

  // Drag
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setDragging(true);
    dragStart.current = { mx: e.clientX, my: e.clientY, cx: cam.x, cy: cam.y };
  }, [cam]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    const dx = e.clientX - dragStart.current.mx;
    const dy = e.clientY - dragStart.current.my;
    setCam(prev => ({
      ...prev,
      x: dragStart.current.cx - dx / prev.zoom,
      y: dragStart.current.cy - dy / prev.zoom,
    }));
  }, [dragging]);

  const handleMouseUp = useCallback(() => setDragging(false), []);

  // Controls
  const zoomIn = useCallback(() => {
    setCam(p => ({ ...p, zoom: Math.min(MAX_ZOOM, p.zoom * 1.4) }));
  }, []);
  const zoomOut = useCallback(() => {
    setCam(p => ({ ...p, zoom: Math.max(MIN_ZOOM, p.zoom / 1.4) }));
  }, []);
  const resetView = useCallback(() => {
    if (!imgSize.w) return;
    const container = containerRef.current;
    if (!container) return;
    const fitScale = Math.min(container.clientWidth / imgSize.w, container.clientHeight / imgSize.h) * 0.9;
    setCam({ x: imgSize.w / 2, y: imgSize.h / 2, zoom: fitScale });
  }, [imgSize]);

  // Keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '0') resetView();
      if (e.key === '+' || e.key === '=') zoomIn();
      if (e.key === '-') zoomOut();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [resetView, zoomIn, zoomOut]);

  // Draw grid
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const w = container.clientWidth;
    const h = container.clientHeight;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#1e2127';
    ctx.fillRect(0, 0, w, h);

    // Adaptive grid spacing
    let baseSpacing = 50;
    let gridSpacing = baseSpacing * cam.zoom;
    // Keep grid lines at reasonable screen density
    while (gridSpacing < 30) { gridSpacing *= 5; baseSpacing *= 5; }
    while (gridSpacing > 200) { gridSpacing /= 5; baseSpacing /= 5; }

    const originScreen = worldToScreen(0, 0);

    // Minor grid
    const startX = originScreen.x % gridSpacing;
    const startY = originScreen.y % gridSpacing;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
    ctx.lineWidth = 0.5;
    for (let x = startX; x < w; x += gridSpacing) {
      ctx.beginPath(); ctx.moveTo(Math.round(x) + 0.5, 0); ctx.lineTo(Math.round(x) + 0.5, h); ctx.stroke();
    }
    for (let y = startY; y < h; y += gridSpacing) {
      ctx.beginPath(); ctx.moveTo(0, Math.round(y) + 0.5); ctx.lineTo(w, Math.round(y) + 0.5); ctx.stroke();
    }

    // Major grid (every 5th)
    const majorSpacing = gridSpacing * 5;
    const majorStartX = originScreen.x % majorSpacing;
    const majorStartY = originScreen.y % majorSpacing;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
    ctx.lineWidth = 0.5;
    for (let x = majorStartX; x < w; x += majorSpacing) {
      ctx.beginPath(); ctx.moveTo(Math.round(x) + 0.5, 0); ctx.lineTo(Math.round(x) + 0.5, h); ctx.stroke();
    }
    for (let y = majorStartY; y < h; y += majorSpacing) {
      ctx.beginPath(); ctx.moveTo(0, Math.round(y) + 0.5); ctx.lineTo(w, Math.round(y) + 0.5); ctx.stroke();
    }

    // Axis labels on major lines
    ctx.font = '500 9px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';

    for (let x = majorStartX; x < w; x += majorSpacing) {
      const world = screenToWorld(x, 0);
      const val = Math.round(world.x);
      let label: string;
      if (gridType === 'geo') label = `${(73.6994 + val * 0.0000025).toFixed(5)}°`;
      else if (gridType === 'elevation') label = `${val}m`;
      else label = `${val}px`;
      ctx.fillText(label, x + 4, h - 6);
    }
    for (let y = majorStartY; y < h; y += majorSpacing) {
      const world = screenToWorld(0, y);
      const val = Math.round(world.y);
      let label: string;
      if (gridType === 'geo') label = `${(18.5620 - val * 0.0000025).toFixed(5)}°`;
      else if (gridType === 'elevation') label = `${val}m`;
      else label = `${val}px`;
      ctx.fillText(label, 4, y - 4);
    }

    // Origin axes
    if (originScreen.x > 0 && originScreen.x < w) {
      ctx.strokeStyle = 'rgba(44, 123, 242, 0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(originScreen.x, 0); ctx.lineTo(originScreen.x, h); ctx.stroke();
    }
    if (originScreen.y > 0 && originScreen.y < h) {
      ctx.strokeStyle = 'rgba(44, 123, 242, 0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, originScreen.y); ctx.lineTo(w, originScreen.y); ctx.stroke();
    }
  }, [cam, gridType, worldToScreen, screenToWorld]);

  // Compute image screen position
  const imgScreen = worldToScreen(0, 0);

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{
        width: '100%', height: '100%',
        overflow: 'hidden',
        cursor: dragging ? 'grabbing' : 'grab',
        position: 'relative',
        background: '#1e2127',
        userSelect: 'none',
      }}
    >
      {/* Grid */}
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, zIndex: 0 }} />

      {/* Image — positioned via camera transform */}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        onLoad={handleLoad}
        style={{
          position: 'absolute',
          left: imgScreen.x,
          top: imgScreen.y,
          width: imgSize.w * cam.zoom,
          height: imgSize.h * cam.zoom,
          opacity: loaded ? 1 : 0,
          transition: loaded ? 'none' : 'opacity 300ms',
          zIndex: 1,
          pointerEvents: 'none',
          imageRendering: cam.zoom > 2 ? 'pixelated' : 'auto',
        }}
        draggable={false}
      />

      {/* Loading */}
      {!loaded && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 2,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#666', fontSize: 13,
        }}>
          Loading image...
        </div>
      )}

      {/* Overlay */}
      {overlay}

      {/* Zoom controls */}
      <div style={{
        position: 'absolute', bottom: 60, right: 16, zIndex: 10,
        display: 'flex', flexDirection: 'column', gap: 1,
        background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)',
        borderRadius: 8, overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
        border: '1px solid rgba(0,0,0,0.06)',
      }}>
        <ControlBtn icon={ZoomIn} onClick={zoomIn} title="Zoom in (+)" />
        <div style={{ height: 1, background: 'rgba(0,0,0,0.06)' }} />
        <ControlBtn icon={ZoomOut} onClick={zoomOut} title="Zoom out (-)" />
        <div style={{ height: 1, background: 'rgba(0,0,0,0.06)' }} />
        <ControlBtn icon={Maximize2} onClick={resetView} title="Fit to view (0)" />
      </div>

      {/* Zoom indicator */}
      <div style={{
        position: 'absolute', bottom: 60, left: 16, zIndex: 10,
        background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(8px)',
        borderRadius: 6, padding: '4px 10px',
        fontSize: 11, fontWeight: 500, color: '#555',
        fontFamily: 'var(--ak-font-mono)',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
      }}>
        {Math.round(cam.zoom * 100)}%
      </div>
    </div>
  );
}

function ControlBtn({ icon: Icon, onClick, title }: { icon: any; onClick: () => void; title: string }) {
  return (
    <button onClick={onClick} title={title} style={{
      background: 'transparent', border: 'none',
      width: 34, height: 34, cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#555', transition: 'all 100ms',
    }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; e.currentTarget.style.color = '#222'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#555'; }}
    >
      <Icon size={15} />
    </button>
  );
}
