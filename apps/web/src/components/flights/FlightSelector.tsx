import { useState, useRef, useEffect } from 'react';
import { ChevronDown, CheckCircle, Clock } from 'lucide-react';

export interface Flight {
  task_id: string;
  flight_date: string;
  mission_name: string;
  total_media_count: number;
  is_processed: boolean;
  job_ids: string[];
  files: any[];
}

interface Props {
  flights: Flight[];
  selected: Flight | null;
  onChange: (flight: Flight) => void;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

export default function FlightSelector({ flights, selected, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (!selected) return null;

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block', minWidth: 280 }}>
      {/* Trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'var(--fb-surface)', border: '1px solid var(--fb-border)',
          borderRadius: 'var(--fb-radius)', padding: '8px 14px',
          cursor: 'pointer', width: '100%',
          transition: 'border-color 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--fb-border-active)')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = open ? 'var(--fb-border-active)' : 'var(--fb-border)')}
      >
        <div style={{ flex: 1, textAlign: 'left' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fb-text)' }}>
            {formatDate(selected.flight_date)}
            <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--fb-text-3)', marginLeft: 6 }}>
              {formatTime(selected.flight_date)}
            </span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--fb-text-3)', marginTop: 1 }}>
            {selected.total_media_count} image{selected.total_media_count !== 1 ? 's' : ''}
            {selected.is_processed && (
              <span style={{ marginLeft: 8, color: 'var(--fb-success)', fontWeight: 500 }}>· Processed</span>
            )}
          </div>
        </div>
        <ChevronDown
          size={15}
          color="var(--fb-text-3)"
          style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: 'var(--fb-surface)', border: '1px solid var(--fb-border)',
          borderRadius: 'var(--fb-radius-lg)', zIndex: 100,
          boxShadow: 'var(--fb-shadow-lg)', overflow: 'hidden',
          maxHeight: 320, overflowY: 'auto',
        }}>
          {flights.length === 0 && (
            <div style={{ padding: '16px', fontSize: 13, color: 'var(--fb-text-3)', textAlign: 'center' }}>
              No flights found
            </div>
          )}
          {flights.map((f, i) => {
            const isSelected = f.task_id === selected.task_id;
            return (
              <button
                key={f.task_id}
                onClick={() => { onChange(f); setOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', padding: '10px 14px', textAlign: 'left',
                  background: isSelected ? 'var(--fb-primary-subtle)' : 'transparent',
                  border: 'none', borderBottom: i < flights.length - 1 ? '1px solid var(--fb-border)' : 'none',
                  cursor: 'pointer', transition: 'background 0.1s',
                }}
                onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
                onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: isSelected ? 600 : 400, color: isSelected ? 'var(--fb-primary)' : 'var(--fb-text)' }}>
                    {formatDate(f.flight_date)}
                    <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--fb-text-3)', marginLeft: 6 }}>
                      {formatTime(f.flight_date)}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--fb-text-3)', marginTop: 1 }}>
                    {f.total_media_count} image{f.total_media_count !== 1 ? 's' : ''}
                  </div>
                </div>
                {f.is_processed ? (
                  <CheckCircle size={14} color="var(--fb-success)" style={{ flexShrink: 0 }} />
                ) : (
                  <Clock size={14} color="var(--fb-text-3)" style={{ flexShrink: 0 }} />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
