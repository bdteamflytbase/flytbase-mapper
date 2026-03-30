import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, FolderOpen, Trash2, ChevronLeft, Loader, Clock, X } from 'lucide-react';
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
  const { data: projects = [], isLoading } = useQuery({ queryKey: ['projects', siteId], queryFn: () => projectsApi.list(siteId) });
  const { data: siteJobs = [] } = useQuery({ queryKey: ['jobs-site', siteId], queryFn: () => jobsApi.list(undefined, 'processing,downloading,queued'), refetchInterval: 10_000 });

  const createMutation = useMutation({
    mutationFn: (data: any) => projectsApi.create(data),
    onSuccess: (p) => { qc.invalidateQueries({ queryKey: ['projects', siteId] }); qc.invalidateQueries({ queryKey: ['projects-all'] }); setShowCreate(false); nav(`/sites/${siteId}/projects/${p._id}`); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => projectsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['projects', siteId] }); qc.invalidateQueries({ queryKey: ['projects-all'] }); },
  });

  const projectIds = new Set(projects.map((p: any) => p._id));
  const runningJobs = siteJobs.filter((j: any) => projectIds.has(j.project_id));
  const currentJob = runningJobs[0];

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <div style={{ padding: '36px 40px', maxWidth: 1000, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Link to="/dashboard" style={{
                color: 'var(--ak-text-3)', display: 'flex',
                width: 28, height: 28, alignItems: 'center', justifyContent: 'center',
                borderRadius: 7, transition: 'all 150ms',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; e.currentTarget.style.color = 'var(--ak-text)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--ak-text-3)'; }}
              >
                <ChevronLeft size={18} />
              </Link>
              <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--ak-text)', letterSpacing: '-0.03em' }}>
                {site?.name ?? 'Site'}
              </h1>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowCustom(true)} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: '#fff', color: 'var(--ak-text-2)',
              border: '1px solid var(--ak-border)', borderRadius: 8,
              padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer',
              transition: 'all 150ms',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--ak-border-hover)'; e.currentTarget.style.boxShadow = 'var(--ak-shadow-sm)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--ak-border)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <Plus size={14} /> Custom
            </button>
            <button onClick={() => setShowCreate(true)} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'var(--ak-primary)', color: '#fff',
              border: 'none', borderRadius: 8,
              padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              transition: 'all 150ms', boxShadow: '0 1px 3px rgba(44,123,242,0.2)',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--ak-primary-hover)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--ak-primary)'; }}
            >
              <Plus size={14} /> New Project
            </button>
          </div>
        </div>

        {/* Processing card */}
        {currentJob && (
          <div style={{
            background: 'var(--ak-primary-subtle)', borderRadius: 12,
            padding: '16px 20px', marginBottom: 24,
            border: '1px solid var(--ak-border-active)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ak-primary)' }}>Processing</span>
              <span style={{ fontSize: 12, color: 'var(--ak-text-3)', fontFamily: 'var(--ak-font-mono)' }}>{currentJob.progress || 0}%</span>
            </div>
            <div style={{ height: 4, borderRadius: 2, background: 'rgba(44,123,242,0.12)', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 2, background: 'var(--ak-primary)', width: `${currentJob.progress || 0}%`, transition: 'width 400ms' }} />
            </div>
          </div>
        )}

        {/* Project list */}
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1, 2, 3].map(i => <div key={i} className="ak-skeleton" style={{ height: 72, borderRadius: 12 }} />)}
          </div>
        ) : projects.length === 0 ? (
          <div className="ak-animate-in" style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', height: 240,
            background: '#fff', borderRadius: 14, border: '1px solid var(--ak-border)',
          }}>
            <FolderOpen size={24} color="var(--ak-text-3)" style={{ marginBottom: 12 }} />
            <p style={{ fontSize: 14, color: 'var(--ak-text)', marginBottom: 4, fontWeight: 500 }}>No projects yet</p>
            <p style={{ fontSize: 13, color: 'var(--ak-text-3)', marginBottom: 16 }}>Create your first mapping project</p>
            <button onClick={() => setShowCreate(true)} style={{
              background: 'var(--ak-primary-subtle)', color: 'var(--ak-primary)',
              border: '1px solid var(--ak-border-active)', borderRadius: 8,
              padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer',
            }}>Create Project</button>
          </div>
        ) : (
          <div className="ak-stagger" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {projects.map((p: any) => (
              <ProjectRow key={p._id} project={p} siteId={siteId!} runningJobs={runningJobs}
                onDelete={() => { if (confirm(`Delete "${p.name}"?`)) deleteMutation.mutate(p._id); }} />
            ))}
          </div>
        )}
      </div>

      {showCreate && site && (
        <MissionSelector site={site} onClose={() => setShowCreate(false)}
          onSave={(data) => createMutation.mutate({ ...data, site_id: siteId })} isSaving={createMutation.isPending} />
      )}

      {/* Custom Project Modal */}
      {showCustom && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div className="ak-animate-scale" style={{
            background: '#fff', borderRadius: 16, width: '100%', maxWidth: 420,
            padding: '28px', boxShadow: 'var(--ak-shadow-xl)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--ak-text)' }}>Custom Project</h2>
              <button onClick={() => setShowCustom(false)} style={{
                background: 'var(--ak-bg-page)', border: 'none', cursor: 'pointer',
                color: 'var(--ak-text-3)', width: 28, height: 28, borderRadius: 7,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <X size={15} />
              </button>
            </div>
            <p style={{ fontSize: 13, color: 'var(--ak-text-3)', marginBottom: 20, lineHeight: 1.5 }}>
              Create a project without linking to a specific mission.
            </p>
            <label style={{ fontSize: 12, color: 'var(--ak-text-2)', fontWeight: 500, marginBottom: 6, display: 'block' }}>Name</label>
            <input value={customName} onChange={e => setCustomName(e.target.value)} placeholder="e.g. Field Survey Q1"
              style={{
                width: '100%', padding: '10px 12px', fontSize: 14, marginBottom: 14,
                background: 'var(--ak-bg-page)', border: '1px solid var(--ak-border)',
                borderRadius: 8, color: 'var(--ak-text)', outline: 'none', transition: 'border-color 150ms',
              }}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--ak-primary)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--ak-border)'}
            />
            <label style={{ fontSize: 12, color: 'var(--ak-text-2)', fontWeight: 500, marginBottom: 6, display: 'block' }}>Description</label>
            <textarea value={customDesc} onChange={e => setCustomDesc(e.target.value)} placeholder="Optional" rows={2}
              style={{
                width: '100%', padding: '10px 12px', fontSize: 14, marginBottom: 20,
                background: 'var(--ak-bg-page)', border: '1px solid var(--ak-border)',
                borderRadius: 8, color: 'var(--ak-text)', outline: 'none', resize: 'vertical', fontFamily: 'inherit',
              }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowCustom(false)} style={{
                padding: '9px 16px', fontSize: 13, background: 'var(--ak-bg-page)',
                border: '1px solid var(--ak-border)', borderRadius: 8,
                color: 'var(--ak-text-2)', cursor: 'pointer', fontWeight: 500,
              }}>Cancel</button>
              <button disabled={!customName.trim()} onClick={() => createMutation.mutate({ name: customName.trim(), description: customDesc.trim() || undefined, site_id: siteId, mission_id: '', mission_name: 'Custom' })}
                style={{
                  padding: '9px 18px', fontSize: 13, fontWeight: 600,
                  background: customName.trim() ? 'var(--ak-primary)' : 'var(--ak-bg-page)',
                  border: 'none', borderRadius: 8,
                  color: customName.trim() ? '#fff' : 'var(--ak-text-3)',
                  cursor: customName.trim() ? 'pointer' : 'not-allowed',
                }}>Create</button>
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
    <div className="ak-animate-in" style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '12px 16px', background: '#fff',
      border: '1px solid var(--ak-border)', borderRadius: 10,
      transition: 'all 150ms', cursor: 'pointer',
    }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--ak-shadow-sm)'; e.currentTarget.style.borderColor = 'var(--ak-border-hover)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'var(--ak-border)'; }}
    >
      <Link to={`/sites/${siteId}/projects/${p._id}`} style={{ flexShrink: 0 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 10, overflow: 'hidden',
          background: p.thumbnail_url ? `url(${p.thumbnail_url}) center/cover` : 'linear-gradient(135deg, #EEF2F7, #E2E8F0)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {!p.thumbnail_url && <FolderOpen size={16} color="#C4CDD5" />}
        </div>
      </Link>
      <Link to={`/sites/${siteId}/projects/${p._id}`} style={{ flex: 1, minWidth: 0, textDecoration: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ak-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
          {isProcessing && <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', background: 'var(--ak-primary-subtle)', color: 'var(--ak-primary)', borderRadius: 5, display: 'inline-flex', alignItems: 'center', gap: 3 }}><Loader size={9} /> Processing</span>}
          {!isProcessing && hasOutputs && <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', background: 'var(--ak-success-bg)', color: 'var(--ak-success)', borderRadius: 5 }}>Mapped</span>}
          {!isProcessing && !hasOutputs && <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 7px', background: 'var(--ak-bg-page)', color: 'var(--ak-text-3)', borderRadius: 5 }}>New</span>}
        </div>
        <div style={{ fontSize: 12, color: 'var(--ak-text-3)', marginTop: 3, display: 'flex', gap: 10 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Clock size={10} />{new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
          {p.mission_name && <span>{p.mission_name}</span>}
        </div>
      </Link>
      <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(); }} style={{
        background: 'transparent', border: 'none', cursor: 'pointer',
        color: 'var(--ak-text-3)', padding: 6, borderRadius: 7,
        transition: 'all 150ms', flexShrink: 0, display: 'flex',
      }}
        onMouseEnter={e => { e.currentTarget.style.color = 'var(--ak-danger)'; e.currentTarget.style.background = 'var(--ak-danger-bg)'; }}
        onMouseLeave={e => { e.currentTarget.style.color = 'var(--ak-text-3)'; e.currentTarget.style.background = 'transparent'; }}
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
