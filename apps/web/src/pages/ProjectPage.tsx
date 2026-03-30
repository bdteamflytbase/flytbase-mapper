import { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Image, Map as MapIcon, ChevronDown, ChevronRight, X, Download } from 'lucide-react';
import { projectsApi, jobsApi } from '../lib/api';
import { getSocket } from '../lib/socket';
import { useProjectViewStore } from '../stores/projectViewStore';
import FlightDropdown from '../components/project/FlightDropdown';
import PhotoMarkerMap from '../components/project/PhotoMarkerMap';
import MediaGallery from '../components/project/MediaGallery';
import ProcessButton from '../components/project/ProcessButton';
import ProcessingModal from '../components/jobs/ProcessingModal';
import JobProgressBar from '../components/jobs/JobProgressBar';
import Viewer2D from '../components/viewer/Viewer2D';
import Viewer3D from '../components/viewer/Viewer3D';
import ElevationView from '../components/viewer/ElevationView';
import PointCloudView from '../components/viewer/PointCloudView';
import CustomProjectView from '../components/project/CustomProjectView';
import { useFlightMedia } from '../hooks/useFlightMedia';
import { useFlightOutputs } from '../hooks/useFlightOutputs';

export default function ProjectPage() {
  const { siteId, projectId } = useParams<{ siteId: string; projectId: string }>();
  const qc = useQueryClient();
  const { selectedFlight, setSelectedFlight, activeLayer, setActiveLayer, reset } = useProjectViewStore();

  const [showMedia, setShowMedia] = useState(false);
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [mapMenuOpen, setMapMenuOpen] = useState(false);
  const [panelCollapsed, setPanelCollapsed] = useState(false); // open by default

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsApi.get(projectId!),
    enabled: !!projectId,
  });

  const { data: dateGroups = [], isLoading: flightsLoading } = useQuery({
    queryKey: ['project-flights', projectId],
    queryFn: () => projectsApi.getFlights(projectId!),
    enabled: !!projectId,
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ['jobs', projectId],
    queryFn: () => jobsApi.list(projectId),
    enabled: !!projectId,
  });

  const runningJob = jobs.find((j: any) => ['queued', 'downloading', 'processing'].includes(j.status));
  const isCustomProject = !project?.mission_id;
  const allFlights = useMemo(() => dateGroups.flatMap((dg: any) => dg.flights), [dateGroups]);
  const isProcessed = selectedFlight?.processing_status === 'processed';

  // Media
  const { data: mediaResponse } = useFlightMedia(selectedFlight?.flight_id);
  const mediaItems: any[] = useMemo(() => {
    if (!mediaResponse) return [];
    if (Array.isArray(mediaResponse)) return mediaResponse;
    return mediaResponse.media ?? mediaResponse.data ?? [];
  }, [mediaResponse]);
  const images = useMemo(() => mediaItems.filter((m: any) => m.file_type === 'image'), [mediaItems]);

  // Outputs
  const { data: outputs = [] } = useFlightOutputs(projectId, selectedFlight?.job_ids);
  const outputByType = useMemo(() => {
    const map: Record<string, any> = {};
    for (const o of outputs) map[o.type] = o;
    return map;
  }, [outputs]);

  // GPS markers
  const markers = useMemo(() =>
    images
      .filter((m: any) => m.location?.latitude && m.location?.longitude)
      .map((m: any) => ({ lat: m.location.latitude, lng: m.location.longitude })),
    [images]
  );

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (images.length > 0 && !isProcessed) setSelectedIds(new Set(images.map((m: any) => m._id)));
  }, [images, isProcessed]);

  // Auto-select newest flight
  useEffect(() => {
    if (!selectedFlight && allFlights.length > 0) setSelectedFlight(allFlights[0]);
  }, [allFlights, selectedFlight, setSelectedFlight]);

  // Sync flight status
  useEffect(() => {
    if (selectedFlight) {
      const updated = allFlights.find((f: any) => f.flight_id === selectedFlight.flight_id);
      if (updated && updated.processing_status !== selectedFlight.processing_status) setSelectedFlight(updated);
    }
  }, [allFlights, selectedFlight, setSelectedFlight]);

  // WebSocket — no polling
  useEffect(() => {
    const socket = getSocket();
    const refetchAll = () => {
      qc.invalidateQueries({ queryKey: ['project-flights', projectId] });
      qc.invalidateQueries({ queryKey: ['jobs', projectId] });
      qc.invalidateQueries({ queryKey: ['project-outputs', projectId] });
    };
    const onUpdate = (data: any) => {
      if (data.project_id === projectId) qc.invalidateQueries({ queryKey: ['jobs', projectId] });
    };
    socket.on('job:completed', refetchAll);
    socket.on('job:failed', refetchAll);
    socket.on('job:update', onUpdate);
    return () => { socket.off('job:completed', refetchAll); socket.off('job:failed', refetchAll); socket.off('job:update', onUpdate); };
  }, [projectId, qc]);

  useEffect(() => reset, [reset]);

  const handleProcess = useCallback(async (quality: string, options: any) => {
    const sel = images.filter((m: any) => selectedIds.has(m._id));
    await projectsApi.process(projectId!, {
      selected_file_ids: sel.map((m: any) => m._id || m.media_id),
      flight_ids: [selectedFlight.flight_id],
      excluded_file_ids: [],
      quality, options,
      media_files: sel.map((m: any) => ({ media_id: m._id || m.media_id, file_name: m.file_name })),
    });
    setShowProcessModal(false);
    setShowMedia(false);
    qc.invalidateQueries({ queryKey: ['jobs', projectId] });
    qc.invalidateQueries({ queryKey: ['project-flights', projectId] });
  }, [images, selectedIds, selectedFlight, projectId, qc]);

  const layerToOutputType: Record<string, string> = {
    orthomosaic: 'orthomosaic', '3d': 'mesh', elevation: 'dsm', terrain: 'dtm', pointcloud: 'pointcloud',
  };
  const activeOutput = activeLayer ? outputByType[layerToOutputType[activeLayer] ?? ''] : null;

  const PANEL_W = panelCollapsed ? 0 : 280;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 16px', borderBottom: '1px solid var(--fb-border)',
        background: 'var(--fb-surface)', flexShrink: 0, zIndex: 50,
      }}>
        <Link to={`/sites/${siteId}`} style={{ color: 'var(--fb-text-3)', display: 'flex' }}>
          <ChevronLeft size={18} />
        </Link>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--fb-text)' }}>
          {project?.name ?? 'Project'}
        </span>
        {/* Panel toggle */}
        <button
          onClick={() => setPanelCollapsed(c => !c)}
          style={{
            marginLeft: 'auto', background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--fb-border)', borderRadius: 6,
            padding: '4px 8px', cursor: 'pointer', color: 'var(--fb-text-3)',
            fontSize: 11, display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          {panelCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
          {panelCollapsed ? 'Panel' : 'Hide'}
        </button>
      </div>

      {/* Main */}
      {isCustomProject ? (
        /* Custom project — show folder-based media gallery */
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          <CustomProjectView projectId={projectId!} siteId={siteId!} />
          {runningJob && (
            <div style={{ position: 'absolute', bottom: 12, left: 12, right: 12, zIndex: 60 }}>
              <JobProgressBar job={runningJob} />
            </div>
          )}
        </div>
      ) : (
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        {/* Left Panel */}
        {!panelCollapsed && (
          <div style={{
            width: PANEL_W, flexShrink: 0, display: 'flex', flexDirection: 'column',
            background: 'var(--fb-surface)', borderRight: '1px solid var(--fb-border)', zIndex: 10,
          }}>
            {/* Flight selector */}
            <div style={{ padding: '12px 12px 8px' }}>
              <FlightDropdown flights={allFlights} selected={selectedFlight} onSelect={(f) => {
                setSelectedFlight(f);
                setActiveLayer(null);
                setShowMedia(false);
                setMapMenuOpen(false);
              }} />
            </div>

            {/* Action buttons */}
            <div style={{ padding: '4px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {/* Media button — toggles */}
              <button
                onClick={() => { setShowMedia(s => !s); setActiveLayer(null); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 12px', width: '100%',
                  background: showMedia ? 'var(--fb-primary-subtle)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${showMedia ? 'var(--fb-primary)' : 'var(--fb-border)'}`,
                  borderRadius: 'var(--fb-radius)', cursor: 'pointer',
                  color: showMedia ? 'var(--fb-primary)' : 'var(--fb-text-2)',
                  fontSize: 12, fontWeight: 500, textAlign: 'left',
                }}
              >
                <Image size={14} />
                Media
                <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--fb-text-3)' }}>
                  {images.length || ''}
                </span>
              </button>

              {/* Map button — processed only */}
              {isProcessed && (
                <div>
                  <button
                    onClick={() => setMapMenuOpen(o => !o)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '10px 12px', width: '100%',
                      background: activeLayer ? 'var(--fb-primary-subtle)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${activeLayer ? 'var(--fb-primary)' : 'var(--fb-border)'}`,
                      borderRadius: 'var(--fb-radius)', cursor: 'pointer',
                      color: activeLayer ? 'var(--fb-primary)' : 'var(--fb-text-2)',
                      fontSize: 12, fontWeight: 500, textAlign: 'left',
                    }}
                  >
                    <MapIcon size={14} />
                    Map
                    {mapMenuOpen ? <ChevronDown size={12} style={{ marginLeft: 'auto' }} /> : <ChevronRight size={12} style={{ marginLeft: 'auto' }} />}
                  </button>

                  {mapMenuOpen && (
                    <div style={{
                      marginTop: 4, background: 'var(--fb-surface-2)',
                      border: '1px solid var(--fb-border)', borderRadius: 'var(--fb-radius)',
                      overflow: 'hidden',
                    }}>
                      {([
                        { key: 'orthomosaic', label: 'Orthomosaic', type: 'orthomosaic' },
                        { key: '3d', label: '3D Model', type: 'mesh' },
                        { key: 'elevation', label: 'Elevation', type: 'dsm' },
                        { key: 'terrain', label: 'Terrain', type: 'dtm' },
                        { key: 'pointcloud', label: 'Point Cloud', type: 'pointcloud' },
                      ] as const).map(({ key, label, type }) => {
                        const exists = !!outputByType[type];
                        const active = activeLayer === key;
                        return (
                          <button
                            key={key}
                            onClick={() => {
                              if (!exists) return;
                              setActiveLayer(key as any);
                              setShowMedia(false);
                              setMapMenuOpen(false);
                            }}
                            style={{
                              display: 'block', width: '100%', padding: '9px 14px',
                              background: active ? 'var(--fb-primary-subtle)' : 'transparent',
                              border: 'none', borderBottom: '1px solid var(--fb-border)',
                              color: !exists ? 'var(--fb-text-3)' : active ? 'var(--fb-primary)' : 'var(--fb-text)',
                              fontSize: 12, fontWeight: active ? 600 : 400,
                              cursor: exists ? 'pointer' : 'not-allowed',
                              textAlign: 'left', opacity: exists ? 1 : 0.35,
                            }}
                          >
                            {label} {!exists && '(n/a)'}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ flex: 1 }} />

            {/* Process button */}
            {selectedFlight && (
              <div style={{ padding: '10px 12px', borderTop: '1px solid var(--fb-border)' }}>
                {!isProcessed ? (
                  <ProcessButton mode="process" selectedCount={selectedIds.size}
                    onClick={() => { setShowMedia(true); setShowProcessModal(true); }}
                    disabled={selectedFlight.processing_status === 'processing'} />
                ) : (
                  <ProcessButton mode="rerun" onClick={() => setShowProcessModal(true)} />
                )}
              </div>
            )}
          </div>
        )}

        {/* Viewer area */}
        <div style={{ flex: 1, position: 'relative' }}>
          {flightsLoading ? (
            <Center>Loading flights...</Center>
          ) : !selectedFlight ? (
            <Center>{allFlights.length === 0 ? 'No flights found.' : 'Select a flight.'}</Center>
          ) : showMedia ? (
            /* Media overlay — split screen */
            <div style={{ display: 'flex', height: '100%' }}>
              <div style={{
                width: '50%', display: 'flex', flexDirection: 'column',
                background: '#0a0f18', borderRight: '1px solid var(--fb-border)',
                overflow: 'hidden', position: 'relative',
              }}>
                {/* Close button */}
                <button
                  onClick={() => setShowMedia(false)}
                  style={{
                    position: 'absolute', top: 8, right: 8, zIndex: 5,
                    background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: 6,
                    padding: 4, cursor: 'pointer', color: '#fff',
                  }}
                >
                  <X size={14} />
                </button>
                <div style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
                  <MediaGallery
                    media={mediaItems}
                    selectable={!isProcessed}
                    selectedIds={!isProcessed ? selectedIds : undefined}
                    onToggleSelect={(id) => setSelectedIds(prev => {
                      const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next;
                    })}
                    onSelectAll={() => setSelectedIds(new Set(images.map((m: any) => m._id)))}
                    onClearAll={() => setSelectedIds(new Set())}
                  />
                </div>
              </div>
              <div style={{ width: '50%' }}>
                <PhotoMarkerMap markers={markers} />
              </div>
            </div>
          ) : activeLayer && activeOutput ? (
            /* Map/Model viewer */
            <div style={{ width: '100%', height: '100%', position: 'relative' }}>
              {activeLayer === 'orthomosaic' && <Viewer2D output={activeOutput} />}
              {activeLayer === '3d' && <Viewer3D output={activeOutput} />}
              {(activeLayer === 'elevation' || activeLayer === 'terrain') && (
                <ElevationView dsm={outputByType['dsm']} dtm={outputByType['dtm']} />
              )}
              {activeLayer === 'pointcloud' && <PointCloudView output={activeOutput} />}

              {/* Download bar */}
              {activeOutput?.download_url && activeLayer !== 'pointcloud' && (
                <a
                  href={activeOutput.download_url}
                  download
                  style={{
                    position: 'absolute', top: 10, right: 10, zIndex: 1000,
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '6px 14px', background: 'rgba(0,0,0,0.7)',
                    border: '1px solid var(--fb-border)', borderRadius: 6,
                    color: '#fff', fontSize: 11, fontWeight: 500,
                    textDecoration: 'none', backdropFilter: 'blur(8px)',
                  }}
                >
                  <Download size={12} />
                  Download {activeLayer === '3d' ? 'OBJ' : activeLayer === 'orthomosaic' ? 'GeoTIFF' : 'File'}
                  {activeOutput.size_bytes && (
                    <span style={{ color: 'var(--fb-text-3)' }}>
                      ({(activeOutput.size_bytes / 1e6).toFixed(1)} MB)
                    </span>
                  )}
                </a>
              )}
            </div>
          ) : (
            /* Default: trajectory map */
            <PhotoMarkerMap markers={markers} />
          )}
        </div>

        {/* Job progress */}
        {runningJob && (
          <div style={{ position: 'absolute', bottom: 12, left: PANEL_W + 12, right: 12, zIndex: 60 }}>
            <JobProgressBar job={runningJob} />
          </div>
        )}
      </div>
      )}

      {showProcessModal && (
        <ProcessingModal
          selectedCount={isProcessed ? images.length : selectedIds.size}
          onClose={() => setShowProcessModal(false)}
          onSubmit={handleProcess}
        />
      )}
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--fb-text-3)', fontSize: 13 }}>
      {children}
    </div>
  );
}
