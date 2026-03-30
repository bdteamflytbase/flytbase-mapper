import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Loader, CheckCircle, XCircle, Clock, ChevronDown, ChevronRight, Download, Image, Box, Mountain, Activity, Database, Zap } from 'lucide-react';
import { jobsApi, projectsApi } from '../lib/api';

type FilterTab = 'all' | 'in_progress' | 'completed';

export default function AnalyticsPage() {
  const [tab, setTab] = useState<FilterTab>('all');
  const [expandedJob, setExpandedJob] = useState<string | null>(null);

  const { data: allJobs = [], isLoading } = useQuery({
    queryKey: ['all-jobs'],
    queryFn: () => jobsApi.list(),
  });

  const activeCount = allJobs.filter((j: any) => ['queued', 'downloading', 'processing'].includes(j.status)).length;
  const completedCount = allJobs.filter((j: any) => j.status === 'completed').length;
  const totalDataMB = allJobs.reduce((s: number, j: any) => s + (j.image_count || 0) * 2, 0);

  const filtered = allJobs.filter((j: any) => {
    if (tab === 'in_progress') return ['queued', 'downloading', 'processing'].includes(j.status);
    if (tab === 'completed') return j.status === 'completed';
    return true;
  });

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <div style={{ padding: '32px 36px', maxWidth: 1100, margin: '0 auto' }}>
        <div className="ak-animate-in">
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--ak-text)', marginBottom: 4, letterSpacing: '-0.02em' }}>
            Processing Analytics
          </h1>
          <p style={{ fontSize: 13, color: 'var(--ak-text-2)', marginBottom: 28 }}>
            Real-time status of geospatial reconstruction pipelines
          </p>
        </div>

        {/* Stats */}
        <div className="ak-stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 32 }}>
          <StatCard label="ACTIVE JOBS" value={activeCount}
            sub={activeCount > 0 ? 'Processing now' : 'All clear'} color="var(--ak-primary)" icon={<Zap size={14} />} />
          <StatCard label="COMPLETED" value={completedCount} sub="Total processed" color="var(--ak-success)" icon={<CheckCircle size={14} />} />
          <StatCard label="DATA PROCESSED" value={`${(totalDataMB / 1000).toFixed(1)} GB`}
            sub={`${allJobs.length} total jobs`} color="var(--ak-accent)" icon={<Database size={14} />} />
        </div>

        {/* Job Pipeline header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--ak-text)', letterSpacing: '-0.01em' }}>Job Pipeline</div>
          <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--ak-radius-sm)', padding: 3 }}>
            {(['all', 'in_progress', 'completed'] as FilterTab[]).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: '5px 14px', fontSize: 11, fontWeight: 600,
                background: tab === t ? 'var(--ak-primary-subtle)' : 'transparent',
                color: tab === t ? 'var(--ak-primary)' : 'var(--ak-text-3)',
                border: 'none', borderRadius: 4, cursor: 'pointer',
                transition: 'all 150ms var(--ak-ease)',
                letterSpacing: '0.02em',
              }}>
                {t === 'in_progress' ? 'In Progress' : t === 'all' ? 'All' : 'Completed'}
              </button>
            ))}
          </div>
        </div>

        {/* Job list */}
        <div style={{
          background: 'rgba(255,255,255,0.02)', border: '1px solid var(--ak-border)',
          borderRadius: 'var(--ak-radius-lg)', overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 120px 140px 100px 40px',
            padding: '12px 18px', borderBottom: '1px solid var(--ak-border)',
            fontSize: 10, fontWeight: 600, color: 'var(--ak-text-3)', letterSpacing: '0.06em',
          }}>
            <span>JOB ID</span><span>STATUS</span><span>CREATED</span><span>IMAGES</span><span></span>
          </div>

          {isLoading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--ak-text-3)', fontSize: 12 }}>
              <Loader size={16} style={{ animation: 'spin 1s linear infinite', marginBottom: 8, display: 'block', margin: '0 auto 8px' }} />
              Loading jobs...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--ak-text-3)', fontSize: 12 }}>No jobs found</div>
          ) : (
            filtered.slice(0, 50).map((job: any) => (
              <JobRow key={job._id} job={job} expanded={expandedJob === job._id}
                onToggle={() => setExpandedJob(expandedJob === job._id ? null : job._id)} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function JobRow({ job, expanded, onToggle }: { job: any; expanded: boolean; onToggle: () => void }) {
  const { data: outputs = [] } = useQuery({
    queryKey: ['job-outputs', job.project_id],
    queryFn: () => projectsApi.getOutputs(job.project_id),
    enabled: expanded && !!job.project_id,
  });

  const jobOutputs = outputs.filter((o: any) => o.job_id === job._id || o.job_id?.toString() === job._id);

  return (
    <div style={{ borderBottom: '1px solid var(--ak-border)' }}>
      <div
        onClick={onToggle}
        style={{
          display: 'grid', gridTemplateColumns: '1fr 120px 140px 100px 40px',
          padding: '14px 18px', fontSize: 12, color: 'var(--ak-text-2)',
          cursor: 'pointer', transition: 'background 100ms var(--ak-ease)',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        <span style={{ color: 'var(--ak-text)', fontWeight: 500, fontFamily: 'var(--ak-font-mono)', fontSize: 11 }}>
          JOB-{job._id.slice(-6).toUpperCase()}
        </span>
        <span><StatusBadge status={job.status} /></span>
        <span style={{ fontSize: 11, fontWeight: 500 }}>
          {new Date(job.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          {' '}
          {new Date(job.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
        </span>
        <span style={{ fontSize: 11, fontWeight: 500 }}>{job.image_count ?? '--'}</span>
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {expanded ? <ChevronDown size={14} color="var(--ak-text-3)" /> : <ChevronRight size={14} color="var(--ak-text-3)" />}
        </span>
      </div>

      {expanded && (
        <div className="ak-animate-in" style={{ padding: '0 18px 18px', display: 'flex', gap: 20 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--ak-text-3)', letterSpacing: '0.06em', marginBottom: 10 }}>
              JOB DETAILS
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
              <DetailRow label="Status" value={job.status} />
              <DetailRow label="Stage" value={job.stage || '--'} />
              <DetailRow label="Progress" value={`${job.progress || 0}%`} />
              <DetailRow label="Quality" value={job.quality || 'medium'} />
              <DetailRow label="Images" value={String(job.image_count || 0)} />
              {job.flight_ids?.length > 0 && (
                <DetailRow label="Flight" value={job.flight_ids[0]?.slice(0, 12) + '...'} />
              )}
              {job.completed_at && (
                <DetailRow label="Completed" value={new Date(job.completed_at).toLocaleString()} />
              )}
              {job.error && (
                <div style={{ marginTop: 6, padding: '8px 10px', background: 'rgba(248,113,113,0.08)', borderRadius: 'var(--ak-radius-sm)', fontSize: 11, color: 'var(--ak-danger)', lineHeight: 1.4 }}>
                  {job.error.slice(0, 200)}
                </div>
              )}

              {['queued', 'downloading', 'processing'].includes(job.status) && (
                <div style={{ marginTop: 6 }}>
                  <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: 'linear-gradient(90deg, var(--ak-primary), #60A5FA)', width: `${job.progress || 0}%`, transition: 'width 400ms' }} />
                  </div>
                  {job.estimated_seconds_remaining != null && (
                    <div style={{ fontSize: 10, color: 'var(--ak-text-3)', marginTop: 4, fontWeight: 500 }}>
                      ~{Math.ceil(job.estimated_seconds_remaining / 60)} min remaining
                    </div>
                  )}
                </div>
              )}

              {job.project_id && <ProjectLink projectId={typeof job.project_id === 'object' ? job.project_id.toString() : job.project_id} />}
            </div>
          </div>

          {job.status === 'completed' && (
            <div style={{ width: 300 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--ak-text-3)', letterSpacing: '0.06em', marginBottom: 10 }}>
                OUTPUTS
              </div>
              {jobOutputs.length === 0 && outputs.length > 0 ? (
                <OutputList outputs={outputs} />
              ) : jobOutputs.length > 0 ? (
                <OutputList outputs={jobOutputs} />
              ) : (
                <div style={{ fontSize: 12, color: 'var(--ak-text-3)' }}>Loading outputs...</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function OutputList({ outputs }: { outputs: any[] }) {
  const icons: Record<string, React.ReactNode> = {
    orthomosaic: <Image size={13} />,
    mesh: <Box size={13} />,
    dsm: <Mountain size={13} />,
    dtm: <Mountain size={13} />,
    pointcloud: <Activity size={13} />,
    thumbnail: <Image size={13} />,
  };

  const labels: Record<string, string> = {
    orthomosaic: 'Orthomosaic',
    mesh: '3D Mesh',
    dsm: 'Surface Model',
    dtm: 'Terrain Model',
    pointcloud: 'Point Cloud',
    thumbnail: 'Thumbnail',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {outputs.filter((o: any) => o.type !== 'thumbnail').map((o: any) => (
        <div key={o._id} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 12px', background: 'rgba(255,255,255,0.02)',
          borderRadius: 'var(--ak-radius-sm)', border: '1px solid var(--ak-border)',
          transition: 'border-color 150ms',
        }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--ak-border-hover)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--ak-border)'}
        >
          <span style={{ color: 'var(--ak-primary)', display: 'flex' }}>{icons[o.type] || <Activity size={13} />}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, color: 'var(--ak-text)', fontWeight: 500 }}>
              {labels[o.type] || o.type}
            </div>
            <div style={{ fontSize: 10, color: 'var(--ak-text-3)', fontWeight: 500, marginTop: 1 }}>
              {o.format?.toUpperCase()} {o.size_bytes ? `· ${(o.size_bytes / 1e6).toFixed(1)} MB` : ''}
            </div>
          </div>
          {o.download_url && (
            <a href={o.download_url} download style={{
              display: 'flex', alignItems: 'center', gap: 3,
              padding: '4px 10px', background: 'var(--ak-primary-subtle)',
              borderRadius: 'var(--ak-radius-sm)', color: 'var(--ak-primary)', fontSize: 10,
              fontWeight: 600, textDecoration: 'none',
              transition: 'background 150ms',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(44,123,242,0.18)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--ak-primary-subtle)'}
            >
              <Download size={10} /> DL
            </a>
          )}
        </div>
      ))}
    </div>
  );
}

function ProjectLink({ projectId }: { projectId: string }) {
  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsApi.get(projectId),
    enabled: !!projectId,
    staleTime: 60_000,
  });

  if (!project) return null;
  return (
    <Link to={`/sites/${project.site_id}/projects/${projectId}`}
      style={{ fontSize: 11, color: 'var(--ak-primary)', textDecoration: 'none', marginTop: 6, display: 'inline-block', fontWeight: 500 }}>
      View Project →
    </Link>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
      <span style={{ color: 'var(--ak-text-3)', fontSize: 11, fontWeight: 500 }}>{label}</span>
      <span style={{ color: 'var(--ak-text-2)', fontSize: 11, fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function StatCard({ label, value, sub, color, icon }: { label: string; value: number | string; sub: string; color: string; icon: React.ReactNode }) {
  return (
    <div
      className="ak-animate-in"
      style={{
        background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--ak-border)',
        borderRadius: 'var(--ak-radius-lg)', padding: '20px 22px',
        transition: 'border-color 200ms var(--ak-ease)',
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--ak-border-hover)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--ak-border)'}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--ak-text-3)', letterSpacing: '0.08em' }}>{label}</div>
        <div style={{
          width: 28, height: 28, borderRadius: 7,
          background: `color-mix(in srgb, ${color} 12%, transparent)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color,
        }}>{icon}</div>
      </div>
      <div style={{ fontSize: 36, fontWeight: 700, color: 'var(--ak-text)', lineHeight: 1, letterSpacing: '-0.02em' }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--ak-text-3)', marginTop: 8, fontWeight: 500 }}>{sub}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
    queued: { icon: Clock, color: 'var(--ak-warning)', bg: 'rgba(251,191,36,0.10)', label: 'Queued' },
    downloading: { icon: Loader, color: 'var(--ak-primary)', bg: 'var(--ak-primary-subtle)', label: 'Downloading' },
    processing: { icon: Loader, color: 'var(--ak-primary)', bg: 'var(--ak-primary-subtle)', label: 'Processing' },
    completed: { icon: CheckCircle, color: 'var(--ak-success)', bg: 'rgba(52,211,153,0.10)', label: 'Done' },
    failed: { icon: XCircle, color: 'var(--ak-danger)', bg: 'rgba(248,113,113,0.10)', label: 'Failed' },
  };
  const cfg = configs[status] ?? configs.queued;
  const Icon = cfg.icon;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 8px', borderRadius: 'var(--ak-radius-sm)', background: cfg.bg, color: cfg.color,
      fontSize: 10, fontWeight: 600,
    }}>
      <Icon size={10} /> {cfg.label}
    </span>
  );
}
