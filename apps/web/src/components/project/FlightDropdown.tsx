import { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Loader, Search } from 'lucide-react';

interface Flight {
  flight_id: string;
  flight_date: string;
  mission_name: string;
  total_media_count: number;
  processing_status: 'processed' | 'processing' | 'unprocessed';
}

interface Props {
  flights: Flight[];
  selected: Flight | null;
  onSelect: (f: Flight) => void;
}

export default function FlightDropdown({ flights, selected, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = useMemo(() => {
    if (!search) return flights;
    const s = search.toLowerCase();
    return flights.filter(f =>
      f.mission_name?.toLowerCase().includes(s) ||
      f.flight_date?.includes(s)
    );
  }, [flights, search]);

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch { return d; }
  };

  return (
    <div ref={ref} style={{ position: 'relative', zIndex: 100 }}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--fb-surface)', border: '1px solid var(--fb-border)',
          borderRadius: 'var(--fb-radius)', padding: '8px 14px',
          color: 'var(--fb-text)', cursor: 'pointer', fontSize: 13,
          width: '100%', transition: 'border-color var(--fb-transition)',
        }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--fb-border-active)')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--fb-border)')}
      >
        {selected && <StatusDot status={selected.processing_status} />}
        <span style={{ flex: 1, textAlign: 'left', fontWeight: 500 }}>
          {selected ? `${formatDate(selected.flight_date)} — ${selected.mission_name}` : 'Select flight'}
        </span>
        {selected && (
          <span style={{ fontSize: 11, color: 'var(--fb-text-3)' }}>
            {selected.total_media_count} imgs
          </span>
        )}
        <ChevronDown size={14} color="var(--fb-text-3)" />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: 4,
          width: '100%', maxHeight: 420,
          background: 'var(--fb-surface)', border: '1px solid var(--fb-border)',
          borderRadius: 'var(--fb-radius-lg)', boxShadow: 'var(--fb-shadow-lg)',
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
        }}>
          {/* Search */}
          <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--fb-border)' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'rgba(255,255,255,0.04)', borderRadius: 6, padding: '6px 10px',
            }}>
              <Search size={13} color="var(--fb-text-3)" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Filter by mission..."
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  color: 'var(--fb-text)', fontSize: 12,
                }}
              />
            </div>
          </div>

          {/* Flight list */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filtered.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--fb-text-3)', fontSize: 12 }}>
                No flights found
              </div>
            ) : (
              filtered.map(f => (
                <button
                  key={f.flight_id}
                  onClick={() => { onSelect(f); setOpen(false); setSearch(''); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px', width: '100%',
                    background: selected?.flight_id === f.flight_id ? 'var(--fb-primary-subtle)' : 'transparent',
                    border: 'none', cursor: 'pointer', textAlign: 'left',
                    borderBottom: '1px solid var(--fb-border)',
                    transition: 'background var(--fb-transition)',
                  }}
                  onMouseEnter={e => {
                    if (selected?.flight_id !== f.flight_id)
                      e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                  }}
                  onMouseLeave={e => {
                    if (selected?.flight_id !== f.flight_id)
                      e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <StatusDot status={f.processing_status} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--fb-text)' }}>
                      {formatDate(f.flight_date)}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--fb-text-3)', marginTop: 1 }}>
                      {f.mission_name}
                    </div>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--fb-text-3)', flexShrink: 0 }}>
                    {f.total_media_count} imgs
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  if (status === 'processing') {
    return <Loader size={12} color="var(--fb-primary)" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} />;
  }
  return (
    <div style={{
      width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
      background: status === 'processed' ? 'var(--fb-success)' : 'var(--fb-text-3)',
    }} />
  );
}
