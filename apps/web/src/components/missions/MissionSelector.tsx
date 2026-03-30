import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Layers, Search } from 'lucide-react';
import { sitesApi } from '../../lib/api';

interface Mission {
  mission_id: string;
  mission_name: string;
  type?: number;
  site_ids?: string[];
  flight_count?: number;
  last_flight_date?: string;
}

interface Props {
  site: any;
  onClose: () => void;
  onSave: (data: { name: string; description?: string; mission_id: string; mission_name: string }) => void;
  isSaving: boolean;
}

export default function MissionSelector({ site, onClose, onSave, isSaving }: Props) {
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [missionSearch, setMissionSearch] = useState('');

  const { data: missions = [], isLoading } = useQuery<Mission[]>({
    queryKey: ['missions', site?._id],
    queryFn: () => sitesApi.getMissions(site._id),
    enabled: !!site?._id,
  });

  const canCreate = !!selectedMission && projectName.trim().length > 0;

  function handleSave() {
    if (!canCreate || !selectedMission) return;
    onSave({
      name: projectName.trim(),
      description: description.trim() || undefined,
      mission_id: selectedMission.mission_id,
      mission_name: selectedMission.mission_name,
    });
  }

  function formatDate(dateStr: string) {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'var(--fb-bg)',
        border: '1px solid var(--fb-border)',
        borderRadius: 'var(--fb-radius-lg)',
        width: '100%', maxWidth: 440,
        maxHeight: '80vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 20px',
          borderBottom: '1px solid var(--fb-border)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--fb-text)' }}>
              New Project — {site?.name ?? 'Site'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--fb-text-3)', marginTop: 3 }}>
              Select a mission to link to this project
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--fb-text-3)', padding: 4, borderRadius: 6,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'color var(--fb-transition)',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--fb-text)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--fb-text-3)')}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Mission list */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fb-text-2)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Missions ({missions.length})
            </div>

            {/* Search */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'rgba(255,255,255,0.04)', borderRadius: 6, padding: '7px 10px', marginBottom: 8,
            }}>
              <Search size={13} color="var(--fb-text-3)" />
              <input value={missionSearch} onChange={e => setMissionSearch(e.target.value)}
                placeholder="Search missions..."
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--fb-text)', fontSize: 12 }}
              />
            </div>

            {isLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[0, 1, 2].map((i) => (
                  <div key={i} style={{
                    height: 66,
                    background: 'var(--fb-surface)',
                    borderRadius: 'var(--fb-radius)',
                    border: '1px solid var(--fb-border)',
                    animation: 'pulse 1.5s ease-in-out infinite',
                  }} />
                ))}
              </div>
            ) : missions.length === 0 ? (
              <div style={{
                padding: '24px 16px',
                borderRadius: 'var(--fb-radius)',
                border: '1px dashed var(--fb-border)',
                textAlign: 'center',
              }}>
                <Layers size={28} color="var(--fb-text-3)" style={{ margin: '0 auto 10px' }} />
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fb-text-2)', marginBottom: 5 }}>
                  No missions found for this site
                </div>
                <div style={{ fontSize: 12, color: 'var(--fb-text-3)', maxWidth: 300, margin: '0 auto' }}>
                  Fly a grid mission in FlytBase first, then come back to create a project.
                </div>
              </div>
            ) : (() => {
              const filtered = missionSearch
                ? missions.filter((m: Mission) => m.mission_name.toLowerCase().includes(missionSearch.toLowerCase()))
                : missions;
              return filtered.length === 0 ? (
                <div style={{ padding: 16, textAlign: 'center', color: 'var(--fb-text-3)', fontSize: 12 }}>
                  No missions match "{missionSearch}"
                </div>
              ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 240, overflowY: 'auto' }}>
                {filtered.map((m: Mission) => {
                  const isSelected = selectedMission?.mission_id === m.mission_id;
                  return (
                    <div
                      key={m.mission_id}
                      onClick={() => setSelectedMission(m)}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 'var(--fb-radius)',
                        border: `1px solid ${isSelected ? 'var(--fb-primary)' : 'var(--fb-border)'}`,
                        background: isSelected ? 'var(--fb-primary-subtle)' : 'var(--fb-surface)',
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 12,
                        transition: 'border-color var(--fb-transition), background var(--fb-transition)',
                      }}
                      onMouseEnter={e => {
                        if (!isSelected) {
                          (e.currentTarget as HTMLElement).style.borderColor = 'var(--fb-border-active)';
                        }
                      }}
                      onMouseLeave={e => {
                        if (!isSelected) {
                          (e.currentTarget as HTMLElement).style.borderColor = 'var(--fb-border)';
                        }
                      }}
                    >
                      {/* Bullet icon */}
                      <div style={{
                        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                        background: isSelected ? 'var(--fb-primary)' : 'var(--fb-primary-subtle)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Layers size={14} color={isSelected ? '#fff' : 'var(--fb-primary)'} />
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 13, fontWeight: 600, color: 'var(--fb-text)',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          {m.mission_name}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--fb-text-3)', marginTop: 2, display: 'flex', gap: 8 }}>
                          <span style={{
                            fontSize: 9, fontWeight: 600, padding: '1px 5px',
                            background: 'rgba(44,123,242,0.12)', color: 'var(--fb-primary)',
                            borderRadius: 3,
                          }}>
                            GRID
                          </span>
                          {m.flight_count != null && (
                            <span>{m.flight_count} flight{m.flight_count !== 1 ? 's' : ''}</span>
                          )}
                          {m.last_flight_date && (
                            <>
                              <span style={{ opacity: 0.4 }}>·</span>
                              <span>{formatDate(m.last_flight_date)}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              );
            })()}
          </div>

          {/* Project details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fb-text-2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Project Details
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--fb-text-2)', marginBottom: 5 }}>
                Project Name <span style={{ color: 'var(--fb-primary)' }}>*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. March survey run"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '9px 12px', fontSize: 13,
                  background: 'var(--fb-surface)',
                  border: '1px solid var(--fb-border)',
                  borderRadius: 'var(--fb-radius)',
                  color: 'var(--fb-text)',
                  outline: 'none',
                  transition: 'border-color var(--fb-transition)',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--fb-primary)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--fb-border)')}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--fb-text-2)', marginBottom: 5 }}>
                Description <span style={{ color: 'var(--fb-text-3)' }}>(optional)</span>
              </label>
              <textarea
                placeholder="Brief description of the project..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '9px 12px', fontSize: 13,
                  background: 'var(--fb-surface)',
                  border: '1px solid var(--fb-border)',
                  borderRadius: 'var(--fb-radius)',
                  color: 'var(--fb-text)',
                  outline: 'none', resize: 'vertical',
                  fontFamily: 'inherit',
                  transition: 'border-color var(--fb-transition)',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--fb-primary)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--fb-border)')}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 20px',
          borderTop: '1px solid var(--fb-border)',
          display: 'flex', justifyContent: 'flex-end', gap: 10,
          flexShrink: 0,
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px', fontSize: 13, fontWeight: 500,
              background: 'var(--fb-surface)',
              border: '1px solid var(--fb-border)',
              borderRadius: 'var(--fb-radius)',
              color: 'var(--fb-text-2)', cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!canCreate || isSaving}
            style={{
              padding: '8px 18px', fontSize: 13, fontWeight: 600,
              background: canCreate && !isSaving ? 'var(--fb-primary)' : 'var(--fb-surface)',
              border: `1px solid ${canCreate && !isSaving ? 'var(--fb-primary)' : 'var(--fb-border)'}`,
              borderRadius: 'var(--fb-radius)',
              color: canCreate && !isSaving ? '#fff' : 'var(--fb-text-3)',
              cursor: canCreate && !isSaving ? 'pointer' : 'not-allowed',
              transition: 'background var(--fb-transition), color var(--fb-transition)',
            }}
          >
            {isSaving ? 'Creating...' : 'Create Project'}
          </button>
        </div>
      </div>
    </div>
  );
}
