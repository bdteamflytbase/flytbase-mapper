import { Play, RefreshCw } from 'lucide-react';

interface Props {
  mode: 'process' | 'rerun';
  selectedCount?: number;
  disabled?: boolean;
  onClick: () => void;
}

export default function ProcessButton({ mode, selectedCount = 0, disabled, onClick }: Props) {
  const isProcess = mode === 'process';

  return (
    <button
      onClick={onClick}
      disabled={disabled || (isProcess && selectedCount === 0)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        width: '100%', padding: '12px 16px',
        background: disabled || (isProcess && selectedCount === 0)
          ? 'rgba(44,123,242,0.3)'
          : 'var(--fb-primary)',
        color: '#fff', border: 'none', borderRadius: 'var(--fb-radius)',
        fontSize: 13, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background var(--fb-transition)',
      }}
    >
      {isProcess ? <Play size={14} /> : <RefreshCw size={14} />}
      {isProcess ? `Process Selected (${selectedCount})` : 'Rerun Processing'}
    </button>
  );
}
