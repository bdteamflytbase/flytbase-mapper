import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Loader, CheckCircle, XCircle, Clock, ChevronDown, ChevronRight, Download, Image, Box, Mountain, Activity, ArrowUpDown, X, Ban } from 'lucide-react';
import { jobsApi, projectsApi } from '../lib/api';

type FilterTab = 'all' | 'in_progress' | 'completed' | 'failed';
type SortKey = 'newest' | 'oldest' | 'most_images';

export default function AnalyticsPage() {
  const [tab, setTab] = useState<FilterTab>('all');
  const [sort, setSort] = useState<SortKey>('newest');
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data: allJobs = [], isLoading } = useQuery({ queryKey: ['all-jobs'], queryFn: () => jobsApi.list() });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => jobsApi.cancel(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['all-jobs'] }),
  });

  const activeCount = allJobs.filter((j: any) => ['queued', 'downloading', 'processing'].includes(j.status)).length;
  const completedCount = allJobs.filter((j: any) => j.status === 'completed').length;
  const failedCount = allJobs.filter((j: any) => j.status === 'failed' || j.status === 'canceled').length;

  // Filter
  let filtered = allJobs.filter((j: any) => {
    if (tab === 'in_progress') return ['queued', 'downloading', 'processing'].includes(j.status);
    if (tab === 'completed') return j.status === 'completed';
    if (tab === 'failed') return j.status === 'failed' || j.status === 'canceled';
    return true;
  });

  // Sort
  filtered = [...filtered].sort((a: any, b: any) => {
    if (sort === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    if (sort === 'most_images') return (b.image_count || 0) - (a.image_count || 0);
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime(); // newest
  });

  // Compute time taken for completed jobs
  const timeTaken = (job: any) => {
    if (!job.created_at || !job.completed_at) return null;
    const ms = new Date(job.completed_at).getTime() - new Date(job.created_at).getTime();
    const mins = Math.floor(ms / 60000);
    if (mins < 1) return '<1 min';
    if (mins < 60) return `${mins} min`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <div style={{ padding: '36px 40px', maxWidth: 1000, margin: '0 auto' }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--ak-text)', marginBottom: 4, letterSpacing: '-0.03em' }}>Analytics</h1>
        <p style={{ fontSize: 14, color: 'var(--ak-text-3)', marginBottom: 32 }}>Processing pipeline overview</p>

        {/* Stats */}
        <div className="ak-stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
          <StatCard label="Active" value={activeCount} accent />
          <StatCard label="Completed" value={completedCount} />
          <StatCard label="Failed / Canceled" value={failedCount} />
        </div>

        {/* Header with tabs + sort */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 2, background: 'var(--ak-bg-page)', borderRadius: 8, padding: 3 }}>
            {([
              { key: 'all', label: 'All' },
              { key: 'in_progress', label: 'In Progress' },
              { key: 'completed', label: 'Completed' },
              { key: 'failed', label: 'Failed' },
            ] as { key: FilterTab; label: string }[]).map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                padding: '5px 14px', fontSize: 12, fontWeight: 500,
                background: tab === t.key ? '#fff' : 'transparent',
                color: tab === t.key ? 'var(--ak-text)' : 'var(--ak-text-3)',
                border: 'none', borderRadius: 6, cursor: 'pointer',
                boxShadow: tab === t.key ? 'var(--ak-shadow-xs)' : 'none',
                transition: 'all 120ms',
              }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Sort dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <ArrowUpDown size={12} color="var(--ak-text-3)" />
            <select
              value={sort}
              onChange={e => setSort(e.target.value as SortKey)}
              style={{
                background: '#fff', border: '1px solid var(--ak-border)',
                borderRadius: 6, padding: '4px 8px', fontSize: 12,
                color: 'var(--ak-text-2)', cursor: 'pointer', outline: 'none',
              }}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="most_images">Most images</option>
            </select>
          </div>
        </div>

        {/* Job list */}
        <div style={{
          background: '#fff', border: '1px solid var(--ak-border)',
          borderRadius: 12, overflow: 'hidden',
        }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 100px 100px 80px 80px 36px',
            padding: '10px 18px', borderBottom: '1px solid var(--ak-border)',
            fontSize: 11, fontWeight: 500, color: 'var(--ak-text-3)',
          }}>
            <span>Job</span><span>Status</span><span>Time</span><span>Images</span><span>Actions</span><span></span>
          </div>

          {isLoading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--ak-text-3)', fontSize: 13 }}>Loading...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--ak-text-3)', fontSize: 13 }}>No jobs found</div>
          ) : (
            filtered.slice(0, 50).map((job: any) => (
              <JobRow
                key={job._id}
                job={job}
                expanded={expandedJob === job._id}
                onToggle={() => setExpandedJob(expandedJob === job._id ? null : job._id)}
                timeTaken={timeTaken(job)}
                onCancel={() => {
                  if (confirm('Cancel this job? Processing will stop immediately.')) {
                    cancelMutation.mutate(job._id);
                  }
                }}
                isCanceling={cancelMutation.isPending}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function JobRow({ job, expanded, onToggle, timeTaken, onCancel, isCanceling }: {
  job: any; expanded: boolean; onToggle: () => void; timeTaken: string | null;
  onCancel: () => void; isCanceling: boolean;
}) {
  const { data: outputs = [] } = useQuery({
    queryKey: ['job-outputs', job.project_id],
    queryFn: () => projectsApi.getOutputs(job.project_id),
    enabled: expanded && !!job.project_id,
  });
  const isRunning = ['queued', 'downloading', 'processing'].includes(job.status);

  return (
    <div style={{ borderBottom: '1px solid var(--ak-border)' }}>
      <div onClick={onToggle} style={{
        display: 'grid', gridTemplateColumns: '1fr 100px 100px 80px 80px 36px',
        padding: '12px 18px', fontSize: 13, color: 'var(--ak-text-2)',
        cursor: 'pointer', transition: 'background 80ms',
      }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--ak-surface-hover)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <span style={{ color: 'var(--ak-text)', fontWeight: 500, fontFamily: 'var(--ak-font-mono)', fontSize: 12 }}>
          JOB-{job._id.slice(-6).toUpperCase()}
        </span>
        <span><StatusBadge status={job.status} /></span>
        <span style={{ fontSize: 12, color: 'var(--ak-text-3)' }}>
          {timeTaken || (isRunning ? 'Running...' : '--')}
        </span>
        <span style={{ fontSize: 12 }}>{job.image_count ?? '--'}</span>
        <span>
          {isRunning && (
            <button
              onClick={e => { e.stopPropagation(); onCancel(); }}
              disabled={isCanceling}
              style={{
                display: 'flex', alignItems: 'center', gap: 3,
                padding: '3px 8px', borderRadius: 5,
                background: 'var(--ak-danger-bg)', color: 'var(--ak-danger)',
                border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 600,
                transition: 'all 120ms',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.15)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--ak-danger-bg)'}
            >
              <Ban size={10} /> Cancel
            </button>
          )}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {expanded ? <ChevronDown size={14} color="var(--ak-text-3)" /> : <ChevronRight size={14} color="var(--ak-text-3)" />}
        </span>
      </div>

      {expanded && (
        <div className="ak-animate-in" style={{ padding: '0 18px 18px', display: 'flex', gap: 20 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--ak-text-3)', marginBottom: 10 }}>Details</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
              <DetailRow label="Status" value={job.status} />
              <DetailRow label="Stage" value={job.stage || '--'} />
              <DetailRow label="Progress" value={`${job.progress || 0}%`} />
              <DetailRow label="Quality" value={job.quality || 'medium'} />
              <DetailRow label="Created" value={job.created_at ? new Date(job.created_at).toLocaleString() : '--'} />
              {job.completed_at && <DetailRow label="Completed" value={new Date(job.completed_at).toLocaleString()} />}
              {job.error && (
                <div style={{ marginTop: 4, padding: '8px 10px', background: 'var(--ak-danger-bg)', borderRadius: 8, fontSize: 12, color: 'var(--ak-danger)', lineHeight: 1.4 }}>
                  {job.error.slice(0, 200)}
                </div>
              )}
              {isRunning && (
                <div style={{ marginTop: 6 }}>
                  <div style={{ height: 4, borderRadius: 2, background: 'var(--ak-bg-page)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: 'var(--ak-primary)', width: `${job.progress || 0}%`, transition: 'width 400ms', borderRadius: 2 }} />
                  </div>
                </div>
              )}
              {job.project_id && <ProjectLink projectId={typeof job.project_id === 'object' ? job.project_id.toString() : job.project_id} />}
            </div>
          </div>

          {job.status === 'completed' && outputs.length > 0 && (
            <div style={{ width: 280 }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--ak-text-3)', marginBottom: 10 }}>Outputs</div>
              <OutputList outputs={outputs} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function OutputList({ outputs }: { outputs: any[] }) {
  const icons: Record<string, React.ReactNode> = {
    orthomosaic: <Image size={13} />, mesh: <Box size={13} />,
    dsm: <Mountain size={13} />, dtm: <Mountain size={13} />,
    pointcloud: <Activity size={13} />,
  };
  const labels: Record<string, string> = {
    orthomosaic: 'Orthomosaic', mesh: '3D Mesh', dsm: 'Surface Model',
    dtm: 'Terrain Model', pointcloud: 'Point Cloud',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {outputs.filter((o: any) => o.type !== 'thumbnail').map((o: any) => (
        <div key={o._id} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 10px', background: 'var(--ak-bg-page)',
          borderRadius: 8, transition: 'background 100ms',
        }}
          onMouseEnter={e => e.currentTarget.style.background = '#EBEEF2'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--ak-bg-page)'}
        >
          <span style={{ color: 'var(--ak-primary)', display: 'flex' }}>{icons[o.type] || <Activity size={13} />}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: 'var(--ak-text)', fontWeight: 500 }}>{labels[o.type] || o.type}</div>
            <div style={{ fontSize: 10, color: 'var(--ak-text-3)', marginTop: 1 }}>
              {o.format?.toUpperCase()} {o.size_bytes ? `· ${(o.size_bytes / 1e6).toFixed(1)} MB` : ''}
            </div>
          </div>
          {o.download_url && (
            <a href={o.download_url} download style={{
              display: 'flex', alignItems: 'center', gap: 3,
              padding: '3px 8px', background: 'var(--ak-primary-subtle)',
              borderRadius: 6, color: 'var(--ak-primary)', fontSize: 10,
              fontWeight: 600, textDecoration: 'none',
            }}><Download size={10} /> DL</a>
          )}
        </div>
      ))}
    </div>
  );
}

function ProjectLink({ projectId }: { projectId: string }) {
  const { data: project } = useQuery({ queryKey: ['project', projectId], queryFn: () => projectsApi.get(projectId), enabled: !!projectId, staleTime: 60_000 });
  if (!project) return null;
  return <Link to={`/sites/${project.site_id}/projects/${projectId}`} style={{ fontSize: 12, color: 'var(--ak-primary)', textDecoration: 'none', marginTop: 6, display: 'block', fontWeight: 500 }}>View Project →</Link>;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0' }}>
      <span style={{ color: 'var(--ak-text-3)', fontSize: 12 }}>{label}</span>
      <span style={{ color: 'var(--ak-text-2)', fontSize: 12, fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div className="ak-animate-in" style={{
      background: '#fff', border: '1px solid var(--ak-border)',
      borderRadius: 12, padding: '20px 24px', boxShadow: 'var(--ak-shadow-xs)',
    }}>
      <div style={{ fontSize: 12, color: 'var(--ak-text-3)', fontWeight: 500, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 34, fontWeight: 700, color: accent ? 'var(--ak-primary)' : 'var(--ak-text)', lineHeight: 1, letterSpacing: '-0.03em' }}>{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
    queued: { icon: Clock, color: 'var(--ak-warning)', bg: 'var(--ak-warning-bg)', label: 'Queued' },
    downloading: { icon: Loader, color: 'var(--ak-primary)', bg: 'var(--ak-primary-subtle)', label: 'Downloading' },
    processing: { icon: Loader, color: 'var(--ak-primary)', bg: 'var(--ak-primary-subtle)', label: 'Processing' },
    completed: { icon: CheckCircle, color: 'var(--ak-success)', bg: 'var(--ak-success-bg)', label: 'Done' },
    failed: { icon: XCircle, color: 'var(--ak-danger)', bg: 'var(--ak-danger-bg)', label: 'Failed' },
    canceled: { icon: Ban, color: 'var(--ak-text-3)', bg: 'var(--ak-bg-page)', label: 'Canceled' },
  };
  const cfg = configs[status] ?? configs.queued;
  const Icon = cfg.icon;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 8px', borderRadius: 6, background: cfg.bg, color: cfg.color,
      fontSize: 11, fontWeight: 500,
    }}><Icon size={11} /> {cfg.label}</span>
  );
}
