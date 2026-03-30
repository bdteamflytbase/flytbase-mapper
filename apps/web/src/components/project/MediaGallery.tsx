import { useState, useMemo } from 'react';
import { X } from 'lucide-react';

interface MediaItem {
  _id: string;
  file_name: string;
  file_type: string;
  thumbnail_url: string;
  data_url: string;
  download_url: string;
  location: { latitude: number; longitude: number };
  timestamp?: string;
}

interface Props {
  media: MediaItem[];
  selectable?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onSelectAll?: () => void;
  onClearAll?: () => void;
}

export default function MediaGallery({ media, selectable, selectedIds, onToggleSelect, onSelectAll, onClearAll }: Props) {
  const [lightbox, setLightbox] = useState<MediaItem | null>(null);

  const images = useMemo(() => media.filter(m => m.file_type === 'image'), [media]);
  const selectedCount = selectedIds?.size ?? 0;

  return (
    <>
      {/* Selection bar */}
      {selectable && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 0', fontSize: 11, color: 'var(--fb-text-3)',
        }}>
          <span>{selectedCount}/{images.length} selected</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onSelectAll} style={linkBtnStyle}>Select All</button>
            <button onClick={onClearAll} style={linkBtnStyle}>Clear</button>
          </div>
        </div>
      )}

      {/* Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
        gap: 4,
        overflowY: 'auto',
        flex: 1,
      }}>
        {images.map(item => {
          const isSelected = selectedIds?.has(item._id) ?? false;
          return (
            <div
              key={item._id}
              style={{
                position: 'relative', cursor: 'pointer',
                borderRadius: 4, overflow: 'hidden',
                opacity: selectable && !isSelected ? 0.5 : 1,
                transition: 'opacity 150ms',
              }}
            >
              <img
                src={item.thumbnail_url}
                alt={item.file_name}
                loading="lazy"
                onClick={() => setLightbox(item)}
                style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block' }}
              />

              {/* IMG badge */}
              <div style={{
                position: 'absolute', top: 4, left: 4,
                background: 'rgba(44,123,242,0.85)', color: '#fff',
                fontSize: 8, fontWeight: 700, padding: '1px 5px',
                borderRadius: 3, letterSpacing: '0.04em',
              }}>
                IMG
              </div>

              {/* Checkbox */}
              {selectable && (
                <div
                  onClick={(e) => { e.stopPropagation(); onToggleSelect?.(item._id); }}
                  style={{
                    position: 'absolute', top: 4, right: 4,
                    width: 18, height: 18, borderRadius: 3,
                    border: `2px solid ${isSelected ? 'var(--fb-primary)' : 'rgba(255,255,255,0.4)'}`,
                    background: isSelected ? 'var(--fb-primary)' : 'rgba(0,0,0,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  {isSelected && (
                    <svg width="10" height="10" viewBox="0 0 10 10">
                      <path d="M2 5 L4 7 L8 3" stroke="#fff" strokeWidth="1.5" fill="none" />
                    </svg>
                  )}
                </div>
              )}

              {/* Filename overlay */}
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                padding: '12px 6px 4px',
              }}>
                <div style={{
                  fontSize: 9, color: 'rgba(255,255,255,0.8)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {item.file_name}
                </div>
                {item.timestamp && (
                  <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.5)' }}>
                    {new Date(item.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })},
                    {' '}{new Date(item.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.92)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'zoom-out',
          }}
        >
          <button
            onClick={() => setLightbox(null)}
            style={{
              position: 'absolute', top: 16, right: 16,
              background: 'rgba(255,255,255,0.1)', border: 'none',
              borderRadius: 8, padding: 8, cursor: 'pointer', color: '#fff',
            }}
          >
            <X size={20} />
          </button>
          <img
            src={lightbox.data_url || lightbox.thumbnail_url}
            alt={lightbox.file_name}
            style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 8 }}
            onClick={e => e.stopPropagation()}
          />
          <div style={{
            position: 'absolute', bottom: 20,
            color: 'rgba(255,255,255,0.7)', fontSize: 12, textAlign: 'center',
          }}>
            {lightbox.file_name}
            {lightbox.location && (
              <span style={{ marginLeft: 12, fontSize: 11 }}>
                {lightbox.location.latitude.toFixed(6)}, {lightbox.location.longitude.toFixed(6)}
              </span>
            )}
          </div>
        </div>
      )}
    </>
  );
}

const linkBtnStyle: React.CSSProperties = {
  background: 'transparent', border: 'none', cursor: 'pointer',
  color: 'var(--fb-primary)', fontSize: 11, fontWeight: 500,
  padding: 0,
};
