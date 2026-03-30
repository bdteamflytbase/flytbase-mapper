import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Map, BarChart3, HelpCircle, LogOut, ChevronLeft, ChevronRight, Hexagon } from 'lucide-react';

const NAV_MAIN = [
  { to: '/dashboard', icon: Map, label: 'Sites' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
];

const NAV_BOTTOM = [
  { to: '#help', icon: HelpCircle, label: 'Help' },
  { to: '#logout', icon: LogOut, label: 'Logout' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const loc = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (to: string) => {
    if (to === '/dashboard') return loc.pathname === '/dashboard';
    return loc.pathname.startsWith(to);
  };

  const renderNavItem = (item: { to: string; icon: React.ElementType; label: string }) => {
    const { to, icon: Icon, label } = item;
    const active = isActive(to);
    const isLink = !to.startsWith('#');

    const content = (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: collapsed ? '10px 0' : '10px 12px',
          justifyContent: collapsed ? 'center' : 'flex-start',
          borderRadius: 'var(--ak-radius-sm)',
          marginBottom: 2,
          color: active ? 'var(--ak-primary)' : 'var(--ak-text-2)',
          background: active ? 'var(--ak-primary-subtle)' : 'transparent',
          transition: 'all 150ms var(--ak-ease)',
          textDecoration: 'none',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          fontSize: 13,
          fontWeight: active ? 600 : 400,
          cursor: 'pointer',
          position: 'relative',
        }}
        onMouseEnter={e => {
          if (!active) {
            (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)';
            (e.currentTarget as HTMLElement).style.color = 'var(--ak-text)';
          }
        }}
        onMouseLeave={e => {
          if (!active) {
            (e.currentTarget as HTMLElement).style.background = 'transparent';
            (e.currentTarget as HTMLElement).style.color = 'var(--ak-text-2)';
          }
        }}
      >
        <Icon size={17} style={{ flexShrink: 0 }} />
        {!collapsed && <span>{label}</span>}
      </div>
    );

    if (isLink) {
      return <Link key={to} to={to} title={collapsed ? label : undefined} style={{ textDecoration: 'none' }}>{content}</Link>;
    }
    return <div key={to} title={collapsed ? label : undefined}>{content}</div>;
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--ak-bg)' }}>
      {/* Sidebar — Glass */}
      <aside
        className="ak-glass"
        style={{
          width: collapsed ? 56 : 240,
          borderRight: '1px solid var(--ak-border)',
          transition: 'width 280ms cubic-bezier(0.16,1,0.3,1)',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          zIndex: 10,
          borderTop: 'none',
          borderBottom: 'none',
          borderLeft: 'none',
        }}
      >
        {/* Logo */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: collapsed ? '20px 0' : '20px 16px',
          justifyContent: collapsed ? 'center' : 'flex-start',
          borderBottom: '1px solid var(--ak-border)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, var(--ak-primary) 0%, #1A6AE0 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 2px 8px rgba(44, 123, 242, 0.3)',
          }}>
            <Hexagon size={16} color="#fff" strokeWidth={2.5} />
          </div>
          {!collapsed && (
            <div style={{ overflow: 'hidden' }}>
              <div style={{
                fontSize: 16, fontWeight: 800, color: 'var(--ak-text)',
                letterSpacing: '0.06em',
                lineHeight: 1,
              }}>
                AKARA
              </div>
              <div style={{
                fontSize: 9, fontWeight: 500, color: 'var(--ak-text-3)',
                letterSpacing: '0.08em', marginTop: 3,
              }}>
                by FlytBase
              </div>
            </div>
          )}
        </div>

        {/* Main nav */}
        <nav style={{ flex: 1, padding: '14px 10px 8px' }}>
          <div style={{
            fontSize: 9, fontWeight: 600, color: 'var(--ak-text-3)',
            letterSpacing: '0.1em', padding: '0 12px', marginBottom: 8,
            opacity: collapsed ? 0 : 1,
            transition: 'opacity 200ms',
          }}>
            NAVIGATION
          </div>
          {NAV_MAIN.map(renderNavItem)}
        </nav>

        {/* Bottom nav */}
        <div style={{ padding: '8px 10px', borderTop: '1px solid var(--ak-border)' }}>
          {NAV_BOTTOM.map(renderNavItem)}
        </div>

        {/* Collapse button */}
        <button
          onClick={() => setCollapsed(c => !c)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '12px', border: 'none', background: 'transparent',
            borderTop: '1px solid var(--ak-border)',
            color: 'var(--ak-text-3)', cursor: 'pointer',
            transition: 'color 150ms var(--ak-ease)',
            width: '100%',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--ak-text)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--ak-text-3)')}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflow: 'hidden', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {children}
      </main>
    </div>
  );
}
