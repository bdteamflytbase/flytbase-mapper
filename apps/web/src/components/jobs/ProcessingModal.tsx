import { useState } from 'react';
import { X, Loader } from 'lucide-react';

interface Props {
  selectedCount: number;
  onClose: () => void;
  onSubmit: (quality: string, options: any) => void;
}

const QUALITY_OPTIONS = [
  { value: 'preview', label: 'Preview', desc: 'Fast, ~5-10 min, lower resolution' },
  { value: 'medium', label: 'Standard', desc: 'Balanced quality/speed, ~15-30 min' },
  { value: 'high', label: 'High', desc: 'Maximum quality, ~30-90 min' },
];

export default function ProcessingModal({ selectedCount, onClose, onSubmit }: Props) {
  const [quality, setQuality] = useState<'preview' | 'medium' | 'high'>('medium');
  const [options, setOptions] = useState({
    orthomosaic: true,
    mesh: true,
    pointcloud: true,
    dsm: true,
    dtm: false,
  });
  const [submitting, setSubmitting] = useState(false);

  const toggle = (key: keyof typeof options) =>
    setOptions((o) => ({ ...o, [key]: !o[key] }));

  const handleSubmit = async () => {
    setSubmitting(true);
    try { await onSubmit(quality, options); } finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#2a2d3a]">
          <div>
            <h2 className="text-white font-semibold">Configure Processing</h2>
            <p className="text-gray-400 text-sm">{selectedCount} images selected</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-5">
          {/* Quality */}
          <div>
            <p className="text-sm text-gray-400 mb-2">Quality</p>
            <div className="space-y-2">
              {QUALITY_OPTIONS.map((q) => (
                <label key={q.value} className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="quality"
                    value={q.value}
                    checked={quality === q.value}
                    onChange={() => setQuality(q.value as any)}
                    className="mt-0.5 accent-blue-600"
                  />
                  <div>
                    <span className="text-white text-sm font-medium">{q.label}</span>
                    <p className="text-gray-500 text-xs">{q.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Outputs */}
          <div>
            <p className="text-sm text-gray-400 mb-2">Outputs</p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(options).map(([key, val]) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={val}
                    onChange={() => toggle(key as any)}
                    className="accent-blue-600"
                  />
                  <span className="text-white text-sm capitalize">{key === 'dsm' ? 'DSM' : key === 'dtm' ? 'DTM' : key}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-[#2a2d3a] flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-[#0f1117] border border-[#2a2d3a] text-gray-400 hover:text-white rounded-lg py-2.5 text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !Object.values(options).some(Boolean)}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            {submitting ? <><Loader size={14} className="animate-spin" /> Submitting...</> : 'Start Processing'}
          </button>
        </div>
      </div>
    </div>
  );
}
