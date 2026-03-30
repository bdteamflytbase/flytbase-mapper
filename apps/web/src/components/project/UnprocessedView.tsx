import { useState, useMemo, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useFlightMedia } from '../../hooks/useFlightMedia';
import { projectsApi } from '../../lib/api';
import MediaGallery from './MediaGallery';
import PhotoMarkerMap from './PhotoMarkerMap';
import ProcessButton from './ProcessButton';
import ProcessingModal from '../jobs/ProcessingModal';

interface Props {
  flight: any;
  projectId: string;
  siteId: string;
}

export default function UnprocessedView({ flight, projectId, siteId }: Props) {
  const qc = useQueryClient();
  const { data: mediaResponse, isLoading } = useFlightMedia(flight.flight_id);
  const [showModal, setShowModal] = useState(false);

  // Parse media — it may be an array or { media: [...] }
  const mediaItems: any[] = useMemo(() => {
    if (!mediaResponse) return [];
    if (Array.isArray(mediaResponse)) return mediaResponse;
    return mediaResponse.media ?? mediaResponse.data ?? [];
  }, [mediaResponse]);

  const images = useMemo(() => mediaItems.filter((m: any) => m.file_type === 'image'), [mediaItems]);

  // Selection state (local to this view)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Initialize selection with all images on load
  useMemo(() => {
    if (images.length > 0 && selectedIds.size === 0) {
      setSelectedIds(new Set(images.map((m: any) => m._id)));
    }
  }, [images]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => setSelectedIds(new Set(images.map((m: any) => m._id))), [images]);
  const clearAll = useCallback(() => setSelectedIds(new Set()), []);

  // GPS markers for map
  const markers = useMemo(() =>
    images
      .filter((m: any) => m.location?.latitude && m.location?.longitude)
      .map((m: any) => ({ lat: m.location.latitude, lng: m.location.longitude })),
    [images]
  );

  // Process mutation
  const processMutation = useMutation({
    mutationFn: (payload: any) => projectsApi.process(projectId, payload),
    onSuccess: () => {
      setShowModal(false);
      qc.invalidateQueries({ queryKey: ['jobs', projectId] });
      qc.invalidateQueries({ queryKey: ['project-flights', projectId] });
    },
  });

  const handleProcess = (quality: string, options: any) => {
    const selectedMedia = images.filter((m: any) => selectedIds.has(m._id));

    // Send media_files format — worker fetches download URLs from FlytBase itself
    const media_files = selectedMedia.map((m: any) => ({
      media_id: m._id || m.media_id,
      file_name: m.file_name,
    }));

    processMutation.mutate({
      selected_file_ids: selectedMedia.map((m: any) => m._id || m.media_id),
      flight_ids: [flight.flight_id],
      excluded_file_ids: [],
      quality,
      options,
      media_files,
    });
  };

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {/* Left half: Media Gallery */}
      <div style={{
        width: '50%', display: 'flex', flexDirection: 'column',
        background: '#0a0f18', borderRight: '1px solid var(--fb-border)',
        overflow: 'hidden',
      }}>
        <div style={{ flex: 1, overflow: 'auto', padding: '8px 8px 0' }}>
          {isLoading ? (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              height: '100%', color: 'var(--fb-text-3)', fontSize: 12,
            }}>
              Loading media...
            </div>
          ) : images.length === 0 ? (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              height: '100%', color: 'var(--fb-text-3)', fontSize: 12,
            }}>
              No images in this flight
            </div>
          ) : (
            <MediaGallery
              media={mediaItems}
              selectable
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onSelectAll={selectAll}
              onClearAll={clearAll}
            />
          )}
        </div>

        {/* Process button */}
        <div style={{ padding: '10px 12px', borderTop: '1px solid var(--fb-border)' }}>
          <ProcessButton
            mode="process"
            selectedCount={selectedIds.size}
            onClick={() => setShowModal(true)}
            disabled={flight.processing_status === 'processing'}
          />
        </div>
      </div>

      {/* Right half: Satellite Map with markers */}
      <div style={{ width: '50%', position: 'relative' }}>
        <PhotoMarkerMap markers={markers} />
      </div>

      {/* Processing modal */}
      {showModal && (
        <ProcessingModal
          selectedCount={selectedIds.size}
          onClose={() => setShowModal(false)}
          onSubmit={handleProcess}
        />
      )}
    </div>
  );
}
