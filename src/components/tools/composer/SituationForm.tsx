import { POSITIONS } from '../../../lib/composer/tableBlock';
import type { Position } from '../../../lib/poker/types';
import type { SituationData } from '../../../lib/composer/types';

const fieldStyle = { borderColor: 'var(--color-border)', background: 'var(--color-surface-muted)' };

export interface SituationFormProps {
  value: SituationData;
  onChange: (next: SituationData) => void;
}

export default function SituationForm({ value, onChange }: SituationFormProps) {
  const patch = (p: Partial<SituationData>) => onChange({ ...value, ...p });

  return (
    <div
      className="rounded-xl border p-4 space-y-3"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
    >
      <h2 className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
        状況設定
      </h2>

      <label className="block text-sm">
        <span style={{ color: 'var(--color-text-muted)' }}>フォーマット</span>
        <input
          value={value.format}
          onChange={(e) => patch({ format: e.target.value })}
          className="w-full mt-1 text-sm rounded border px-2 py-1.5"
          style={fieldStyle}
        />
      </label>

      <label className="block text-sm">
        <span style={{ color: 'var(--color-text-muted)' }}>スタック</span>
        <input
          value={value.stacks}
          onChange={(e) => patch({ stacks: e.target.value })}
          className="w-full mt-1 text-sm rounded border px-2 py-1.5"
          style={fieldStyle}
        />
      </label>

      <div className="flex flex-wrap gap-3">
        <label className="text-sm">
          <span style={{ color: 'var(--color-text-muted)' }}>Hero</span>
          <select
            value={value.heroPosition}
            onChange={(e) => patch({ heroPosition: e.target.value as Position | '' })}
            className="mt-1 block text-sm rounded border px-2 py-1.5"
            style={fieldStyle}
          >
            <option value="">未設定</option>
            {POSITIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <span style={{ color: 'var(--color-text-muted)' }}>Villain</span>
          <select
            value={value.villainPosition}
            onChange={(e) => patch({ villainPosition: e.target.value as Position | '' })}
            className="mt-1 block text-sm rounded border px-2 py-1.5"
            style={fieldStyle}
          >
            <option value="">未設定</option>
            {POSITIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block text-sm">
        <span style={{ color: 'var(--color-text-muted)' }}>Villain のイメージ</span>
        <input
          value={value.villainImage}
          onChange={(e) => patch({ villainImage: e.target.value })}
          placeholder="例: VPIP 28 / PFR 24 ほどのやや広めのオープンレイズを打ってくるレギュラー"
          className="w-full mt-1 text-sm rounded border px-2 py-1.5"
          style={fieldStyle}
        />
      </label>
    </div>
  );
}
