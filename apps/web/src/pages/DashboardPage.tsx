import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { MapPin, FolderOpen, Layers, ArrowUpRight, Activity } from 'lucide-react';
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
      <div style={{ padding: '32px 36px', maxWidth: 1280, margin: '0 auto' }}>
        {/* Header */}
        <div className="ak-animate-in" style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--ak-text)', letterSpacing: '-0.02em' }}>
              Site Overview
            </h1>
          </div>
          <p style={{ fontSize: 13, color: 'var(--ak-text-2)', fontWeight: 400 }}>
            Managing geospatial data across all deployments
          </p>
        </div>

        {/* Stats row */}
        <div className="ak-stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 36 }}>
          <StatCard
            label="TOTAL SITES"
            value={sites.length}
            sub={`${sites.length} active deployment${sites.length !== 1 ? 's' : ''}`}
            color="var(--ak-primary)"
            icon={<MapPin size={14} />}
          />
          <StatCard
            label="ACTIVE PROJECTS"
            value={totalProjects}
            sub="Across all sites"
            color="var(--ak-success)"
            icon={<FolderOpen size={14} />}
          />
          <StatCard
            label="PROCESSING"
            value={processingCount}
            sub={processingCount > 0 ? 'Jobs running now' : 'All clear'}
            color="var(--ak-accent)"
            icon={<Activity size={14} />}
          />
        </div>

        {/* Site cards grid */}
        {sites.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div style={{
              fontSize: 10, fontWeight: 600, color: 'var(--ak-text-3)',
              letterSpacing: '0.1em', marginBottom: 14,
            }}>
              REGIONAL DEPLOYMENTS
            </div>
            <div className="ak-stagger" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
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
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color, icon }: {
  label: string; value: number | string; sub: string; color: string; icon: React.ReactNode;
}) {
  return (
    <div
      className="ak-animate-in"
      style={{
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid var(--ak-border)',
        borderRadius: 'var(--ak-radius-lg)',
        padding: '20px 22px',
        transition: 'border-color 200ms var(--ak-ease), box-shadow 200ms var(--ak-ease)',
        cursor: 'default',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'var(--ak-border-hover)';
        e.currentTarget.style.boxShadow = 'var(--ak-shadow-sm)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--ak-border)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--ak-text-3)', letterSpacing: '0.08em' }}>
          {label}
        </div>
        <div style={{
          width: 28, height: 28, borderRadius: 7,
          background: `color-mix(in srgb, ${color} 12%, transparent)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: color,
        }}>
          {icon}
        </div>
      </div>
      <div style={{ fontSize: 36, fontWeight: 700, color: 'var(--ak-text)', lineHeight: 1, letterSpacing: '-0.02em' }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: 'var(--ak-text-3)', marginTop: 8, fontWeight: 500 }}>
        {sub}
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
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--ak-border)',
          borderRadius: 'var(--ak-radius-lg)',
          overflow: 'hidden',
          cursor: 'pointer',
          transition: 'border-color 200ms var(--ak-ease), transform 200ms var(--ak-ease), box-shadow 200ms var(--ak-ease)',
          position: 'relative',
        }}
        onMouseEnter={e => {
          const el = e.currentTarget;
          el.style.borderColor = 'var(--ak-border-active)';
          el.style.transform = 'translateY(-3px)';
          el.style.boxShadow = 'var(--ak-shadow-lg)';
        }}
        onMouseLeave={e => {
          const el = e.currentTarget;
          el.style.borderColor = 'var(--ak-border)';
          el.style.transform = 'translateY(0)';
          el.style.boxShadow = 'none';
        }}
      >
        {/* Thumbnail area */}
        <div style={{
          height: 160,
          background: thumbnail
            ? `url(${thumbnail}) center/cover no-repeat`
            : 'linear-gradient(135deg, #0f1923 0%, #1a2332 50%, #0f1923 100%)',
          position: 'relative',
        }}>
          {/* Gradient overlay */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to top, rgba(7,12,20,0.8) 0%, transparent 50%)',
          }} />

          {isActive && (
            <div style={{
              position: 'absolute', top: 12, left: 12,
              background: 'var(--ak-success)',
              color: '#070c14', fontSize: 9, fontWeight: 700,
              padding: '3px 8px', borderRadius: 'var(--ak-radius-sm)',
              letterSpacing: '0.05em',
              boxShadow: '0 2px 8px rgba(52, 211, 153, 0.3)',
            }}>
              ACTIVE
            </div>
          )}

          {!thumbnail && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <MapPin size={36} color="var(--ak-text-3)" style={{ opacity: 0.2 }} />
            </div>
          )}

          {/* Arrow indicator */}
          <div style={{
            position: 'absolute', bottom: 12, right: 12,
            width: 28, height: 28, borderRadius: '50%',
            background: 'rgba(255,255,255,0.08)',
            backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 200ms',
          }}>
            <ArrowUpRight size={14} color="var(--ak-text)" />
          </div>
        </div>

        {/* Info */}
        <div style={{ padding: '16px 18px 18px' }}>
          <div style={{
            fontSize: 15, fontWeight: 600, color: 'var(--ak-text)',
            marginBottom: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            letterSpacing: '-0.01em',
          }}>
            {site.name}
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            fontSize: 11, color: 'var(--ak-text-3)', fontWeight: 500,
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <FolderOpen size={11} />
              {projectCount} project{projectCount !== 1 ? 's' : ''}
            </span>
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
      justifyContent: 'center', height: 320, color: 'var(--ak-text-3)',
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: 16,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid var(--ak-border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 16,
      }}>
        <Layers size={28} color="var(--ak-text-3)" />
      </div>
      <p style={{ fontSize: 15, color: 'var(--ak-text-2)', marginBottom: 6, fontWeight: 500 }}>No sites found</p>
      <p style={{ fontSize: 12, color: 'var(--ak-text-3)', maxWidth: 280, textAlign: 'center', lineHeight: 1.5 }}>
        Configure your FlytBase organization to start mapping.
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div style={{ padding: '32px 36px' }}>
      <div className="ak-skeleton" style={{ height: 28, width: 160, marginBottom: 8 }} />
      <div className="ak-skeleton" style={{ height: 16, width: 300, marginBottom: 28 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 36 }}>
        {[1, 2, 3].map(i => (
          <div key={i} className="ak-skeleton" style={{ height: 120, borderRadius: 12 }} />
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="ak-skeleton" style={{ height: 240, borderRadius: 12 }} />
        ))}
      </div>
    </div>
  );
}

function ErrorState() {
  return (
    <div className="ak-animate-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: 'rgba(248,113,113,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 12px',
        }}>
          <span style={{ fontSize: 20 }}>!</span>
        </div>
        <p style={{ color: 'var(--ak-danger)', marginBottom: 6, fontSize: 14, fontWeight: 500 }}>Failed to load sites</p>
        <p style={{ color: 'var(--ak-text-3)', fontSize: 12 }}>
          Check your FlytBase configuration and try again.
        </p>
      </div>
    </div>
  );
}
