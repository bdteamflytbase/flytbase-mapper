import { useEffect, useState } from 'react';
import { getSocket } from '../../lib/socket';

const STAGE_LABELS: Record<string, string> = {
  initializing: 'Initializing',
  fetching_urls: 'Fetching image URLs',
  downloading: 'Downloading images',
  opensfm: 'Structure from Motion',
  openmvs: 'Dense reconstruction',
  odm_meshing: 'Mesh reconstruction',
  mvs_texturing: 'Texture mapping',
  odm_georeferencing: 'Georeferencing',
  odm_orthophoto: 'Generating orthomosaic',
  odm_dem: 'Generating elevation models',
  uploading: 'Uploading outputs',
  done: 'Complete',
};

function formatETA(seconds: number | null | undefined): string {
  if (seconds == null || seconds <= 0) return '';
  if (seconds < 60) return 'Less than a minute remaining';
  if (seconds < 3600) return `~${Math.ceil(seconds / 60)} min remaining`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.ceil((seconds % 3600) / 60);
  return `~${hours}h ${mins}m remaining`;
}

export default function JobProgressBar({ job: initialJob }: { job: any }) {
  const [job, setJob] = useState(initialJob);

  useEffect(() => setJob(initialJob), [initialJob]);

  useEffect(() => {
    const socket = getSocket();
    const handler = (data: any) => {
      if (data.job_id === initialJob._id) setJob((j: any) => ({ ...j, ...data }));
    };
    socket.on('job:update', handler);
    return () => { socket.off('job:update', handler); };
  }, [initialJob._id]);

  const stageLabel = STAGE_LABELS[job.stage] || job.stage || 'Processing';
  const progress = job.progress ?? 0;
  const eta = formatETA(job.estimated_seconds_remaining);

  return (
    <div style={{
      background: 'var(--fb-surface)',
      border: '1px solid var(--fb-border)',
      borderRadius: 'var(--fb-radius)',
      padding: '10px 14px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: 'var(--fb-text)', fontWeight: 500 }}>{stageLabel}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {eta && <span style={{ fontSize: 11, color: 'var(--fb-text-3)' }}>{eta}</span>}
          <span style={{ fontSize: 12, color: 'var(--fb-primary)', fontFamily: 'monospace', fontWeight: 600 }}>{progress}%</span>
        </div>
      </div>
      <div style={{
        width: '100%', height: 6, borderRadius: 3,
        background: 'rgba(255,255,255,0.06)', overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', borderRadius: 3,
          background: 'var(--fb-primary)',
          width: `${progress}%`,
          transition: 'width 500ms ease',
        }} />
      </div>
      {job.message && (
        <p style={{
          fontSize: 11, color: 'var(--fb-text-3)', marginTop: 4,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {job.message}
        </p>
      )}
    </div>
  );
}
