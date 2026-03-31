import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { MapPin, FolderOpen, Layers, ArrowUpRight, Cpu } from 'lucide-react';
import { sitesApi, projectsApi, jobsApi } from '../lib/api';

export default function DashboardPage() {
  const { data: sites = [], isLoading, error } = useQuery({
    queryKey: ['sites'],
    queryFn: sitesApi.list,
  });

  const { data: allProjects = [] } = useQuery({
    queryKey: ['projects-all'],
    queryFn: () => projectsApi.list(),
  });

  const { data: runningJobs = [] } = useQuery({
    queryKey: ['jobs-processing'],
    queryFn: () => jobsApi.list(undefined, 'processing,downloading,queued'),
  });

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState />;

  const totalProjects = allProjects.length;
  const processingCount = runningJobs.length;

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <div style={{ padding: '36px 40px' }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{
            fontSize: 26, fontWeight: 700, color: 'var(--ak-text)',
            letterSpacing: '-0.03em', marginBottom: 4,
          }}>
            Sites
          </h1>
          <p style={{ fontSize: 14, color: 'var(--ak-text-3)', fontWeight: 400 }}>
            Manage your mapping projects across all deployments.
          </p>
        </div>

        {/* Stats — clean, minimal */}
        <div className="ak-stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 40 }}>
          <StatCard label="Total sites" value={sites.length} />
          <StatCard label="Active projects" value={totalProjects} />
          <StatCard label="Processing" value={processingCount} accent />
        </div>

        {/* Site cards */}
        {sites.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="ak-stagger" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 16,
          }}>
            {sites.map((site: any) => {
              const projectCount = allProjects.filter((p: any) => p.site_id === site._id).length;
              const hasActiveJob = runningJobs.some((j: any) =>
                allProjects.some((p: any) => p.site_id === site._id && p._id === j.project_id)
              );
              return (
                <SiteCard
                  key={site._id}
                  site={site}
                  projectCount={projectCount}
                  isActive={hasActiveJob}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: {
  label: string; value: number | string; accent?: boolean;
}) {
  return (
    <div className="ak-animate-in" style={{
      background: 'rgba(253, 252, 248, 0.85)',
      borderRadius: 12,
      padding: '20px 24px',
      boxShadow: 'var(--ak-shadow-xs)',
      border: '1px solid var(--ak-border)',
    }}>
      <div style={{
        fontSize: 12, color: 'var(--ak-text-3)', fontWeight: 500,
        marginBottom: 8,
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 34, fontWeight: 700,
        color: accent ? 'var(--ak-primary)' : 'var(--ak-text)',
        lineHeight: 1, letterSpacing: '-0.03em',
      }}>
        {value}
      </div>
    </div>
  );
}

function SiteCard({ site, projectCount, isActive }: { site: any; projectCount: number; isActive: boolean }) {
  const thumbnail = site.thumbnail_url || null;

  return (
    <Link to={`/sites/${site._id}`} style={{ textDecoration: 'none' }}>
      <div
        className="ak-animate-in"
        style={{
          background: 'rgba(253, 252, 248, 0.85)',
          borderRadius: 14,
          overflow: 'hidden',
          cursor: 'pointer',
          transition: 'box-shadow 200ms, transform 200ms',
          boxShadow: 'var(--ak-shadow-xs)',
          border: '1px solid var(--ak-border)',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.boxShadow = 'var(--ak-shadow-lg)';
          e.currentTarget.style.transform = 'translateY(-2px)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.boxShadow = 'var(--ak-shadow-xs)';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        {/* Thumbnail */}
        <div style={{
          height: 180,
          background: thumbnail
            ? `url(${thumbnail}) center/cover no-repeat`
            : 'linear-gradient(145deg, #E8E6DA 0%, #DDD9C8 100%)',
          position: 'relative',
        }}>
          {isActive && (
            <div style={{
              position: 'absolute', top: 12, left: 12,
              background: 'var(--ak-primary)',
              color: '#fff', fontSize: 10, fontWeight: 600,
              padding: '3px 10px', borderRadius: 6,
              letterSpacing: '0.03em',
            }}>
              Active
            </div>
          )}

          {!thumbnail && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <MapPin size={32} color="#C4CDD5" />
            </div>
          )}

          {/* Arrow */}
          <div style={{
            position: 'absolute', bottom: 12, right: 12,
            width: 30, height: 30, borderRadius: 8,
            background: 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <ArrowUpRight size={14} color="#1A1D23" />
          </div>
        </div>

        {/* Info */}
        <div style={{ padding: '16px 20px 20px' }}>
          <div style={{
            fontSize: 16, fontWeight: 600, color: 'var(--ak-text)',
            marginBottom: 6,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {site.name}
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            fontSize: 13, color: 'var(--ak-text-3)', fontWeight: 400,
          }}>
            <FolderOpen size={13} />
            {projectCount} project{projectCount !== 1 ? 's' : ''}
          </div>
        </div>
      </div>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="ak-animate-in" style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: 320,
      background: 'rgba(253, 252, 248, 0.85)', borderRadius: 14,
      border: '1px solid var(--ak-border)',
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 14,
        background: 'var(--ak-bg-page)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 16,
      }}>
        <Layers size={24} color="var(--ak-text-3)" />
      </div>
      <p style={{ fontSize: 15, color: 'var(--ak-text)', marginBottom: 4, fontWeight: 500 }}>No sites yet</p>
      <p style={{ fontSize: 13, color: 'var(--ak-text-3)', maxWidth: 260, textAlign: 'center', lineHeight: 1.5 }}>
        Configure your FlytBase organization to start mapping.
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div style={{ padding: '36px 40px' }}>
      <div className="ak-skeleton" style={{ height: 30, width: 120, marginBottom: 8 }} />
      <div className="ak-skeleton" style={{ height: 16, width: 280, marginBottom: 32 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 40 }}>
        {[1, 2, 3].map(i => (
          <div key={i} className="ak-skeleton" style={{ height: 90, borderRadius: 12 }} />
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {[1, 2].map(i => (
          <div key={i} className="ak-skeleton" style={{ height: 260, borderRadius: 14 }} />
        ))}
      </div>
    </div>
  );
}

function ErrorState() {
  return (
    <div className="ak-animate-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: 'var(--ak-danger)', marginBottom: 6, fontSize: 15, fontWeight: 500 }}>Failed to load sites</p>
        <p style={{ color: 'var(--ak-text-3)', fontSize: 13 }}>Check your connection and try again.</p>
      </div>
    </div>
  );
}
