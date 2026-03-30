import { Download, Cloud } from 'lucide-react';

interface Props { output: any; }

export default function PointCloudView({ output }: Props) {
  if (!output?.download_url) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--fb-text-3)', fontSize: 13 }}>
        No point cloud available
      </div>
    );
  }

  const sizeMB = output.size_bytes ? (output.size_bytes / 1e6).toFixed(1) : '?';

  return (
    <div style={{
      width: '100%', height: '100%', background: '#080d16',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: 16,
    }}>
      <div style={{
        width: 72, height: 72, borderRadius: 16,
        background: 'var(--fb-primary-subtle)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Cloud size={32} color="var(--fb-primary)" />
      </div>

      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--fb-text)', marginBottom: 4 }}>
          Point Cloud
        </div>
        <div style={{ fontSize: 12, color: 'var(--fb-text-3)' }}>
          LAZ compressed &middot; {sizeMB} MB
        </div>
        {output.metadata?.point_count && (
          <div style={{ fontSize: 12, color: 'var(--fb-text-3)', marginTop: 2 }}>
            {output.metadata.point_count.toLocaleString()} points
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <a
          href={output.download_url}
          download
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '10px 20px', background: 'var(--fb-primary)', color: '#fff',
            borderRadius: 'var(--fb-radius)', fontSize: 13, fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          <Download size={14} />
          Download LAZ
        </a>
      </div>

      <p style={{ fontSize: 11, color: 'var(--fb-text-3)', maxWidth: 320, textAlign: 'center', marginTop: 4 }}>
        Open in CloudCompare, QGIS, or any point cloud viewer for 3D visualization.
      </p>
    </div>
  );
}
