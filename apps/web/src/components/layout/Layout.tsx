import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Map, BarChart3, HelpCircle, Settings, ChevronLeft, ChevronRight,
  Hexagon, Layers, Eye, Sliders, Ruler, Download, Image, Mountain, Box
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/dashboard', icon: Map, label: 'Sites' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const loc = useLocation();
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);

  const isActive = (to: string) => {
    if (to === '/dashboard') return loc.pathname === '/dashboard';
    return loc.pathname.startsWith(to);
  };

  // Check if we're on a project page (show right panel)
  const isProjectView = loc.pathname.includes('/projects/');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'transparent' }}>

      {/* ═══ TOP BAR ═══ */}
      <div style={{
        height: 48,
        background: 'rgba(253, 252, 248, 0.82)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--ak-border)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        gap: 8,
        flexShrink: 0,
        zIndex: 20,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 4px' }}>
          <img src="/akara-logo.svg" alt="Akara" style={{ width: 30, height: 30 }} />
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
            <span style={{ fontSize: 15, fontWeight: 400, color: 'var(--ak-text)', fontFamily: 'var(--ak-font-display)' }}>Akara</span>
            <span style={{ fontSize: 9, color: 'var(--ak-text-3)', letterSpacing: '0.02em' }}>by FlytBase</span>
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 20, background: 'var(--ak-border)', margin: '0 4px' }} />

        {/* Left panel toggle */}
        <button
          onClick={() => setLeftOpen(v => !v)}
          style={{
            background: leftOpen ? 'var(--ak-bg-warm)' : 'transparent',
            border: 'none', borderRadius: 6, cursor: 'pointer',
            color: leftOpen ? 'var(--ak-text)' : 'var(--ak-text-3)',
            padding: '5px 8px', display: 'flex', alignItems: 'center', gap: 4,
            fontSize: 11, fontWeight: 500, transition: 'all 120ms',
          }}
          onMouseEnter={e => { if (!leftOpen) e.currentTarget.style.background = 'var(--ak-bg-warm)'; }}
          onMouseLeave={e => { if (!leftOpen) e.currentTarget.style.background = 'transparent'; }}
          title={leftOpen ? 'Hide sidebar' : 'Show sidebar'}
        >
          <Layers size={13} />
          <span>Panels</span>
        </button>

        {/* Nav links */}
        <div style={{ display: 'flex', gap: 2, marginLeft: 4 }}>
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
            const active = isActive(to);
            return (
              <Link key={to} to={to} style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 10px', borderRadius: 6,
                background: active ? 'var(--ak-primary-subtle)' : 'transparent',
                color: active ? 'var(--ak-primary)' : 'var(--ak-text-2)',
                fontSize: 12, fontWeight: active ? 600 : 500,
                textDecoration: 'none', transition: 'all 120ms',
              }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--ak-bg-warm)'; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
              >
                <Icon size={13} />
                {label}
              </Link>
            );
          })}
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {isProjectView && (
            <button
              onClick={() => setRightOpen(v => !v)}
              style={{
                background: rightOpen ? 'var(--ak-bg-warm)' : 'transparent',
                border: 'none', borderRadius: 6, cursor: 'pointer',
                color: rightOpen ? 'var(--ak-text)' : 'var(--ak-text-3)',
                padding: '5px 8px', display: 'flex', alignItems: 'center', gap: 4,
                fontSize: 11, fontWeight: 500, transition: 'all 120ms',
              }}
              title={rightOpen ? 'Hide inspector' : 'Show inspector'}
            >
              <Sliders size={13} />
              <span>Inspector</span>
            </button>
          )}

          <button style={{
            background: 'transparent', border: 'none', borderRadius: 6,
            cursor: 'pointer', color: 'var(--ak-text-3)', padding: 6,
            display: 'flex', transition: 'all 120ms',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--ak-bg-warm)'; e.currentTarget.style.color = 'var(--ak-text)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--ak-text-3)'; }}
          >
            <HelpCircle size={15} />
          </button>
          <button style={{
            background: 'transparent', border: 'none', borderRadius: 6,
            cursor: 'pointer', color: 'var(--ak-text-3)', padding: 6,
            display: 'flex', transition: 'all 120ms',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--ak-bg-warm)'; e.currentTarget.style.color = 'var(--ak-text)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--ak-text-3)'; }}
          >
            <Settings size={15} />
          </button>

          {/* Avatar */}
          <div style={{
            width: 28, height: 28, borderRadius: 7,
            background: 'linear-gradient(135deg, #4A6741, #C4A34A)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 11, fontWeight: 700, marginLeft: 4,
          }}>
            DG
          </div>
        </div>
      </div>

      {/* ═══ BODY: Left Panel + Canvas + Right Panel ═══ */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Left Panel — project tree / navigation */}
        {leftOpen && (
          <aside style={{
            width: 240,
            background: 'rgba(247, 246, 240, 0.65)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderRight: '1px solid var(--ak-border)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            flexShrink: 0,
          }}>
            {/* Panel header */}
            <div style={{
              padding: '12px 14px',
              borderBottom: '1px solid var(--ak-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ak-text-2)', letterSpacing: '0.04em' }}>
                EXPLORER
              </span>
            </div>

            {/* Nav items with tree-style */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px' }}>
              {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
                const active = isActive(to);
                return (
                  <Link key={to} to={to} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 10px', borderRadius: 7, marginBottom: 2,
                    background: active ? 'var(--ak-primary-subtle)' : 'transparent',
                    color: active ? 'var(--ak-primary)' : 'var(--ak-text-2)',
                    fontSize: 13, fontWeight: active ? 600 : 400,
                    textDecoration: 'none', transition: 'all 100ms',
                  }}
                    onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--ak-surface-hover)'; }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.background = active ? 'var(--ak-primary-subtle)' : 'transparent'; }}
                  >
                    <Icon size={15} strokeWidth={active ? 2 : 1.5} />
                    {label}
                  </Link>
                );
              })}

              {/* Quick info */}
              <div style={{
                marginTop: 16, padding: '12px',
                background: 'var(--ak-bg-page)', borderRadius: 8,
              }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ak-text-2)', marginBottom: 6 }}>Quick Stats</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {[
                    { label: 'Sites', value: '2' },
                    { label: 'Projects', value: '2' },
                    { label: 'Processed', value: '1' },
                  ].map(s => (
                    <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                      <span style={{ color: 'var(--ak-text-3)' }}>{s.label}</span>
                      <span style={{ color: 'var(--ak-text)', fontWeight: 500 }}>{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom */}
            <div style={{
              padding: '10px 12px', borderTop: '1px solid var(--ak-border)',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <HelpCircle size={13} color="var(--ak-text-3)" />
              <span style={{ fontSize: 11, color: 'var(--ak-text-3)' }}>Help & Resources</span>
            </div>
          </aside>
        )}

        {/* Center Canvas — main content */}
        <main style={{
          flex: 1, overflow: 'hidden', minWidth: 0,
          display: 'flex', flexDirection: 'column',
          background: 'transparent',
        }}>
          {children}
        </main>

        {/* Right Panel — Inspector (only on project views) */}
        {isProjectView && rightOpen && (
          <aside style={{
            width: 280,
            background: 'rgba(247, 246, 240, 0.65)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderLeft: '1px solid var(--ak-border)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            flexShrink: 0,
          }}>
            {/* Panel header */}
            <div style={{
              padding: '12px 14px',
              borderBottom: '1px solid var(--ak-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ak-text-2)', letterSpacing: '0.04em' }}>
                INSPECTOR
              </span>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
              {/* Layers section */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ak-text-3)', marginBottom: 8, padding: '0 2px' }}>
                  LAYERS
                </div>
                {[
                  { icon: Image, label: 'Orthomosaic', color: 'var(--ak-primary)' },
                  { icon: Mountain, label: 'DSM / Elevation', color: 'var(--ak-success)' },
                  { icon: Mountain, label: 'DTM / Terrain', color: 'var(--ak-warning)' },
                  { icon: Box, label: '3D Mesh', color: '#8B5CF6' },
                ].map((layer, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '7px 8px', borderRadius: 6, marginBottom: 2,
                    cursor: 'pointer', transition: 'background 100ms',
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--ak-surface-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{
                      width: 6, height: 6, borderRadius: 2,
                      background: layer.color,
                    }} />
                    <layer.icon size={13} color="var(--ak-text-2)" />
                    <span style={{ fontSize: 12, color: 'var(--ak-text)', flex: 1 }}>{layer.label}</span>
                    <Eye size={12} color="var(--ak-text-3)" />
                  </div>
                ))}
              </div>

              {/* Tools section */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ak-text-3)', marginBottom: 8, padding: '0 2px' }}>
                  TOOLS
                </div>
                {[
                  { icon: Ruler, label: 'Measure distance' },
                  { icon: Layers, label: 'Compare layers' },
                  { icon: Download, label: 'Export data' },
                ].map((tool, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '7px 8px', borderRadius: 6, marginBottom: 2,
                    cursor: 'pointer', fontSize: 12, color: 'var(--ak-text-2)',
                    transition: 'all 100ms',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--ak-surface-hover)'; e.currentTarget.style.color = 'var(--ak-text)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--ak-text-2)'; }}
                  >
                    <tool.icon size={13} />
                    <span>{tool.label}</span>
                  </div>
                ))}
              </div>

              {/* Properties */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ak-text-3)', marginBottom: 8, padding: '0 2px' }}>
                  PROPERTIES
                </div>
                <div style={{
                  background: 'var(--ak-bg-page)', borderRadius: 8, padding: '10px 12px',
                  display: 'flex', flexDirection: 'column', gap: 6,
                }}>
                  {[
                    { label: 'GSD', value: '2.0 cm/px' },
                    { label: 'Area', value: '3.5 ha' },
                    { label: 'Images', value: '72' },
                    { label: 'Quality', value: 'High' },
                  ].map(p => (
                    <div key={p.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                      <span style={{ color: 'var(--ak-text-3)' }}>{p.label}</span>
                      <span style={{ color: 'var(--ak-text)', fontWeight: 500, fontFamily: 'var(--ak-font-mono)', fontSize: 11 }}>{p.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
