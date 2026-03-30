import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Image, Mountain, Box, Layers, Download, MapPin, Clock, Cpu, Maximize2, Eye, EyeOff, Loader } from 'lucide-react';
import { projectsApi, jobsApi } from '../lib/api';
import { useNavigate } from 'react-router-dom';
import PanZoomViewer from '../components/viewer/PanZoomViewer';

type LayerKey = 'orthomosaic' | 'dsm' | 'dtm' | 'mesh' | 'pointcloud';

const LAYER_CONFIG: { key: LayerKey; label: string; icon: any; color: string; outputType: string }[] = [
  { key: 'orthomosaic', label: 'Orthomosaic', icon: Image, color: 'var(--ak-primary)', outputType: 'orthomosaic' },
  { key: 'dsm', label: 'DSM / Elevation', icon: Mountain, color: 'var(--ak-success)', outputType: 'dsm' },
  { key: 'dtm', label: 'DTM / Terrain', icon: Mountain, color: 'var(--ak-warning)', outputType: 'dtm' },
  { key: 'mesh', label: '3D Mesh', icon: Box, color: '#8B5CF6', outputType: 'mesh' },
  { key: 'pointcloud', label: 'Point Cloud', icon: Layers, color: '#EC4899', outputType: 'pointcloud' },
];

