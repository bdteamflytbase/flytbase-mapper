import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, FolderOpen, Trash2, ChevronLeft, Loader, CheckCircle, Clock } from 'lucide-react';
import { sitesApi, projectsApi, jobsApi } from '../lib/api';
import MissionSelector from '../components/missions/MissionSelector';

export default function SitePage() {
  const { siteId } = useParams<{ siteId: string }>();
  const [showCreate, setShowCreate] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customDesc, setCustomDesc] = useState('');
  const qc = useQueryClient();
  const nav = useNavigate();

  const { data: site } = useQuery({ queryKey: ['site', siteId], queryFn: () => sitesApi.get(siteId!) });
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects', siteId],
    queryFn: () => projectsApi.list(siteId),
  });
  const { data: siteJobs = [] } = useQuery({
    queryKey: ['jobs-site', siteId],
    queryFn: () => jobsApi.list(undefined, 'processing,downloading,queued'),
    refetchInterval: 10_000,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => projectsApi.create(data),
    onSuccess: (newProject) => {
      qc.invalidateQueries({ queryKey: ['projects', siteId] });
      qc.invalidateQueries({ queryKey: ['projects-all'] });
      setShowCreate(false);
      nav(`/sites/${siteId}/projects/${newProject._id}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => projectsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects', siteId] });
      qc.invalidateQueries({ queryKey: ['projects-all'] });
    },
  });

  const projectIds = new Set(projects.map((p: any) => p._id));
  const runningJobs = siteJobs.filter((j: any) => projectIds.has(j.project_id));
  const currentJob = runningJobs[0];
  const queuedCount = runningJobs.filter((j: any) => j.status === 'queued').length;

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <div style={{ padding: '32px 36px', maxWidth: 1100, margin: '0 auto' }}>
        {/* Header */}
        <div className="ak-animate-in" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Link to="/dashboard" style={{
                color: 'var(--ak-text-3)', display: 'flex',
                width: 28, height: 28, alignItems: 'center', justifyContent: 'center',
                borderRadius: 'var(--ak-radius-sm)', transition: 'all 150ms',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'var(--ak-text)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--ak-text-3)'; }}
              >
                <ChevronLeft size={18} />
              </Link>
              <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--ak-text)', letterSpacing: '-0.02em' }}>
                {site?.name ?? 'Site'}
              </h1>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button
              onClick={() => setShowCustom(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'rgba(255,255,255,0.04)', color: 'var(--ak-text-2)',
                border: '1px solid var(--ak-border)', borderRadius: 'var(--ak-radius-sm)',
                padding: '9px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer',
                transition: 'all 150ms var(--ak-ease)',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--ak-border-hover)'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--ak-border)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
            >
              <Plus size={15} /> Custom Project
            </button>
            <button
              onClick={() => setShowCreate(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'var(--ak-primary)', color: '#fff',
                border: 'none', borderRadius: 'var(--ak-radius-sm)',
                padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                transition: 'all 150ms var(--ak-ease)',
                boxShadow: '0 2px 8px rgba(44, 123, 242, 0.25)',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--ak-primary-hover)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--ak-primary)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <Plus size={15} /> New Project
            </button>
          </div>
        </div>

        {/* Processing Analytics cards */}
        <div className="ak-stagger" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 28 }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--ak-border)',
            borderRadius: 'var(--ak-radius-lg)', padding: '18px 22px',
          }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--ak-text-3)', letterSpacing: '0.08em', marginBottom: 10 }}>
              PROCESSING
            </div>
            {currentJob ? (
              <>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ak-text)', marginBottom: 10, fontFamily: 'var(--ak-font-mono)', letterSpacing: '-0.01em' }}>
                  Job {currentJob._id.slice(-6)}
                </div>
                <div style={{
                  height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)',
                  marginBottom: 8, overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%', borderRadius: 2,
                    background: 'linear-gradient(90deg, var(--ak-primary), #60A5FA)',
                    width: `${currentJob.progress || 0}%`,
                    transition: 'width 400ms cubic-bezier(0.4, 0, 0.2, 1)',
                  }} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--ak-text-3)', fontWeight: 500 }}>
                  {currentJob.progress || 0}% — {currentJob.stage || 'Queued'}
                </div>
              </>
            ) : (
              <div style={{ fontSize: 13, color: 'var(--ak-text-3)' }}>No active processing</div>
            )}
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--ak-border)',
            borderRadius: 'var(--ak-radius-lg)', padding: '18px 22px',
          }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--ak-text-3)', letterSpacing: '0.08em', marginBottom: 10 }}>
              QUEUE STATUS
            </div>
            <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--ak-text)', lineHeight: 1, letterSpacing: '-0.02em' }}>
              {queuedCount}
            </div>
            <div style={{ fontSize: 11, color: 'var(--ak-text-3)', marginTop: 8, fontWeight: 500 }}>
              Jobs in queue
            </div>
            {queuedCount > 0 && (
              <Link to="/analytics" style={{
                fontSize: 11, color: 'var(--ak-primary)', textDecoration: 'none', marginTop: 6,
                display: 'inline-block', fontWeight: 500,
              }}>
                View queue →
              </Link>
            )}
          </div>
        </div>

        {/* Project Inventory */}
        <div style={{
          fontSize: 10, fontWeight: 600, color: 'var(--ak-text-3)',
          letterSpacing: '0.1em', marginBottom: 14,
        }}>
          PROJECT INVENTORY
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[...Array(3)].map((_, i) => (
              <div key={i} className="ak-skeleton" style={{ height: 72, borderRadius: 12 }} />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="ak-animate-in" style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', height: 240, color: 'var(--ak-text-3)',
            background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--ak-radius-lg)',
            border: '1px solid var(--ak-border)',
          }}>
            <FolderOpen size={28} color="var(--ak-text-3)" style={{ marginBottom: 12 }} />
            <p style={{ fontSize: 14, color: 'var(--ak-text-2)', marginBottom: 4, fontWeight: 500 }}>No projects yet</p>
            <p style={{ fontSize: 12, marginBottom: 16 }}>Create a project to start processing drone imagery</p>
            <button
              onClick={() => setShowCreate(true)}
              style={{
                background: 'var(--ak-primary-subtle)', color: 'var(--ak-primary)',
                border: '1px solid var(--ak-border-active)',
                borderRadius: 'var(--ak-radius-sm)', padding: '8px 16px',
                fontSize: 13, fontWeight: 500, cursor: 'pointer',
              }}
            >
              Create Project
            </button>
          </div>
        ) : (
          <div className="ak-stagger" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {projects.map((p: any) => (
              <ProjectRow
                key={p._id}
                project={p}
                siteId={siteId!}
                runningJobs={runningJobs}
                onDelete={() => {
                  if (confirm(`Delete project "${p.name}"?`)) {
                    deleteMutation.mutate(p._id);
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>

      {showCreate && site && (
        <MissionSelector
          site={site}
          onClose={() => setShowCreate(false)}
          onSave={(data) => createMutation.mutate({ ...data, site_id: siteId })}
          isSaving={createMutation.isPending}
        />
      )}

      {/* Custom Project Modal */}
      {showCustom && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(4px)',
        }}>
          <div className="ak-animate-scale ak-glass-raised" style={{
            width: '100%', maxWidth: 420,
            padding: '28px', borderRadius: 'var(--ak-radius-lg)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--ak-text)', letterSpacing: '-0.01em' }}>Custom Project</h2>
              <button onClick={() => setShowCustom(false)} style={{
                background: 'rgba(255,255,255,0.04)', border: 'none', cursor: 'pointer',
                color: 'var(--ak-text-3)', width: 28, height: 28, borderRadius: 'var(--ak-radius-sm)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 150ms',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'var(--ak-text)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'var(--ak-text-3)'; }}
              >
                <Plus size={16} style={{ transform: 'rotate(45deg)' }} />
              </button>
            </div>
            <p style={{ fontSize: 12, color: 'var(--ak-text-3)', marginBottom: 20, lineHeight: 1.5 }}>
              Create a project without linking to a specific mission. You can add media from any flight.
            </p>
            <label style={{ fontSize: 11, color: 'var(--ak-text-2)', fontWeight: 500, marginBottom: 6, display: 'block' }}>
              Project Name
            </label>
            <input value={customName} onChange={e => setCustomName(e.target.value)}
              placeholder="e.g. Custom Survey March 2026"
              style={{
                width: '100%', padding: '10px 12px', fontSize: 13, marginBottom: 14,
                background: 'rgba(255,255,255,0.04)', border: '1px solid var(--ak-border)',
                borderRadius: 'var(--ak-radius-sm)', color: 'var(--ak-text)', outline: 'none',
                transition: 'border-color 150ms',
              }}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--ak-primary)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--ak-border)'}
            />
            <label style={{ fontSize: 11, color: 'var(--ak-text-2)', fontWeight: 500, marginBottom: 6, display: 'block' }}>
              Description
            </label>
            <textarea value={customDesc} onChange={e => setCustomDesc(e.target.value)}
              placeholder="Optional description..."
              rows={2}
              style={{
                width: '100%', padding: '10px 12px', fontSize: 13, marginBottom: 20,
                background: 'rgba(255,255,255,0.04)', border: '1px solid var(--ak-border)',
                borderRadius: 'var(--ak-radius-sm)', color: 'var(--ak-text)', outline: 'none',
                resize: 'vertical', fontFamily: 'inherit',
                transition: 'border-color 150ms',
              }}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--ak-primary)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--ak-border)'}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowCustom(false)} style={{
                padding: '9px 16px', fontSize: 13, background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--ak-border)', borderRadius: 'var(--ak-radius-sm)',
                color: 'var(--ak-text-2)', cursor: 'pointer', fontWeight: 500,
                transition: 'all 150ms',
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--ak-border-hover)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--ak-border)'}
              >Cancel</button>
              <button
                disabled={!customName.trim() || createMutation.isPending}
                onClick={() => createMutation.mutate({
                  name: customName.trim(),
                  description: customDesc.trim() || undefined,
                  site_id: siteId,
                  mission_id: '',
                  mission_name: 'Custom',
                })}
                style={{
                  padding: '9px 18px', fontSize: 13, fontWeight: 600,
                  background: customName.trim() ? 'var(--ak-primary)' : 'rgba(255,255,255,0.04)',
                  border: 'none', borderRadius: 'var(--ak-radius-sm)',
                  color: customName.trim() ? '#fff' : 'var(--ak-text-3)',
                  cursor: customName.trim() ? 'pointer' : 'not-allowed',
                  transition: 'all 150ms',
                  boxShadow: customName.trim() ? '0 2px 8px rgba(44, 123, 242, 0.25)' : 'none',
                }}
              >
                {createMutation.isPending ? 'Creating...' : 'Create Project'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProjectRow({ project: p, siteId, runningJobs, onDelete }: {
  project: any; siteId: string; runningJobs: any[]; onDelete: () => void;
}) {
  const isProcessing = runningJobs.some((j: any) => j.project_id === p._id);
  const hasOutputs = !!p.thumbnail_url;

  return (
    <div
      className="ak-animate-in"
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '14px 16px',
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid var(--ak-border)',
        borderRadius: 'var(--ak-radius)',
        transition: 'all 150ms var(--ak-ease)',
        cursor: 'pointer',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'var(--ak-border-active)';
        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--ak-border)';
        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
      }}
    >
      <Link to={`/sites/${siteId}/projects/${p._id}`} style={{ flexShrink: 0 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 10, overflow: 'hidden',
          background: p.thumbnail_url
            ? `url(${p.thumbnail_url}) center/cover no-repeat`
            : 'linear-gradient(135deg, #1a2332, #0f1923)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {!p.thumbnail_url && <FolderOpen size={18} color="rgba(255,255,255,0.15)" />}
        </div>
      </Link>

      <Link to={`/sites/${siteId}/projects/${p._id}`}
        style={{ flex: 1, minWidth: 0, textDecoration: 'none' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ak-text)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.01em' }}>
            {p.name}
          </span>
          {isProcessing && (
            <span style={{
              fontSize: 9, fontWeight: 600, padding: '2px 7px',
              background: 'var(--ak-primary-subtle)', color: 'var(--ak-primary)',
              borderRadius: 'var(--ak-radius-sm)', flexShrink: 0,
              display: 'inline-flex', alignItems: 'center', gap: 3,
            }}>
              <Loader size={9} /> PROCESSING
            </span>
          )}
          {!isProcessing && hasOutputs && (
            <span style={{
              fontSize: 9, fontWeight: 600, padding: '2px 7px',
              background: 'rgba(52,211,153,0.12)', color: 'var(--ak-success)',
              borderRadius: 'var(--ak-radius-sm)', flexShrink: 0,
            }}>
              MAPPED
            </span>
          )}
          {!isProcessing && !hasOutputs && (
            <span style={{
              fontSize: 9, fontWeight: 600, padding: '2px 7px',
              background: 'rgba(255,255,255,0.04)', color: 'var(--ak-text-3)',
              borderRadius: 'var(--ak-radius-sm)', flexShrink: 0,
            }}>
              NEW
            </span>
          )}
        </div>
        <div style={{ fontSize: 11, color: 'var(--ak-text-3)', marginTop: 4, display: 'flex', gap: 12, fontWeight: 500 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Clock size={10} />
            {new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
          {p.mission_name && (
            <span>Mission: {p.mission_name}</span>
          )}
        </div>
      </Link>

      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(); }}
        style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: 'var(--ak-text-3)', padding: 6, borderRadius: 'var(--ak-radius-sm)',
          transition: 'all 150ms var(--ak-ease)',
          flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 32, height: 32,
        }}
        onMouseEnter={e => { e.currentTarget.style.color = 'var(--ak-danger)'; e.currentTarget.style.background = 'rgba(248,113,113,0.08)'; }}
        onMouseLeave={e => { e.currentTarget.style.color = 'var(--ak-text-3)'; e.currentTarget.style.background = 'transparent'; }}
        title="Delete project"
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}
