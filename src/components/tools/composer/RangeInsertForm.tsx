import { RANGE_PRESETS, findPreset } from '../../../lib/poker/presets';
import { groupFromPreset, nextId, type RangeBlockState, type RangeGroupState } from '../../../lib/composer/rangeBlock';

const fieldStyle = { borderColor: 'var(--color-border)', background: 'var(--color-surface-muted)' };

const COLOR_OPTIONS = [
  { value: 'var(--color-poker-raise)', label: 'レイズ系(赤)' },
  { value: 'var(--color-poker-bet)', label: 'コール/ベット系(青)' },
  { value: 'var(--color-poker-call)', label: 'コール系(緑)' },
  { value: 'var(--color-tag-review)', label: 'その他(アンバー)' },
];

export interface RangeInsertFormProps {
  value: RangeBlockState;
  onChange: (next: RangeBlockState) => void;
}

export default function RangeInsertForm({ value, onChange }: RangeInsertFormProps) {
  const patch = (p: Partial<RangeBlockState>) => onChange({ ...value, ...p });

  const updateGroup = (id: string, p: Partial<RangeGroupState>) => {
    onChange({ ...value, groups: value.groups.map((g) => (g.id === id ? { ...g, ...p } : g)) });
  };
  const removeGroup = (id: string) => onChange({ ...value, groups: value.groups.filter((g) => g.id !== id) });
  const addBlankGroup = () =>
    onChange({
      ...value,
      groups: [...value.groups, { id: nextId('range-group'), label: '', color: COLOR_OPTIONS[0].value, hands: '' }],
    });

  return (
    <div className="space-y-3">
      <label className="block text-sm">
        <span style={{ color: 'var(--color-text-muted)' }}>タイトル</span>
        <input
          value={value.title}
          onChange={(e) => patch({ title: e.target.value })}
          className="w-full mt-1 text-sm rounded border px-2 py-1.5"
          style={fieldStyle}
        />
      </label>

      <div className="space-y-2">
        {value.groups.map((g) => (
          <div
            key={g.id}
            className="rounded-lg border p-2.5 space-y-1.5"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-center gap-2">
              <input
                value={g.label}
                onChange={(e) => updateGroup(g.id, { label: e.target.value })}
                placeholder="ラベル (例: BTN オープン)"
                className="flex-1 text-xs rounded border px-2 py-1"
                style={fieldStyle}
              />
              <button
                type="button"
                onClick={() => removeGroup(g.id)}
                className="text-xs px-2 py-1 rounded border cursor-pointer"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
              >
                削除
              </button>
            </div>
            <select
              value={g.color}
              onChange={(e) => updateGroup(g.id, { color: e.target.value })}
              className="text-xs rounded border px-2 py-1"
              style={fieldStyle}
            >
              {COLOR_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <input
              value={g.hands}
              onChange={(e) => updateGroup(g.id, { hands: e.target.value })}
              placeholder="22+, ATs+, KQo"
              className="w-full text-xs font-mono rounded border px-2 py-1"
              style={fieldStyle}
            />
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value=""
          onChange={(e) => {
            const preset = findPreset(e.target.value);
            if (preset) onChange({ ...value, groups: [...value.groups, groupFromPreset(preset)] });
          }}
          className="text-xs rounded border px-2 py-1"
          style={fieldStyle}
        >
          <option value="">+ プリセットから追加...</option>
          {RANGE_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={addBlankGroup}
          className="text-xs px-2.5 py-1 rounded-full border cursor-pointer"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
        >
          + 空のレンジを追加
        </button>
      </div>

      <label className="block text-sm">
        <span style={{ color: 'var(--color-text-muted)' }}>ハイライトするハンド (カンマ区切り)</span>
        <input
          value={value.highlight}
          onChange={(e) => patch({ highlight: e.target.value })}
          placeholder="AJo, KQs"
          className="w-full mt-1 text-sm rounded border px-2 py-1.5 font-mono"
          style={fieldStyle}
        />
      </label>
    </div>
  );
}