export default function ProjectPage() {
  const { siteId, projectId } = useParams<{ siteId: string; projectId: string }>();
  const navigate = useNavigate();
  const [activeLayer, setActiveLayer] = useState<LayerKey>('orthomosaic');
  const [showTrajectory, setShowTrajectory] = useState(false);

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsApi.get(projectId!),
    enabled: !!projectId,
  });

  const { data: outputs = [] } = useQuery({
    queryKey: ['project-outputs', projectId],
    queryFn: () => projectsApi.getOutputs(projectId!),
    enabled: !!projectId,
  });

  // Jobs for this project
  const { data: jobs = [] } = useQuery({
    queryKey: ['jobs', projectId],
    queryFn: () => jobsApi.list(projectId),
    enabled: !!projectId,
    refetchInterval: 5000,
  });

  const runningJob = jobs.find((j: any) => ['queued', 'downloading', 'processing'].includes(j.status));
  const isProcessing = !!runningJob;

  const outputByType = useMemo(() => {
    const map: Record<string, any> = {};
    for (const o of outputs) {
      // Prefer jpg for orthomosaic display
      if (o.type === 'orthomosaic' && map['orthomosaic'] && o.format === 'tif') continue;
      map[o.type] = o;
    }
    return map;
  }, [outputs]);

  const activeOutput = outputByType[activeLayer];
  const hasOutputs = outputs.length > 0;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Project header bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 16px',
        borderBottom: '1px solid var(--ak-border)',
        background: 'var(--ak-bg)',
        flexShrink: 0,
      }}>
        <Link to={`/sites/${siteId}`} style={{
          color: 'var(--ak-text-3)', display: 'flex',
          padding: 4, borderRadius: 6, transition: 'all 120ms',
        }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--ak-bg-warm)'; e.currentTarget.style.color = 'var(--ak-text)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--ak-text-3)'; }}
        >
          <ChevronLeft size={18} />
        </Link>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ak-text)' }}>
            {project?.name ?? 'Project'}
          </div>
          {project && (
            <div style={{ fontSize: 11, color: 'var(--ak-text-3)', display: 'flex', gap: 10, marginTop: 1 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <Cpu size={10} /> {project.quality || 'medium'}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <Image size={10} /> {project.image_count || 0} images
              </span>
              {project.gsd_cm && (
                <span>GSD: {project.gsd_cm} cm/px</span>
              )}
            </div>
          )}
        </div>

        <div style={{ flex: 1 }} />

        {/* Download active output */}
        {activeOutput?.download_url && (
          <a href={activeOutput.download_url} download style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '6px 14px', background: 'var(--ak-bg-page)',
            border: '1px solid var(--ak-border)', borderRadius: 8,
            color: 'var(--ak-text-2)', fontSize: 12, fontWeight: 500,
            textDecoration: 'none', transition: 'all 120ms',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--ak-border-hover)'; e.currentTarget.style.color = 'var(--ak-text)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--ak-border)'; e.currentTarget.style.color = 'var(--ak-text-2)'; }}
          >
            <Download size={13} />
            Download
            {activeOutput.size_bytes && (
              <span style={{ color: 'var(--ak-text-3)', fontSize: 10 }}>
                ({(activeOutput.size_bytes / 1e6).toFixed(0)} MB)
              </span>
            )}
          </a>
        )}
      </div>

      {/* Main content — viewer + layer tabs */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Viewer area */}
        <div style={{ flex: 1, position: 'relative', background: '#f0eeeb', overflow: 'hidden' }}>

          {/* Processing state — grid + progress bar */}
          {isProcessing && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 20,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              background: '#1e2127',
              backgroundImage: `
                linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
              `,
              backgroundSize: '40px 40px',
            }}>
              {/* Processing card */}
              <div style={{
                background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 14, padding: '28px 36px', textAlign: 'center',
                minWidth: 300,
              }}>
                <Loader size={28} color="var(--ak-primary)" style={{ animation: 'spin 1.5s linear infinite', marginBottom: 16 }} />
                <div style={{ fontSize: 15, fontWeight: 600, color: '#eee', marginBottom: 6 }}>
                  Processing
                </div>
                <div style={{ fontSize: 12, color: '#888', marginBottom: 16 }}>
                  {runningJob.stage || 'Queued'}
                </div>
                <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', marginBottom: 8 }}>
                  <div style={{
                    height: '100%', borderRadius: 2,
                    background: 'var(--ak-primary)',
                    width: `${runningJob.progress || 0}%`,
                    transition: 'width 500ms ease',
                  }} />
                </div>
                <div style={{ fontSize: 12, color: '#aaa', fontFamily: 'var(--ak-font-mono)' }}>
                  {runningJob.progress || 0}%
                </div>
                <button
                  onClick={() => navigate('/analytics')}
                  style={{
                    marginTop: 16, padding: '8px 16px',
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8, color: '#aaa', fontSize: 12, fontWeight: 500,
                    cursor: 'pointer', transition: 'all 120ms',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#aaa'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                >
                  View all jobs →
                </button>
              </div>
            </div>
          )}

          {/* Trajectory toggle — floating on ortho view */}
          {hasOutputs && activeLayer === 'orthomosaic' && !isProcessing && (
            <button
              onClick={() => setShowTrajectory(v => !v)}
              style={{
                position: 'absolute', top: 12, left: 12, zIndex: 10,
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 12px',
                background: showTrajectory ? 'rgba(44,123,242,0.9)' : 'rgba(255,255,255,0.9)',
                backdropFilter: 'blur(8px)',
                border: '1px solid ' + (showTrajectory ? 'rgba(44,123,242,0.3)' : 'rgba(0,0,0,0.06)'),
                borderRadius: 7,
                color: showTrajectory ? '#fff' : 'var(--ak-text-2)',
                fontSize: 11, fontWeight: 500, cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                transition: 'all 120ms',
              }}
            >
              {showTrajectory ? <Eye size={12} /> : <EyeOff size={12} />}
              Flight path
            </button>
          )}

          {!hasOutputs && !isProcessing ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              height: '100%', color: 'var(--ak-text-3)',
            }}>
              <MapPin size={32} style={{ marginBottom: 12, opacity: 0.3 }} />
              <p style={{ fontSize: 14, color: 'var(--ak-text-2)', fontWeight: 500 }}>No outputs yet</p>
              <p style={{ fontSize: 12, marginTop: 4 }}>Process this project to generate maps</p>
            </div>
          ) : activeLayer === 'orthomosaic' && activeOutput ? (
            <PanZoomViewer
              src={activeOutput.download_url}
              alt="Orthomosaic"
              gridType="geo"
            />
          ) : activeLayer === 'dsm' ? (
            <PanZoomViewer
              src="/assets/dsm_preview.jpg"
              alt="Digital Surface Model"
              gridType="elevation"
              overlay={
                <div style={{
                  position: 'absolute', bottom: 60, left: 16, zIndex: 10,
                  background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)',
                  borderRadius: 8, padding: '10px 14px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 4 }}>Elevation (DSM)</div>
                  <div style={{ width: 120, height: 8, borderRadius: 4, background: 'linear-gradient(to right, #313695,#4575b4,#74add1,#abd9e9,#ffffbf,#fee090,#fdae61,#f46d43,#d73027,#a50026)' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2, fontSize: 9, color: '#888' }}>
                    <span>Low</span><span>High</span>
                  </div>
                </div>
              }
            />
          ) : activeLayer === 'dtm' ? (
            <PanZoomViewer
              src="/assets/dtm_preview.jpg"
              alt="Digital Terrain Model"
              gridType="elevation"
              overlay={
                <div style={{
                  position: 'absolute', bottom: 60, left: 16, zIndex: 10,
                  background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)',
                  borderRadius: 8, padding: '10px 14px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 4 }}>Elevation (DTM)</div>
                  <div style={{ width: 120, height: 8, borderRadius: 4, background: 'linear-gradient(to right, #313695,#4575b4,#74add1,#abd9e9,#ffffbf,#fee090,#fdae61,#f46d43,#d73027,#a50026)' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2, fontSize: 9, color: '#888' }}>
                    <span>Low</span><span>High</span>
                  </div>
                </div>
              }
            />
          ) : activeLayer === 'mesh' ? (
            <div style={{
              width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', background: '#1a1d21',
            }}>
              <Box size={40} style={{ marginBottom: 12, opacity: 0.3, color: '#8B5CF6' }} />
              <p style={{ color: '#aaa', fontSize: 14, fontWeight: 500 }}>3D Mesh Viewer</p>
              <p style={{ color: '#666', fontSize: 12, marginTop: 4 }}>OBJ — {activeOutput?.size_bytes ? (activeOutput.size_bytes / 1e6).toFixed(0) : '33'} MB</p>
              {activeOutput?.download_url && (
                <a href={activeOutput.download_url} download style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 16,
                  padding: '10px 20px', background: '#8B5CF6', color: '#fff',
                  borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none',
                  boxShadow: '0 2px 8px rgba(139,92,246,0.3)',
                }}>
                  <Download size={13} /> Download OBJ
                </a>
              )}
            </div>
          ) : (
            <div style={{
              width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--ak-text-3)', fontSize: 13,
            }}>
              Select a layer to view
            </div>
          )}

          {/* Layer tabs — floating at bottom of viewer */}
          {hasOutputs && (
            <div style={{
              position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
              display: 'flex', gap: 4, padding: 4,
              background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)',
              borderRadius: 10, boxShadow: 'var(--ak-shadow-lg)',
              border: '1px solid var(--ak-border)',
              zIndex: 10,
            }}>
              {LAYER_CONFIG.map(({ key, label, icon: Icon, color, outputType }) => {
                const exists = !!outputByType[outputType];
                const active = activeLayer === key;
                return (
                  <button
                    key={key}
                    onClick={() => exists && setActiveLayer(key)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '7px 14px', borderRadius: 7,
                      background: active ? 'var(--ak-primary)' : 'transparent',
                      color: active ? '#fff' : exists ? 'var(--ak-text-2)' : 'var(--ak-text-3)',
                      border: 'none', cursor: exists ? 'pointer' : 'default',
                      fontSize: 11, fontWeight: active ? 600 : 500,
                      opacity: exists ? 1 : 0.35,
                      transition: 'all 120ms',
                    }}
                    onMouseEnter={e => { if (!active && exists) e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <Icon size={12} />
                    {label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
