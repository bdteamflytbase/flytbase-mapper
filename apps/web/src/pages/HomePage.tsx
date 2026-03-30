import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

/* ═══════════════════════════════════════════════════════════════
   AKARA — Homepage v6
   Dense organic topo contours + Aria-style bold font
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
  const [phase, setPhase] = useState<'idle' | 'launching' | 'zooming'>('idle');
  const [showContent, setShowContent] = useState(false);
  const [showHUD, setShowHUD] = useState(false);
  const [progress, setProgress] = useState(0);
  const [shimmerPos, setShimmerPos] = useState(0.5);

  useEffect(() => {
    const t1 = setTimeout(() => setShowContent(true), 200);
    const t2 = setTimeout(() => setShowHUD(true), 900);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let time = 0;

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    // Multi-octave noise for rich terrain
    const hash = (x: number, y: number) => {
      let h = x * 374761393 + y * 668265263;
      h = (h ^ (h >> 13)) * 1274126177;
      return (h ^ (h >> 16)) / 2147483648;
    };

    const smoothNoise = (x: number, y: number) => {
      const ix = Math.floor(x), iy = Math.floor(y);
      const fx = x - ix, fy = y - iy;
      const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
      const n00 = hash(ix, iy), n10 = hash(ix + 1, iy);
      const n01 = hash(ix, iy + 1), n11 = hash(ix + 1, iy + 1);
      return n00 * (1 - sx) * (1 - sy) + n10 * sx * (1 - sy) +
             n01 * (1 - sx) * sy + n11 * sx * sy;
    };

    const terrainNoise = (x: number, y: number) => {
      let val = 0, amp = 1, freq = 1, totalAmp = 0;
      for (let o = 0; o < 5; o++) {
        val += smoothNoise(x * freq * 0.008, y * freq * 0.008) * amp;
        totalAmp += amp;
        amp *= 0.5;
        freq *= 2.1;
      }
      return val / totalAmp;
    };

    // Grid mission
    const gridPad = 0.07;
    const gridRows = 10;
    const buildPath = (W: number, H: number) => {
      const pts: { x: number; y: number }[] = [];
      const x1 = gridPad * W, x2 = (1 - gridPad) * W;
      const y1 = gridPad * H + 40, y2 = (1 - gridPad) * H - 30;
      const rH = (y2 - y1) / gridRows;
      for (let r = 0; r <= gridRows; r++) {
        const y = y1 + r * rH;
        pts.push(r % 2 === 0 ? { x: x1, y } : { x: x2, y });
        pts.push(r % 2 === 0 ? { x: x2, y } : { x: x1, y });
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

    // Pre-compute contour field (only on resize)
    let fieldW = 0, fieldH = 0;
    let field: number[][] = [];
    const RES = 5;

    const buildField = (W: number, H: number) => {
      fieldW = Math.ceil(W / RES) + 1;
      fieldH = Math.ceil(H / RES) + 1;
      field = [];
      for (let r = 0; r < fieldH; r++) {
        field[r] = [];
        for (let c = 0; c < fieldW; c++) {
          field[r][c] = terrainNoise(c * RES + 50, r * RES + 50);
        }
      }
    };

    buildField(canvas.width, canvas.height);

    const prevW = { v: canvas.width }, prevH = { v: canvas.height };

    const draw = () => {
      time += 0.0008;
      const W = canvas.width, H = canvas.height;

      if (W !== prevW.v || H !== prevH.v) {
        buildField(W, H);
        prevW.v = W;
        prevH.v = H;
      }

      // Background
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, W, H);

      // Center glow
      const bg = ctx.createRadialGradient(W * 0.5, H * 0.46, 0, W * 0.5, H * 0.46, W * 0.65);
      bg.addColorStop(0, 'rgba(28, 50, 82, 0.85)');
      bg.addColorStop(0.35, 'rgba(20, 38, 65, 0.5)');
      bg.addColorStop(0.7, 'rgba(14, 26, 48, 0.2)');
      bg.addColorStop(1, 'transparent');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // ═══ DENSE TOPOGRAPHIC CONTOURS ═══
      // More levels = denser contour lines (like real topo maps)
      const levels = 20;
      for (let li = 1; li < levels; li++) {
        const threshold = li / levels;
        const isMajor = li % 4 === 0;

        ctx.strokeStyle = isMajor
          ? 'rgba(160, 185, 220, 0.22)'
          : 'rgba(140, 165, 200, 0.09)';
        ctx.lineWidth = isMajor ? 1.0 : 0.5;

        ctx.beginPath();

        for (let r = 0; r < fieldH - 1; r++) {
          for (let c = 0; c < fieldW - 1; c++) {
            const tl = field[r][c], tr = field[r][c + 1];
            const bl = field[r + 1][c], br = field[r + 1][c + 1];
            const config = (tl >= threshold ? 8 : 0) | (tr >= threshold ? 4 : 0) |
                           (br >= threshold ? 2 : 0) | (bl >= threshold ? 1 : 0);
            if (config === 0 || config === 15) continue;

            const x = c * RES, y = r * RES;
            const lerp = (a: number, b: number) => (threshold - a) / (b - a);
            const top = x + lerp(tl, tr) * RES;
            const bot = x + lerp(bl, br) * RES;
            const left = y + lerp(tl, bl) * RES;
            const right = y + lerp(tr, br) * RES;

            const seg = (x1: number, y1: number, x2: number, y2: number) => {
              ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
            };

            switch (config) {
              case 1: seg(x, left, bot, y + RES); break;
              case 2: seg(bot, y + RES, x + RES, right); break;
              case 3: seg(x, left, x + RES, right); break;
              case 4: seg(top, y, x + RES, right); break;
              case 5: seg(x, left, top, y); seg(bot, y + RES, x + RES, right); break;
              case 6: seg(top, y, bot, y + RES); break;
              case 7: seg(x, left, top, y); break;
              case 8: seg(top, y, x, left); break;
              case 9: seg(top, y, bot, y + RES); break;
              case 10: seg(top, y, x + RES, right); seg(x, left, bot, y + RES); break;
              case 11: seg(top, y, x + RES, right); break;
              case 12: seg(x, left, x + RES, right); break;
              case 13: seg(bot, y + RES, x + RES, right); break;
              case 14: seg(x, left, bot, y + RES); break;
            }
          }
        }
        ctx.stroke();

        // Elevation labels on major contours
        if (isMajor) {
          ctx.font = '500 7px "Space Mono", monospace';
          ctx.fillStyle = 'rgba(140, 165, 200, 0.18)';
          const elev = Math.round(threshold * 850);
          ctx.fillText(`${elev}m`, 80 + li * 55, H * 0.35 + (li % 3) * 40);
        }
      }

      // Subtle grid
      ctx.strokeStyle = 'rgba(100, 130, 170, 0.03)';
      ctx.lineWidth = 0.5;
      for (let x = 0; x < W; x += 70) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += 70) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

      // ═══ DRONE MISSION ═══
      const path = buildPath(W, H);
      const droneT = (time * 0.9) % 1;
      const drone = getPt(path, droneT);

      setShimmerPos(drone.x / W);

      // Boundary
      const bx1 = gridPad * W, by1 = gridPad * H + 40;
      const bx2 = (1 - gridPad) * W, by2 = (1 - gridPad) * H - 30;
      const rH = (by2 - by1) / gridRows;

      ctx.setLineDash([3, 8]);
      ctx.strokeStyle = 'rgba(44, 123, 242, 0.05)';
      ctx.lineWidth = 0.5;
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

      // Trail
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
        const age = time - d.b, a = Math.max(0, 0.5 - age * 0.25);
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

      // FOV cone
      ctx.beginPath(); ctx.moveTo(drone.x, drone.y);
      ctx.lineTo(drone.x - 20, drone.y + 18); ctx.lineTo(drone.x + 20, drone.y + 18);
      ctx.closePath(); ctx.fillStyle = 'rgba(44, 123, 242, 0.03)'; ctx.fill();

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

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Exo+2:wght@300;400;500;600;700;800;900&family=Outfit:wght@300;400;500;600;700;800;900&family=Space+Mono:wght@400;700&display=swap');

        @keyframes hp-fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes hp-fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes hp-hudSlide { from { opacity: 0; transform: translateY(8px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes hp-pulseRing { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }
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

        {/* Softer vignette */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
          background: `radial-gradient(ellipse 90% 80% at 50% 48%, transparent 35%, ${BG}88 65%, ${BG}bb 85%)`,
        }} />

        {/* FlytBase Logo — top center */}
        {showContent && (
          <div style={{
            position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 15,
            animation: 'hp-fadeIn 600ms ease forwards', animationDelay: '600ms', opacity: 0, animationFillMode: 'forwards',
          }}>
            <img src="/flytbase-white.svg" alt="FlytBase" style={{ height: 22, opacity: 0.5 }} />
          </div>
        )}

        {/* Top corners */}
        {showContent && (
          <>
            <div style={{ position: 'absolute', top: 24, left: 24, zIndex: 15, fontSize: 9, color: TEXT3, letterSpacing: '0.1em', fontFamily: "'Space Mono', monospace", animation: 'hp-fadeIn 600ms ease forwards', animationDelay: '800ms', opacity: 0, animationFillMode: 'forwards' }}>
              18.5620°N · 73.6994°E
            </div>
            <div style={{ position: 'absolute', top: 24, right: 24, zIndex: 15, fontSize: 9, color: TEXT3, letterSpacing: '0.1em', fontFamily: "'Space Mono', monospace", animation: 'hp-fadeIn 600ms ease forwards', animationDelay: '800ms', opacity: 0, animationFillMode: 'forwards', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#34D399', boxShadow: '0 0 6px rgba(52,211,153,0.5)', animation: 'hp-dotBlink 2.5s ease infinite' }} />
              MISSION ACTIVE
            </div>
          </>
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
            background: 'rgba(10, 18, 32, 0.88)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.05)', borderRadius: 10, padding: '12px 16px', minWidth: 115,
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

        {/* ═══ CENTER ═══ */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 14,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          pointerEvents: phase !== 'idle' ? 'none' : 'auto',
        }}>
          {showContent && phase === 'idle' && (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              animation: 'hp-fadeUp 900ms cubic-bezier(0,0,0.2,1) forwards', opacity: 0,
            }}>

              {/* AKARA — Exo 2 Bold (Aria-style geometric) */}
              <h1 style={{
                fontSize: 96, fontWeight: 800, lineHeight: 1,
                letterSpacing: '0.2em',
                fontFamily: "'Exo 2', sans-serif",
                background: `linear-gradient(90deg,
                  ${TEXT} ${Math.max(0, shimmerPos * 100 - 18)}%,
                  ${BLUE_LIGHT} ${shimmerPos * 100 - 4}%,
                  #fff ${shimmerPos * 100}%,
                  ${BLUE_LIGHT} ${shimmerPos * 100 + 4}%,
                  ${TEXT} ${Math.min(100, shimmerPos * 100 + 18)}%)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                filter: `drop-shadow(0 4px 28px ${BLUE_GLOW})`,
                marginBottom: 10,
              }}>
                AKARA
              </h1>

              {/* Tagline */}
              <p style={{
                fontSize: 14, color: TEXT2, fontWeight: 300, letterSpacing: '0.08em', marginBottom: 6,
                animation: 'hp-fadeIn 800ms ease forwards', animationDelay: '400ms', opacity: 0, animationFillMode: 'forwards',
              }}>
                Give shape to your world
              </p>

              {/* by FlytBase */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6, marginBottom: 44,
                animation: 'hp-fadeIn 800ms ease forwards', animationDelay: '550ms', opacity: 0, animationFillMode: 'forwards',
              }}>
                <span style={{ fontSize: 11, color: TEXT3, fontWeight: 400, letterSpacing: '0.12em' }}>by</span>
                <img src="/flytbase-white.svg" alt="FlytBase" style={{ height: 13, opacity: 0.4 }} />
              </div>

              {/* CTA */}
              <div style={{
                position: 'relative',
                animation: 'hp-fadeUp 600ms ease forwards', animationDelay: '650ms', opacity: 0, animationFillMode: 'forwards',
              }}>
                <div style={{
                  position: 'absolute', inset: -3, borderRadius: 14,
                  background: `linear-gradient(135deg, rgba(44,123,242,0.3), rgba(96,165,250,0.15), rgba(44,123,242,0.3))`,
                  filter: 'blur(6px)', animation: 'hp-pulseRing 3s ease-in-out infinite',
                }} />
                <button onClick={handleLaunch} style={{
                  position: 'relative',
                  background: `linear-gradient(135deg, ${BLUE} 0%, #1A6AE0 50%, #2C7BF2 100%)`,
                  border: '1px solid rgba(96, 165, 250, 0.3)',
                  borderRadius: 12, padding: '16px 52px',
                  color: '#fff', fontSize: 13, fontWeight: 700, letterSpacing: '0.14em', cursor: 'pointer',
                  fontFamily: "'Outfit', sans-serif",
                  transition: 'transform 200ms, box-shadow 200ms, border-color 200ms',
                  boxShadow: `0 4px 28px rgba(44,123,242,0.35)`,
                  display: 'flex', alignItems: 'center', gap: 10,
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px) scale(1.03)'; e.currentTarget.style.boxShadow = `0 8px 36px rgba(44,123,242,0.5)`; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0) scale(1)'; e.currentTarget.style.boxShadow = `0 4px 28px rgba(44,123,242,0.35)`; }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 1.5L12 7L3 12.5V1.5Z" fill="white" fillOpacity="0.9" /></svg>
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
            animation: 'hp-fadeIn 600ms ease forwards', animationDelay: '1100ms', opacity: 0, animationFillMode: 'forwards',
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
