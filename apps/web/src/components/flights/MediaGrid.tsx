import { useState } from 'react';
import { MapPin, FileImage, X } from 'lucide-react';

interface MediaFile {
  _id: string;
  file_name: string;
  thumbnail_url: string;
  data_url?: string;
  location?: { lat: number; long: number; alt?: number };
}

interface Props {
  files: MediaFile[];
  flightDate: string;
  totalCount: number;
}

export default function MediaGrid({ files, flightDate, totalCount }: Props) {
  const [lightbox, setLightbox] = useState<MediaFile | null>(null);

  if (!files || files.length === 0) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        height: 200, gap: 8,
      }}>
        <FileImage size={28} color="var(--fb-text-3)" />
        <p style={{ color: 'var(--fb-text-3)', fontSize: 13 }}>No media loaded for this flight</p>
      </div>
    );
  }

  return (
    <>
      {/* Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
        gap: 8,
        padding: '16px 24px',
      }}>
        {files.map((file) => (
          <div
            key={file._id}
            onClick={() => setLightbox(file)}
            style={{
              position: 'relative', borderRadius: 8,
              overflow: 'hidden', cursor: 'pointer',
              background: 'var(--fb-surface)',
              border: '1px solid var(--fb-border)',
              aspectRatio: '4/3',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.transform = 'scale(1.02)';
              (e.currentTarget as HTMLElement).style.boxShadow = 'var(--fb-shadow-lg)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
              (e.currentTarget as HTMLElement).style.boxShadow = 'none';
            }}
          >
            {file.thumbnail_url ? (
              <img
                src={file.thumbnail_url}
                alt={file.file_name}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                loading="lazy"
              />
            ) : (
              <div style={{
                width: '100%', height: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'linear-gradient(135deg, #0f172a, #1e293b)',
              }}>
                <FileImage size={24} color="rgba(255,255,255,0.2)" />
              </div>
            )}

            {/* GPS badge */}
            {file.location && file.location.lat !== 0 && (
              <div style={{
                position: 'absolute', top: 5, left: 5,
                background: 'rgba(0,0,0,0.7)', borderRadius: 4,
                padding: '2px 5px', display: 'flex', alignItems: 'center', gap: 3,
              }}>
                <MapPin size={9} color="var(--fb-primary)" />
                <span style={{ fontSize: 9, color: '#fff', fontFamily: 'monospace' }}>
                  {file.location.lat.toFixed(4)}, {file.location.long.toFixed(4)}
                </span>
              </div>
            )}

            {/* Filename on hover — bottom overlay */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              background: 'linear-gradient(transparent, rgba(0,0,0,0.75))',
              padding: '14px 6px 5px',
            }}>
              <div style={{
                fontSize: 10, color: 'rgba(255,255,255,0.85)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {file.file_name}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer count */}
      <div style={{ padding: '0 24px 16px', fontSize: 11, color: 'var(--fb-text-3)' }}>
        Showing {files.length} of {totalCount} images
        {files.length < totalCount && (
          <span style={{ marginLeft: 4 }}>
            · <span style={{ color: 'var(--fb-text-2)' }}>Remaining images load during processing</span>
          </span>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <button
            onClick={() => setLightbox(null)}
            style={{
              position: 'absolute', top: 20, right: 20,
              background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8,
              color: '#fff', cursor: 'pointer', padding: 8, display: 'flex',
            }}
          >
            <X size={18} />
          </button>
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '90vh' }}>
            <img
              src={lightbox.data_url || lightbox.thumbnail_url}
              alt={lightbox.file_name}
              style={{ maxWidth: '100%', maxHeight: '85vh', objectFit: 'contain', borderRadius: 8 }}
            />
            <div style={{ textAlign: 'center', marginTop: 10, color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
              {lightbox.file_name}
              {lightbox.location && lightbox.location.lat !== 0 && (
                <span style={{ marginLeft: 10 }}>
                  {lightbox.location.lat.toFixed(6)}, {lightbox.location.long.toFixed(6)}
                  {lightbox.location.alt != null && ` · ${lightbox.location.alt.toFixed(0)}m`}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
