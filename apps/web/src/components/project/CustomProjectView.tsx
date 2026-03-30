import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronDown, Search, X, Clock, Image } from 'lucide-react';
import { mediaApi, projectsApi } from '../../lib/api';
import MediaGallery from './MediaGallery';
import ProcessButton from './ProcessButton';
import ProcessingModal from '../jobs/ProcessingModal';

interface Props { projectId: string; siteId: string; }

export default function CustomProjectView({ projectId, siteId }: Props) {
  const qc = useQueryClient();
  const [selectedFolder, setSelectedFolder] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [search, setSearch] = useState('');

  // Filters
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [filters, setFilters] = useState<Record<string, string[]>>({});

  // Filter options
  const { data: filterOptions } = useQuery({
    queryKey: ['media-filter-options'],
    queryFn: () => mediaApi.getFilterOptions(),
    staleTime: 300_000,
  });

  // Build POST body for folder query with filters
  const folderBody = useMemo(() => {
    const body: any = {};
    if (search) body.search = search;
    if (filters.sites?.length) body.siteIds = filters.sites;
    if (filters.missions?.length) body.missionIds = filters.missions;
    if (filters.devices?.length) body.droneIds = filters.devices;
    return body;
  }, [search, filters]);

  // Infinite scroll folders
  const {
    data: foldersPages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: foldersLoading,
  } = useInfiniteQuery({
    queryKey: ['media-folders', folderBody],
    queryFn: ({ pageParam = 1 }) => mediaApi.getFolders(pageParam, 60, folderBody),
    getNextPageParam: (lastPage, allPages) => {
      const folders = lastPage?.media ?? [];
      return folders.length >= 60 ? allPages.length + 1 : undefined;
    },
    initialPageParam: 1,
  });

  const allFolders = useMemo(() =>
    foldersPages?.pages.flatMap(p => p?.media ?? []) ?? [],
    [foldersPages]
  );

  // Group folders by date
  const dateGroups = useMemo(() => {
    const groups: Record<string, any[]> = {};
    for (const f of allFolders) {
      const d = f.created_time ? new Date(f.created_time).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Unknown';
      if (!groups[d]) groups[d] = [];
      groups[d].push(f);
    }
    return Object.entries(groups);
  }, [allFolders]);

  // Infinite scroll observer
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!sentinelRef.current) return;
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage();
    }, { threshold: 0.1 });
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Folder files
  const { data: folderFilesData, isLoading: filesLoading } = useQuery({
    queryKey: ['folder-files', selectedFolder?.task_id],
    queryFn: () => mediaApi.getFolderFiles(selectedFolder.task_id),
    enabled: !!selectedFolder?.task_id,
  });

  const folderFiles: any[] = useMemo(() => {
    if (!folderFilesData?.media) return [];
    return folderFilesData.media.flatMap((g: any) => (g.files || []).map((f: any) => ({
      _id: f.media_id, file_name: f.file_name,
      file_type: f.file_type === 0 ? 'image' : 'video',
      thumbnail_url: f.thumbnail_url, data_url: f.data_url, download_url: f.data_url,
      location: { latitude: f.location?.lat ?? 0, longitude: f.location?.long ?? 0 },
      timestamp: f.capture_timestamp, media_id: f.media_id,
    })));
  }, [folderFilesData]);

  const images = useMemo(() => folderFiles.filter(f => f.file_type === 'image'), [folderFiles]);
  useMemo(() => { if (images.length > 0) setSelectedIds(new Set(images.map(m => m._id))); }, [images]);

  const handleProcess = useCallback(async (quality: string, options: any) => {
    const sel = images.filter(m => selectedIds.has(m._id));
    await projectsApi.process(projectId, {
      selected_file_ids: sel.map(m => m._id),
      flight_ids: selectedFolder ? [selectedFolder.task_id] : [],
      excluded_file_ids: [], quality, options,
      media_files: sel.map(m => ({ media_id: m._id, file_name: m.file_name })),
    });
    setShowProcessModal(false);
    qc.invalidateQueries({ queryKey: ['jobs', projectId] });
  }, [images, selectedIds, selectedFolder, projectId, qc]);

  const toggleFilter = (key: string, value: string) => {
    setFilters(prev => {
      const arr = prev[key] ?? [];
      const next = arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value];
      return { ...prev, [key]: next };
    });
  };

  const FILTER_CONFIGS = [
    { key: 'sites', label: 'Site', items: filterOptions?.sites?.map((s: any) => ({ id: s._id || s, name: s.name || s })) ?? [] },
    { key: 'missions', label: 'Mission', items: filterOptions?.missions?.map((m: any) => ({ id: m._id || m, name: m.name || m })) ?? [] },
  ];

  if (selectedFolder) {
    // File view inside folder
    return (
      <div style={{ display: 'flex', height: '100%' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#0a0f18', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--fb-border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => setSelectedFolder(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fb-text-3)', display: 'flex' }}>
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fb-text)' }}>
              {selectedFolder.missions?.[0]?.name || selectedFolder.missionDetails?.[0]?.name || 'Flight Media'}
            </span>
            <span style={{ fontSize: 11, color: 'var(--fb-text-3)', marginLeft: 'auto' }}>{images.length} images</span>
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
            {filesLoading ? (
              <Center>Loading files...</Center>
            ) : (
              <MediaGallery media={folderFiles} selectable selectedIds={selectedIds}
                onToggleSelect={id => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; })}
                onSelectAll={() => setSelectedIds(new Set(images.map(m => m._id)))}
                onClearAll={() => setSelectedIds(new Set())}
              />
            )}
          </div>
          {images.length > 0 && (
            <div style={{ padding: '10px 12px', borderTop: '1px solid var(--fb-border)' }}>
              <ProcessButton mode="process" selectedCount={selectedIds.size} onClick={() => setShowProcessModal(true)} />
            </div>
          )}
        </div>
        {showProcessModal && (
          <ProcessingModal selectedCount={selectedIds.size} onClose={() => setShowProcessModal(false)} onSubmit={handleProcess} />
        )}
      </div>
    );
  }

  // Folder gallery view
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0a0f18' }}>
      {/* Filter bar */}
      <div style={{
        padding: '10px 16px', borderBottom: '1px solid var(--fb-border)',
        display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', flexShrink: 0,
      }}>
        {/* Search */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.04)',
          borderRadius: 6, padding: '6px 10px', width: 200,
        }}>
          <Search size={13} color="var(--fb-text-3)" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search"
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--fb-text)', fontSize: 12 }}
          />
        </div>

        {/* Filter dropdowns */}
        {FILTER_CONFIGS.map(({ key, label, items }) => (
          <div key={key} style={{ position: 'relative' }}>
            <button
              onClick={() => setActiveFilter(activeFilter === key ? null : key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px',
                background: (filters[key]?.length ?? 0) > 0 ? 'var(--fb-primary-subtle)' : 'rgba(255,255,255,0.04)',
                border: '1px solid var(--fb-border)', borderRadius: 6, cursor: 'pointer',
                color: (filters[key]?.length ?? 0) > 0 ? 'var(--fb-primary)' : 'var(--fb-text-2)',
                fontSize: 11, fontWeight: 500,
              }}
            >
              {label} {(filters[key]?.length ?? 0) > 0 && `(${filters[key].length})`}
              <ChevronDown size={10} />
            </button>
            {activeFilter === key && items.length > 0 && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, marginTop: 4,
                background: 'var(--fb-surface)', border: '1px solid var(--fb-border)',
                borderRadius: 8, boxShadow: 'var(--fb-shadow-lg)', zIndex: 100,
                width: 220, maxHeight: 240, overflow: 'auto',
              }}>
                {items.slice(0, 50).map((item: any) => {
                  const selected = filters[key]?.includes(item.id) ?? false;
                  return (
                    <button key={item.id} onClick={() => toggleFilter(key, item.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                        padding: '7px 12px', border: 'none', borderBottom: '1px solid var(--fb-border)',
                        background: selected ? 'var(--fb-primary-subtle)' : 'transparent',
                        color: selected ? 'var(--fb-primary)' : 'var(--fb-text-2)',
                        fontSize: 11, cursor: 'pointer', textAlign: 'left',
                      }}
                    >
                      <div style={{
                        width: 14, height: 14, borderRadius: 3, flexShrink: 0,
                        border: `2px solid ${selected ? 'var(--fb-primary)' : 'var(--fb-text-3)'}`,
                        background: selected ? 'var(--fb-primary)' : 'transparent',
                      }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}

        {Object.values(filters).some(v => v?.length > 0) && (
          <button onClick={() => setFilters({})} style={{
            padding: '5px 10px', fontSize: 11, color: 'var(--fb-text-3)',
            background: 'transparent', border: 'none', cursor: 'pointer',
          }}>Reset</button>
        )}

        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--fb-text-3)' }}>
          {allFolders.length} folders{hasNextPage ? '+' : ''}
        </span>
      </div>

      {/* Folder list grouped by date */}
      <div ref={scrollRef} style={{ flex: 1, overflow: 'auto', padding: '0 16px 16px' }}
        onClick={() => activeFilter && setActiveFilter(null)}
      >
        {foldersLoading ? (
          <Center>Loading media...</Center>
        ) : dateGroups.length === 0 ? (
          <Center>No media found</Center>
        ) : (
          dateGroups.map(([date, folders]) => (
            <div key={date}>
              {/* Date header */}
              <div style={{
                fontSize: 13, fontWeight: 600, color: 'var(--fb-text)',
                padding: '16px 0 8px', borderBottom: '1px solid var(--fb-border)', marginBottom: 12,
              }}>
                {date}
              </div>

              {/* Folder cards grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: 12, marginBottom: 8,
              }}>
                {folders.map((folder: any) => (
                  <FolderCard key={folder.task_id} folder={folder} onClick={() => setSelectedFolder(folder)} />
                ))}
              </div>
            </div>
          ))
        )}

        {/* Infinite scroll sentinel */}
        <div ref={sentinelRef} style={{ height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {isFetchingNextPage && <span style={{ fontSize: 12, color: 'var(--fb-text-3)' }}>Loading more...</span>}
        </div>
      </div>
    </div>
  );
}

function FolderCard({ folder, onClick }: { folder: any; onClick: () => void }) {
  const missionName = folder.missions?.[0]?.name || folder.missionDetails?.[0]?.name || 'Go to location';
  const date = folder.created_time ? new Date(folder.created_time) : null;
  const time = date ? date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '';
  const tz = date ? `(GMT ${date.getTimezoneOffset() > 0 ? '-' : '+'}${String(Math.abs(date.getTimezoneOffset() / 60)).padStart(2, '0')}:${String(Math.abs(date.getTimezoneOffset() % 60)).padStart(2, '0')})` : '';

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--fb-surface)', border: '1px solid var(--fb-border)',
        borderRadius: 10, overflow: 'hidden', cursor: 'pointer',
        transition: 'border-color var(--fb-transition), transform var(--fb-transition)',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--fb-border-active)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--fb-border)'; e.currentTarget.style.transform = 'none'; }}
    >
      {/* Thumbnail */}
      <div style={{
        height: 150, position: 'relative',
        background: folder.thumbnail?.url
          ? `url(${folder.thumbnail.url}) center/cover no-repeat`
          : 'linear-gradient(135deg, #1a2332, #0f1923)',
      }}>
        {!folder.thumbnail?.url && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Image size={28} color="var(--fb-text-3)" style={{ opacity: 0.3 }} />
          </div>
        )}
        {/* Media count badge */}
        <div style={{
          position: 'absolute', bottom: 8, right: 8,
          background: 'rgba(0,0,0,0.7)', borderRadius: 4,
          padding: '2px 6px', fontSize: 10, color: '#fff', fontWeight: 600,
          backdropFilter: 'blur(4px)',
        }}>
          {folder.uploaded_media_count || 0} items
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: '10px 12px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fb-text)', marginBottom: 2 }}>
          {missionName}
        </div>
        <div style={{ fontSize: 11, color: 'var(--fb-text-3)' }}>
          {time} {tz}
        </div>
      </div>
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--fb-text-3)', fontSize: 12 }}>
      {children}
    </div>
  );
}
