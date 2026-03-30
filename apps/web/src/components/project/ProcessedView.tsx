import { useState, useMemo } from 'react';
import { Download, ChevronDown, ChevronRight, RefreshCw, Image, Box, Mountain, Layers } from 'lucide-react';
import { useFlightMedia } from '../../hooks/useFlightMedia';
import { useFlightOutputs } from '../../hooks/useFlightOutputs';
import { useProjectViewStore } from '../../stores/projectViewStore';
import MediaGallery from './MediaGallery';
import Viewer2D from '../viewer/Viewer2D';
import Viewer3D from '../viewer/Viewer3D';
import ElevationView from '../viewer/ElevationView';

interface Props {
  flight: any;
  projectId: string;
  siteId: string;
}

type LayerType = 'orthomosaic' | '3d' | 'elevation' | 'terrain';

const LAYERS: { key: LayerType; label: string; icon: React.ElementType; outputType: string }[] = [
  { key: 'orthomosaic', label: 'Orthomosaic', icon: Image, outputType: 'orthomosaic' },
  { key: '3d', label: '3D Model', icon: Box, outputType: 'mesh' },
  { key: 'elevation', label: 'Elevation', icon: Mountain, outputType: 'dsm' },
  { key: 'terrain', label: 'Terrain', icon: Layers, outputType: 'dtm' },
];

export default function ProcessedView({ flight, projectId, siteId }: Props) {
  const { activeLayer, setActiveLayer } = useProjectViewStore();
  const [mediaExpanded, setMediaExpanded] = useState(false);

  const { data: outputs = [] } = useFlightOutputs(projectId, flight.job_ids);
  const { data: mediaResponse } = useFlightMedia(flight.flight_id);

  const mediaItems: any[] = useMemo(() => {
    if (!mediaResponse) return [];
    if (Array.isArray(mediaResponse)) return mediaResponse;
    return mediaResponse.media ?? mediaResponse.data ?? [];
  }, [mediaResponse]);

  const images = useMemo(() => mediaItems.filter((m: any) => m.file_type === 'image'), [mediaItems]);

  // Find output for each layer type
  const outputByType = useMemo(() => {
    const map: Record<string, any> = {};
    for (const o of outputs) map[o.type] = o;
    return map;
  }, [outputs]);

  // Default to orthomosaic if available
  const currentLayer = activeLayer ?? 'orthomosaic';
  const currentOutput = outputByType[LAYERS.find(l => l.key === currentLayer)?.outputType ?? ''];

  const handleDownload = (output: any) => {
    if (output?.download_url) {
      window.open(output.download_url, '_blank');
    }
  };

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {/* Left Panel */}
      <div style={{
        width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column',
        background: 'var(--fb-surface)', borderRight: '1px solid var(--fb-border)',
        overflow: 'hidden',
      }}>
        {/* LAYERS section */}
        <div style={{ padding: '14px 14px 8px' }}>
          <div style={{
            fontSize: 10, fontWeight: 600, color: 'var(--fb-text-3)',
            letterSpacing: '0.08em', marginBottom: 10,
          }}>
            LAYERS
          </div>

          {LAYERS.map(({ key, label, icon: Icon, outputType }) => {
            const output = outputByType[outputType];
            const isActive = currentLayer === key;
            const exists = !!output;

            return (
              <button
                key={key}
                onClick={() => exists && setActiveLayer(key)}
                disabled={!exists}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', padding: '9px 10px',
                  background: isActive ? 'var(--fb-primary-subtle)' : 'transparent',
                  border: 'none', borderRadius: 6, cursor: exists ? 'pointer' : 'default',
                  marginBottom: 2, transition: 'background var(--fb-transition)',
                  opacity: exists ? 1 : 0.35,
                }}
                onMouseEnter={e => {
                  if (exists && !isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                }}
                onMouseLeave={e => {
                  if (exists && !isActive) e.currentTarget.style.background = 'transparent';
                }}
              >
                {/* Radio dot */}
                <div style={{
                  width: 14, height: 14, borderRadius: '50%',
                  border: `2px solid ${isActive ? 'var(--fb-primary)' : 'var(--fb-text-3)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {isActive && (
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--fb-primary)' }} />
                  )}
                </div>

                <Icon size={14} color={isActive ? 'var(--fb-primary)' : 'var(--fb-text-2)'} />
                <span style={{
                  flex: 1, textAlign: 'left', fontSize: 12,
                  color: isActive ? 'var(--fb-text)' : 'var(--fb-text-2)',
                  fontWeight: isActive ? 600 : 400,
                }}>
                  {label}
                </span>

                {exists && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDownload(output); }}
                    style={{
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      color: 'var(--fb-text-3)', padding: 2,
                    }}
                    title="Download"
                  >
                    <Download size={12} />
                  </button>
                )}
              </button>
            );
          })}
        </div>

        <div style={{ borderBottom: '1px solid var(--fb-border)' }} />

        {/* MEDIA section */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <button
            onClick={() => setMediaExpanded(e => !e)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '12px 14px', width: '100%',
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: 'var(--fb-text-2)', fontSize: 12,
            }}
          >
            {mediaExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            <span style={{ fontWeight: 600, fontSize: 10, letterSpacing: '0.08em', color: 'var(--fb-text-3)' }}>
              MEDIA
            </span>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--fb-text-3)' }}>
              Map Photos {images.length > 0 ? `0/${images.length}` : ''}
            </span>
          </button>

          {mediaExpanded && (
            <div style={{ flex: 1, overflow: 'auto', padding: '0 8px 8px' }}>
              <MediaGallery media={mediaItems} />
            </div>
          )}
        </div>

        {/* Bottom: Rerun + stats */}
        <div style={{ padding: '10px 14px', borderTop: '1px solid var(--fb-border)' }}>
          <button
            onClick={() => {/* TODO: rerun processing */}}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              width: '100%', padding: '10px',
              background: 'rgba(255,255,255,0.04)', border: '1px solid var(--fb-border)',
              borderRadius: 'var(--fb-radius)', cursor: 'pointer',
              color: 'var(--fb-text-2)', fontSize: 12, fontWeight: 500,
            }}
          >
            <RefreshCw size={13} /> Rerun Processing
          </button>
          <div style={{ fontSize: 10, color: 'var(--fb-text-3)', marginTop: 8, textAlign: 'center' }}>
            {images.length} images | {outputs.length} outputs
          </div>
        </div>
      </div>

      {/* Viewer area */}
      <div style={{ flex: 1, position: 'relative', background: '#0a0f18' }}>
        {currentLayer === 'orthomosaic' && currentOutput && (
          <Viewer2D output={currentOutput} />
        )}
        {currentLayer === '3d' && currentOutput && (
          <Viewer3D output={currentOutput} />
        )}
        {(currentLayer === 'elevation' || currentLayer === 'terrain') && (
          <ElevationView
            dsm={outputByType['dsm']}
            dtm={outputByType['dtm']}
          />
        )}
        {!currentOutput && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            height: '100%', color: 'var(--fb-text-3)', fontSize: 13,
          }}>
            {outputs.length === 0 ? 'No outputs available yet.' : `Select a layer to view.`}
          </div>
        )}
      </div>
    </div>
  );
}
