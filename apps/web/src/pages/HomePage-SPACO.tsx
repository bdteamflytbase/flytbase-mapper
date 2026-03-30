import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

/* ═══════════════════════════════════════════════════════════════
   AKARA — Homepage v5
   Curvy topo contours + SPACO-style font + drone-synced shimmer
   ═══════════════════════════════════════════════════════════════ */

const BLUE = '#2C7BF2';
const BLUE_LIGHT = '#60A5FA';
const BLUE_GLOW = 'rgba(44, 123, 242, 0.45)';
const BG = '#0d1628';
const TEXT = '#F0F2F5';
const TEXT2 = '#9AABC0';
const TEXT3 = '#546480';

const HUD_CARDS = [
  { label: 'ACTIVE SITES', value: '12', unit: '', x: 3, y: 18 },
  { label: 'IMAGES PROCESSED', value: '2,847', unit: '', x: 78, y: 12 },
  { label: 'AREA MAPPED', value: '156', unit: 'ha', x: 80, y: 74 },
  { label: 'GSD ACCURACY', value: '99.2', unit: '%', x: 2, y: 78 },
];

export default function HomePage() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const shimmerRef = useRef(0.5); // 0-1 position of shimmer, driven by drone X
  const [phase, setPhase] = useState<'idle' | 'launching' | 'zooming'>('idle');
  const [showContent, setShowContent] = useState(false);
  const [showHUD, setShowHUD] = useState(false);
  const [progress, setProgress] = useState(0);
  const [shimmerPos, setShimmerPos] = useState(0.5);
  const titleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t1 = setTimeout(() => setShowContent(true), 200);
    const t2 = setTimeout(() => setShowHUD(true), 900);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // Main canvas — everything rendered here
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let time = 0;

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    // Smooth noise for curvy contours
    const smoothNoise = (x: number, y: number) => {
      const s1 = Math.sin(x * 0.003 + 0.5) * Math.cos(y * 0.004 + 1.2) * 0.35;
      const s2 = Math.sin(x * 0.007 + y * 0.005 + 2.8) * 0.25;
      const s3 = Math.cos(x * 0.002 - y * 0.003 + 0.9) * 0.3;
      const s4 = Math.sin(x * 0.005 + y * 0.002 + 4.1) * 0.15;
      const s5 = Math.cos(x * 0.001 + y * 0.006 - 1.5) * 0.2;
      return (s1 + s2 + s3 + s4 + s5) * 0.5 + 0.5;
    };

    // Grid params — full screen
    const gridPad = 0.07;
    const gridRows = 10;

    const buildPath = (W: number, H: number) => {
      const pts: { x: number; y: number }[] = [];
      const x1 = gridPad * W, x2 = (1 - gridPad) * W;
      const y1 = gridPad * H + 40, y2 = (1 - gridPad) * H - 30;
      const rH = (y2 - y1) / gridRows;
      for (let r = 0; r <= gridRows; r++) {
        const y = y1 + r * rH;
        if (r % 2 === 0) pts.push({ x: x1, y }, { x: x2, y });
        else pts.push({ x: x2, y }, { x: x1, y });
      }
      return pts;
    };

    const pathLen = (pts: { x: number; y: number }[]) => {
      let l = 0;
      for (let i = 1; i < pts.length; i++) {
        const dx = pts[i].x - pts[i - 1].x, dy = pts[i].y - pts[i - 1].y;
        l += Math.sqrt(dx * dx + dy * dy);
      }
      return l;
    };

    const getPt = (pts: { x: number; y: number }[], t: number) => {
      const total = pathLen(pts);
      let target = t * total, acc = 0;
      for (let i = 1; i < pts.length; i++) {
        const dx = pts[i].x - pts[i - 1].x, dy = pts[i].y - pts[i - 1].y;
        const seg = Math.sqrt(dx * dx + dy * dy);
        if (acc + seg >= target) {
          const f = (target - acc) / seg;
          return { x: pts[i - 1].x + dx * f, y: pts[i - 1].y + dy * f, angle: Math.atan2(dy, dx) };
        }
        acc += seg;
      }
      return { x: pts[pts.length - 1].x, y: pts[pts.length - 1].y, angle: 0 };
    };

    const dots: { x: number; y: number; b: number }[] = [];
    let lastDot = 0;

    const draw = () => {
      time += 0.0008;
      const W = canvas.width, H = canvas.height;

      // ═══ BACKGROUND ═══
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, W, H);

      // Brighter center glow
      const bg = ctx.createRadialGradient(W * 0.5, H * 0.46, 0, W * 0.5, H * 0.46, W * 0.65);
      bg.addColorStop(0, 'rgba(28, 50, 82, 0.8)');
      bg.addColorStop(0.35, 'rgba(20, 36, 62, 0.5)');
      bg.addColorStop(0.7, 'rgba(14, 26, 48, 0.25)');
      bg.addColorStop(1, 'transparent');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // ═══ CURVY TOPOGRAPHIC CONTOURS ═══
      // Use marching squares with interpolation for smooth contour lines
      const res = 6; // resolution
      const cols = Math.ceil(W / res) + 1;
      const rows = Math.ceil(H / res) + 1;

      // Build height field
      const field: number[][] = [];
      for (let r = 0; r < rows; r++) {
        field[r] = [];
        for (let c = 0; c < cols; c++) {
          field[r][c] = smoothNoise(c * res, r * res);
        }
      }

      // Draw contour lines at specific levels
      const levels = [0.15, 0.25, 0.32, 0.4, 0.48, 0.55, 0.62, 0.7, 0.78, 0.85];

      levels.forEach((level, li) => {
        const isMajor = li % 3 === 0;
        ctx.strokeStyle = isMajor
          ? 'rgba(160, 185, 220, 0.22)'
          : 'rgba(140, 165, 200, 0.10)';
        ctx.lineWidth = isMajor ? 1.1 : 0.5;

        // Marching squares — extract line segments for this level
        const segments: [number, number, number, number][] = [];

        for (let r = 0; r < rows - 1; r++) {
          for (let c = 0; c < cols - 1; c++) {
            const tl = field[r][c], tr = field[r][c + 1];
            const bl = field[r + 1][c], br = field[r + 1][c + 1];

            // Classify corners
            const config = (tl >= level ? 8 : 0) | (tr >= level ? 4 : 0) |
                           (br >= level ? 2 : 0) | (bl >= level ? 1 : 0);

            if (config === 0 || config === 15) continue;

            const x = c * res, y = r * res;
            const lerp = (a: number, b: number) => (level - a) / (b - a);

            // Interpolated edge midpoints
            const top = x + lerp(tl, tr) * res;
            const bot = x + lerp(bl, br) * res;
            const left = y + lerp(tl, bl) * res;
            const right = y + lerp(tr, br) * res;

            const addSeg = (x1: number, y1: number, x2: number, y2: number) => {
              segments.push([x1, y1, x2, y2]);
            };

            switch (config) {
              case 1: addSeg(x, left, bot, y + res); break;
              case 2: addSeg(bot, y + res, x + res, right); break;
              case 3: addSeg(x, left, x + res, right); break;
              case 4: addSeg(top, y, x + res, right); break;
              case 5: addSeg(x, left, top, y); addSeg(bot, y + res, x + res, right); break;
              case 6: addSeg(top, y, bot, y + res); break;
              case 7: addSeg(x, left, top, y); break;
              case 8: addSeg(top, y, x, left); break;
              case 9: addSeg(top, y, bot, y + res); break;
              case 10: addSeg(top, y, x + res, right); addSeg(x, left, bot, y + res); break;
              case 11: addSeg(top, y, x + res, right); break;
              case 12: addSeg(x, left, x + res, right); break;
              case 13: addSeg(bot, y + res, x + res, right); break;
              case 14: addSeg(x, left, bot, y + res); break;
            }
          }
        }

        // Draw all segments for this contour level
        ctx.beginPath();
        segments.forEach(([x1, y1, x2, y2]) => {
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
        });
        ctx.stroke();
      });

      // Subtle grid
      ctx.strokeStyle = 'rgba(100, 130, 170, 0.035)';
      ctx.lineWidth = 0.5;
      for (let x = 0; x < W; x += 70) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      for (let y = 0; y < H; y += 70) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }

      // ═══ DRONE MISSION ═══
      const path = buildPath(W, H);
      const droneT = (time * 0.9) % 1;
      const drone = getPt(path, droneT);

      // Update shimmer position (drone X normalized 0-1)
      shimmerRef.current = drone.x / W;
      setShimmerPos(shimmerRef.current);

      // Mission boundary
      const bx1 = gridPad * W, by1 = gridPad * H + 40;
      const bx2 = (1 - gridPad) * W, by2 = (1 - gridPad) * H - 30;

      // Dashed survey lines
      ctx.setLineDash([3, 8]);
      ctx.strokeStyle = 'rgba(44, 123, 242, 0.05)';
      ctx.lineWidth = 0.5;
      const rH = (by2 - by1) / gridRows;
      for (let r = 0; r <= gridRows; r++) {
        ctx.beginPath(); ctx.moveTo(bx1, by1 + r * rH); ctx.lineTo(bx2, by1 + r * rH); ctx.stroke();
      }
      ctx.setLineDash([]);

      // Corner markers
      const cs = 16;
      ctx.strokeStyle = 'rgba(44, 123, 242, 0.18)';
      ctx.lineWidth = 1.2;
      [[bx1, by1, 1, 1], [bx2, by1, -1, 1], [bx1, by2, 1, -1], [bx2, by2, -1, -1]].forEach(([cx, cy, sx, sy]) => {
        ctx.beginPath();
        ctx.moveTo(cx as number, (cy as number) + (sy as number) * cs);
        ctx.lineTo(cx as number, cy as number);
        ctx.lineTo((cx as number) + (sx as number) * cs, cy as number);
        ctx.stroke();
      });

      // Completed trail
      const total = pathLen(path);
      let acc = 0;
      ctx.beginPath();
      let started = false;
      for (let i = 1; i < path.length; i++) {
        const dx = path[i].x - path[i - 1].x, dy = path[i].y - path[i - 1].y;
        const seg = Math.sqrt(dx * dx + dy * dy);
        const s0 = acc / total, s1 = (acc + seg) / total;
        if (s0 < droneT) {
          if (!started) { ctx.moveTo(path[i - 1].x, path[i - 1].y); started = true; }
          if (s1 <= droneT) ctx.lineTo(path[i].x, path[i].y);
          else { const f = (droneT - s0) / (s1 - s0); ctx.lineTo(path[i - 1].x + dx * f, path[i - 1].y + dy * f); }
        }
        acc += seg;
      }
      ctx.strokeStyle = 'rgba(44, 123, 242, 0.06)'; ctx.lineWidth = 8; ctx.stroke();
      ctx.strokeStyle = 'rgba(44, 123, 242, 0.18)'; ctx.lineWidth = 1.5; ctx.stroke();

      // Image dots
      if (time - lastDot > 0.006) { dots.push({ x: drone.x, y: drone.y, b: time }); lastDot = time; }
      while (dots.length > 600) dots.shift();
      dots.forEach(d => {
        const age = time - d.b;
        const a = Math.max(0, 0.5 - age * 0.25);
        if (a <= 0) return;
        ctx.fillStyle = `rgba(44, 123, 242, ${a * 0.35})`;
        ctx.fillRect(d.x - 2.5, d.y - 2.5, 5, 5);
        if (age < 0.08) {
          const g = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, 14);
          g.addColorStop(0, `rgba(96, 165, 250, ${0.2 * (1 - age * 12)})`);
          g.addColorStop(1, 'rgba(96, 165, 250, 0)');
          ctx.beginPath(); ctx.arc(d.x, d.y, 14, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
        }
      });

      // ═══ QUADCOPTER ═══
      const dg = ctx.createRadialGradient(drone.x, drone.y, 0, drone.x, drone.y, 45);
      dg.addColorStop(0, 'rgba(44, 123, 242, 0.22)');
      dg.addColorStop(0.5, 'rgba(44, 123, 242, 0.06)');
      dg.addColorStop(1, 'rgba(44, 123, 242, 0)');
      ctx.beginPath(); ctx.arc(drone.x, drone.y, 45, 0, Math.PI * 2); ctx.fillStyle = dg; ctx.fill();

      ctx.save();
      ctx.translate(drone.x, drone.y);
      const armLen = 14;
      [Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75].forEach(angle => {
        const ax = Math.cos(angle) * armLen, ay = Math.sin(angle) * armLen;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(ax, ay);
        ctx.strokeStyle = 'rgba(200, 215, 240, 0.6)'; ctx.lineWidth = 1.2; ctx.stroke();
        ctx.beginPath(); ctx.arc(ax, ay, 5, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(200, 215, 240, 0.3)'; ctx.lineWidth = 0.7; ctx.stroke();
        const spin = time * 80 + angle * 3;
        for (let b = 0; b < 2; b++) {
          const ba = spin + b * Math.PI;
          ctx.beginPath();
          ctx.moveTo(ax + Math.cos(ba) * 4.5, ay + Math.sin(ba) * 4.5);
          ctx.lineTo(ax - Math.cos(ba) * 4.5, ay - Math.sin(ba) * 4.5);
          ctx.strokeStyle = 'rgba(200, 215, 240, 0.18)'; ctx.lineWidth = 0.8; ctx.stroke();
        }
      });
      ctx.beginPath(); ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = BLUE_LIGHT; ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 0.6; ctx.stroke();
      ctx.restore();

      // FOV
      ctx.beginPath(); ctx.moveTo(drone.x, drone.y);
      ctx.lineTo(drone.x - 20, drone.y + 18); ctx.lineTo(drone.x + 20, drone.y + 18);
      ctx.closePath(); ctx.fillStyle = 'rgba(44, 123, 242, 0.03)'; ctx.fill();
      ctx.strokeStyle = 'rgba(44, 123, 242, 0.07)'; ctx.lineWidth = 0.5; ctx.stroke();

      // Telemetry
      ctx.font = '500 8px "Space Mono", monospace';
      ctx.fillStyle = 'rgba(96, 165, 250, 0.4)';
      ctx.fillText(`ALT 120m`, drone.x + 30, drone.y - 6);
      ctx.fillText(`SPD 8.2m/s`, drone.x + 30, drone.y + 5);
      ctx.fillStyle = 'rgba(96, 165, 250, 0.25)';
      ctx.fillText(`IMG ${Math.floor(droneT * 847)}`, drone.x + 30, drone.y + 16);

      animRef.current = requestAnimationFrame(draw);
    };
    draw();

    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(animRef.current); };
  }, []);

  const handleLaunch = useCallback(() => {
    if (phase !== 'idle') return;
    setPhase('launching');
    let p = 0;
    const interval = setInterval(() => {
      p += Math.random() * 18 + 6;
      if (p >= 100) { p = 100; clearInterval(interval); setProgress(100);
        setTimeout(() => { setPhase('zooming'); setTimeout(() => navigate('/dashboard'), 700); }, 350);
      }
      setProgress(Math.min(p, 100));
    }, 180);
  }, [phase, navigate]);

  const isLaunching = phase === 'launching';
  const isZooming = phase === 'zooming';

  // Shimmer gradient position driven by drone X
  const shimmerGrad = `linear-gradient(90deg,
    rgba(240,242,245,0.85) 0%,
    rgba(240,242,245,0.85) ${Math.max(0, shimmerPos * 100 - 15)}%,
    rgba(96,165,250,0.95) ${shimmerPos * 100 - 5}%,
    rgba(255,255,255,1) ${shimmerPos * 100}%,
    rgba(96,165,250,0.95) ${shimmerPos * 100 + 5}%,
    rgba(240,242,245,0.85) ${Math.min(100, shimmerPos * 100 + 15)}%,
    rgba(240,242,245,0.85) 100%)`;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Space+Mono:wght@400;700&display=swap');

        @keyframes hp-fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes hp-fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes hp-hudSlide { from { opacity: 0; transform: translateY(8px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes hp-pulseRing { 0% { box-shadow: 0 0 0 0 rgba(44,123,242,0.3); } 70% { box-shadow: 0 0 0 16px rgba(44,123,242,0); } 100% { box-shadow: 0 0 0 0 rgba(44,123,242,0); } }
        @keyframes hp-zoomOut { 0% { transform: scale(1); opacity: 1; filter: blur(0); } 100% { transform: scale(1.4); opacity: 0; filter: blur(12px); } }
        @keyframes hp-processSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes hp-dotBlink { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
      `}</style>

      <div style={{
        position: 'fixed', inset: 0, background: BG, overflow: 'hidden', zIndex: 100,
        fontFamily: "'Outfit', 'Inter', sans-serif",
        animation: isZooming ? 'hp-zoomOut 700ms cubic-bezier(0.4,0,0.2,1) forwards' : undefined,
      }}>
        <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, zIndex: 1 }} />

        {/* Soft vignette */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
          background: `radial-gradient(ellipse 90% 80% at 50% 48%, transparent 35%, ${BG}88 65%, ${BG}bb 85%)`,
        }} />

        {/* ═══ FlytBase Logo — top center ═══ */}
        {showContent && (
          <div style={{
            position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 15,
            animation: 'hp-fadeIn 600ms ease forwards',
            animationDelay: '600ms', opacity: 0, animationFillMode: 'forwards',
          }}>
            <img src="/flytbase-white.svg" alt="FlytBase" style={{ height: 22, opacity: 0.5 }} />
          </div>
        )}

        {/* Top-left coords */}
        {showContent && (
          <div style={{
            position: 'absolute', top: 24, left: 24, zIndex: 15,
            fontSize: 9, color: TEXT3, letterSpacing: '0.1em',
            fontFamily: "'Space Mono', monospace",
            animation: 'hp-fadeIn 600ms ease forwards',
            animationDelay: '800ms', opacity: 0, animationFillMode: 'forwards',
          }}>18.5620°N · 73.6994°E</div>
        )}

        {/* Top-right status */}
        {showContent && (
          <div style={{
            position: 'absolute', top: 24, right: 24, zIndex: 15,
            fontSize: 9, color: TEXT3, letterSpacing: '0.1em',
            fontFamily: "'Space Mono', monospace",
            animation: 'hp-fadeIn 600ms ease forwards',
            animationDelay: '800ms', opacity: 0, animationFillMode: 'forwards',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{
              width: 5, height: 5, borderRadius: '50%', background: '#34D399',
              boxShadow: '0 0 6px rgba(52,211,153,0.5)',
              animation: 'hp-dotBlink 2.5s ease infinite',
            }} />
            MISSION ACTIVE
          </div>
        )}

        {/* Corner brackets */}
        {[[true, true], [true, false], [false, true], [false, false]].map(([isTop, isLeft], i) => (
          <div key={i} style={{
            position: 'absolute',
            ...(isTop ? { top: 14 } : { bottom: 14 }),
            ...(isLeft ? { left: 14 } : { right: 14 }),
            width: 18, height: 18, zIndex: 10,
            borderTop: isTop ? '1px solid rgba(255,255,255,0.05)' : undefined,
            borderBottom: !isTop ? '1px solid rgba(255,255,255,0.05)' : undefined,
            borderLeft: isLeft ? '1px solid rgba(255,255,255,0.05)' : undefined,
            borderRight: !isLeft ? '1px solid rgba(255,255,255,0.05)' : undefined,
            opacity: showContent ? 1 : 0, transition: 'opacity 600ms 500ms',
          } as any} />
        ))}

        {/* HUD Cards */}
        {showHUD && phase === 'idle' && HUD_CARDS.map((card, i) => (
          <div key={i} style={{
            position: 'absolute', left: `${card.x}%`, top: `${card.y}%`, zIndex: 12,
            background: 'rgba(10, 18, 32, 0.88)',
            backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: 10, padding: '12px 16px', minWidth: 115,
            animation: `hp-hudSlide 500ms cubic-bezier(0.34,1.56,0.64,1) forwards`,
            animationDelay: `${i * 0.1}s`, opacity: 0, animationFillMode: 'forwards',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          }}>
            <div style={{ position: 'absolute', top: -1, left: 12, width: 20, height: 2, background: BLUE, borderRadius: 1, opacity: 0.5 }} />
            <div style={{ fontSize: 8, fontWeight: 600, color: TEXT3, letterSpacing: '0.14em', marginBottom: 6, fontFamily: "'Space Mono', monospace" }}>{card.label}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
              <span style={{ fontSize: 26, fontWeight: 700, color: TEXT, letterSpacing: '-0.02em', lineHeight: 1 }}>{card.value}</span>
              {card.unit && <span style={{ fontSize: 12, color: TEXT2, fontWeight: 400 }}>{card.unit}</span>}
            </div>
          </div>
        ))}

        {/* ═══ CENTER CONTENT ═══ */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 14,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          pointerEvents: phase !== 'idle' ? 'none' : 'auto',
        }}>
          {showContent && phase === 'idle' && (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              animation: 'hp-fadeUp 900ms cubic-bezier(0,0,0.2,1) forwards', opacity: 0,
            }}>

              {/* ═══ AKARA — SPACO-style custom letterforms ═══ */}
              <div ref={titleRef} style={{ position: 'relative', marginBottom: 8, height: 90 }}>
                {/* SVG custom letterforms — thin geometric strokes */}
                <svg viewBox="0 0 520 80" style={{
                  width: 520, height: 80,
                  filter: `drop-shadow(0 4px 28px ${BLUE_GLOW})`,
                }}>
                  <defs>
                    <linearGradient id="titleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset={`${Math.max(0, shimmerPos * 100 - 20)}%`} stopColor={TEXT} stopOpacity="0.9" />
                      <stop offset={`${shimmerPos * 100 - 3}%`} stopColor={BLUE_LIGHT} stopOpacity="1" />
                      <stop offset={`${shimmerPos * 100}%`} stopColor="#fff" stopOpacity="1" />
                      <stop offset={`${shimmerPos * 100 + 3}%`} stopColor={BLUE_LIGHT} stopOpacity="1" />
                      <stop offset={`${Math.min(100, shimmerPos * 100 + 20)}%`} stopColor={TEXT} stopOpacity="0.9" />
                    </linearGradient>
                    {/* Glow filter */}
                    <filter id="titleGlow">
                      <feGaussianBlur stdDeviation="2" result="blur" />
                      <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                  </defs>

                  {/* A — triangle without crossbar */}
                  <path d="M30,75 L55,5 L80,75" fill="none" stroke="url(#titleGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#titleGlow)" />

                  {/* K — vertical + angled strokes */}
                  <line x1="130" y1="5" x2="130" y2="75" stroke="url(#titleGrad)" strokeWidth="2.5" strokeLinecap="round" filter="url(#titleGlow)" />
                  <line x1="130" y1="42" x2="175" y2="5" stroke="url(#titleGrad)" strokeWidth="2.5" strokeLinecap="round" filter="url(#titleGlow)" />
                  <line x1="130" y1="42" x2="175" y2="75" stroke="url(#titleGrad)" strokeWidth="2.5" strokeLinecap="round" filter="url(#titleGlow)" />

                  {/* A — same triangle */}
                  <path d="M225,75 L250,5 L275,75" fill="none" stroke="url(#titleGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#titleGlow)" />

                  {/* R — vertical + arc top + diagonal leg */}
                  <line x1="325" y1="5" x2="325" y2="75" stroke="url(#titleGrad)" strokeWidth="2.5" strokeLinecap="round" filter="url(#titleGlow)" />
                  <path d="M325,5 L355,5 C370,5 370,38 355,38 L325,38" fill="none" stroke="url(#titleGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#titleGlow)" />
                  <line x1="345" y1="38" x2="370" y2="75" stroke="url(#titleGrad)" strokeWidth="2.5" strokeLinecap="round" filter="url(#titleGlow)" />

                  {/* A — same triangle */}
                  <path d="M420,75 L445,5 L470,75" fill="none" stroke="url(#titleGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#titleGlow)" />
                </svg>
              </div>

              {/* Line 2: Tagline */}
              <p style={{
                fontSize: 14, color: TEXT2, fontWeight: 300,
                letterSpacing: '0.08em', marginBottom: 6,
                animation: 'hp-fadeIn 800ms ease forwards',
                animationDelay: '400ms', opacity: 0, animationFillMode: 'forwards',
              }}>
                Give shape to your world
              </p>

              {/* Line 3: by FlytBase */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6, marginBottom: 44,
                animation: 'hp-fadeIn 800ms ease forwards',
                animationDelay: '550ms', opacity: 0, animationFillMode: 'forwards',
              }}>
                <span style={{ fontSize: 11, color: TEXT3, fontWeight: 400, letterSpacing: '0.12em' }}>by</span>
                <img src="/flytbase-white.svg" alt="FlytBase" style={{ height: 13, opacity: 0.4 }} />
              </div>

              {/* CTA */}
              {/* CTA with border glow */}
              <div style={{
                position: 'relative',
                animation: 'hp-fadeUp 600ms ease forwards',
                animationDelay: '650ms', opacity: 0, animationFillMode: 'forwards',
              }}>
                {/* Outer glow ring */}
                <div style={{
                  position: 'absolute', inset: -3,
                  borderRadius: 14,
                  background: `linear-gradient(135deg, rgba(44,123,242,0.3), rgba(96,165,250,0.15), rgba(44,123,242,0.3))`,
                  filter: 'blur(6px)',
                  animation: 'hp-pulseRing 3s ease-in-out infinite',
                }} />
                <button
                  onClick={handleLaunch}
                  style={{
                    position: 'relative',
                    background: `linear-gradient(135deg, ${BLUE} 0%, #1A6AE0 50%, #2C7BF2 100%)`,
                    border: '1px solid rgba(96, 165, 250, 0.3)',
                    borderRadius: 12, padding: '16px 52px',
                    color: '#fff', fontSize: 13, fontWeight: 700,
                    letterSpacing: '0.14em', cursor: 'pointer',
                    fontFamily: "'Outfit', sans-serif",
                    transition: 'transform 200ms, box-shadow 200ms, border-color 200ms',
                    boxShadow: `0 4px 28px rgba(44,123,242,0.35)`,
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-2px) scale(1.03)';
                    e.currentTarget.style.boxShadow = `0 8px 36px rgba(44,123,242,0.5)`;
                    e.currentTarget.style.borderColor = 'rgba(96, 165, 250, 0.5)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0) scale(1)';
                    e.currentTarget.style.boxShadow = `0 4px 28px rgba(44,123,242,0.35)`;
                    e.currentTarget.style.borderColor = 'rgba(96, 165, 250, 0.3)';
                  }}
                >
                  {/* Play icon */}
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3 1.5L12 7L3 12.5V1.5Z" fill="white" fillOpacity="0.9" />
                  </svg>
                  START MAPPING
                </button>
              </div>
            </div>
          )}

          {/* Processing */}
          {isLaunching && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, animation: 'hp-fadeIn 300ms ease forwards' }}>
              <div style={{ position: 'relative', width: 72, height: 72 }}>
                <svg viewBox="0 0 72 72" style={{ width: 72, height: 72, animation: 'hp-processSpin 1.5s linear infinite' }}>
                  <circle cx="36" cy="36" r="30" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="2" />
                  <path d="M36,6 A30,30 0 0,1 66,36" fill="none" stroke={BLUE} strokeWidth="2.5" strokeLinecap="round" />
                  <path d="M36,66 A30,30 0 0,1 6,36" fill="none" stroke={BLUE_LIGHT} strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: TEXT, fontFamily: "'Space Mono', monospace" }}>{Math.round(progress)}</div>
              </div>
              <div style={{ width: 240 }}>
                <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 2, background: `linear-gradient(90deg, ${BLUE}, ${BLUE_LIGHT})`, width: `${progress}%`, transition: 'width 180ms ease', boxShadow: `0 0 12px ${BLUE_GLOW}` }} />
                </div>
                <div style={{ fontSize: 9, color: TEXT3, marginTop: 10, textAlign: 'center', letterSpacing: '0.08em', fontFamily: "'Space Mono', monospace" }}>
                  {progress < 25 ? 'INITIALIZING TERRAIN ENGINE' : progress < 50 ? 'LOADING GEOSPATIAL DATA' : progress < 80 ? 'RENDERING ORTHOMOSAIC LAYERS' : 'LAUNCHING AKARA'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom */}
        {showContent && phase === 'idle' && (
          <div style={{
            position: 'absolute', bottom: 22, left: 0, right: 0, zIndex: 14,
            display: 'flex', justifyContent: 'center', gap: 40,
            animation: 'hp-fadeIn 600ms ease forwards',
            animationDelay: '1100ms', opacity: 0, animationFillMode: 'forwards',
          }}>
            {['ORTHOMOSAIC', 'ELEVATION', 'CHANGE DETECTION', '3D MESH'].map((item, i) => (
              <div key={i} style={{ fontSize: 8, color: TEXT3, letterSpacing: '0.12em', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, fontFamily: "'Space Mono', monospace" }}>
                <div style={{ width: 3, height: 3, borderRadius: '50%', background: BLUE, opacity: 0.4 }} />
                {item}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
