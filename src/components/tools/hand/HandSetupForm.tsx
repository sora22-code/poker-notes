import type { ReactNode } from 'react';
import CardField from './CardField';
import { fieldStyle, mutedTextStyle, panelStyle } from './styles';
import { SEATS, STREET_LABEL, STREET_ORDER, type HandSetup, type TableSize } from '../../../lib/poker/nlh';
import type { Position, Street } from '../../../lib/poker/types';

interface HandSetupFormProps {
  value: HandSetup;
  onChange: (next: HandSetup) => void;
  children?: ReactNode;
}

function Segmented<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            onClick={() => onChange(o.value)}
            className="text-xs font-semibold px-3 py-1.5 cursor-pointer"
            style={
              active
                ? { background: 'var(--color-accent)', color: '#fff' }
                : { background: 'var(--color-surface)', color: 'var(--color-text-muted)' }
            }
            aria-pressed={active}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span style={mutedTextStyle}>{label}</span>
      {hint && (
        <span className="ml-1 text-[11px]" style={mutedTextStyle}>
          ({hint})
        </span>
      )}
      <div className="mt-1">{children}</div>
    </label>
  );
}

export default function HandSetupForm({ value, onChange, children }: HandSetupFormProps) {
  const patch = (p: Partial<HandSetup>) => onChange({ ...value, ...p });
  const seats = SEATS[value.tableSize];

  const changeTableSize = (tableSize: TableSize) => {
    const next = SEATS[tableSize];
    patch({
      tableSize,
      heroPosition: next.includes(value.heroPosition) ? value.heroPosition : 'BB',
      villainPosition:
        value.villainPosition && !next.includes(value.villainPosition) ? 'BTN' : value.villainPosition,
    });
  };

  const changeFormat = (format: HandSetup['format']) => {
    // Tournaments almost always play with a BB ante today; cash games don't.
    patch({ format, ante: format === 'tournament' ? value.ante || 1 : 0 });
  };

  return (
    <div className="rounded-xl border p-4 space-y-4" style={panelStyle}>
      <div>
        <h2 className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
          ハンド設定
        </h2>
        <p className="text-xs mt-0.5" style={mutedTextStyle}>
          NLH(ノーリミットホールデム)前提。金額はすべてbb(ビッグブラインド)単位で、SB 0.5bb / BB 1bb は自動で置かれます。
        </p>
      </div>

      <div className="flex flex-wrap gap-4">
        <Field label="ゲーム">
          <Segmented
            value={value.format}
            options={[
              { value: 'cash', label: 'キャッシュ' },
              { value: 'tournament', label: 'トーナメント' },
            ]}
            onChange={changeFormat}
          />
        </Field>
        <Field label="人数">
          <Segmented
            value={value.tableSize}
            options={[
              { value: 6, label: '6-max' },
              { value: 9, label: '9-max' },
            ]}
            onChange={changeTableSize}
          />
        </Field>
      </div>

      <div className="flex flex-wrap gap-3">
        <Field label="ステークス" hint="任意">
          <input
            value={value.stakes}
            onChange={(e) => patch({ stakes: e.target.value })}
            placeholder={value.format === 'cash' ? 'NL50' : '$109 MTT'}
            className="w-32 text-sm rounded border px-2 py-1.5"
            style={fieldStyle}
          />
        </Field>
        <Field label={value.startStreet === 'preflop' ? 'エフェクティブスタック' : '開始時のスタック'} hint="bb">
          <input
            type="number"
            min={1}
            step={0.5}
            value={value.effectiveStack}
            onChange={(e) => patch({ effectiveStack: Number(e.target.value) })}
            className="w-24 text-sm rounded border px-2 py-1.5"
            style={fieldStyle}
          />
        </Field>
        {value.format === 'tournament' && (
          <Field label="BBアンティ" hint="bb・なしは0">
            <input
              type="number"
              min={0}
              step={0.5}
              value={value.ante}
              onChange={(e) => patch({ ante: Number(e.target.value) })}
              className="w-20 text-sm rounded border px-2 py-1.5"
              style={fieldStyle}
            />
          </Field>
        )}
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <Field label="どこから入力するか">
          <select
            value={value.startStreet}
            onChange={(e) => patch({ startStreet: e.target.value as Street })}
            className="text-sm rounded border px-2 py-1.5"
            style={fieldStyle}
          >
            {STREET_ORDER.map((s) => (
              <option key={s} value={s}>
                {STREET_LABEL[s]}から
              </option>
            ))}
          </select>
        </Field>
        {value.startStreet !== 'preflop' && (
          <Field label={`${STREET_LABEL[value.startStreet]}開始時のポット`} hint="bb">
            <input
              type="number"
              min={0}
              step={0.5}
              value={value.startPot}
              onChange={(e) => patch({ startPot: Number(e.target.value) })}
              className="w-24 text-sm rounded border px-2 py-1.5"
              style={fieldStyle}
            />
          </Field>
        )}
      </div>
      {value.startStreet !== 'preflop' && (
        <p className="text-xs -mt-2" style={mutedTextStyle}>
          プリフロップを省略し、HeroとVillainの2人だけが残った状態から始めます(例: シングルレイズポットのフロップは開始時ポット5.5bb)。
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border p-3 space-y-2" style={{ borderColor: 'var(--color-border)' }}>
          <Field label="Hero" hint="自分">
            <select
              value={value.heroPosition}
              onChange={(e) => patch({ heroPosition: e.target.value as Position })}
              className="text-sm rounded border px-2 py-1.5"
              style={fieldStyle}
            >
              {seats.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </Field>
          <div className="flex flex-wrap gap-2">
            <CardField
              label="Heroのカード1"
              value={value.heroCards[0] ?? ''}
              onChange={(c) => patch({ heroCards: [c, value.heroCards[1] ?? ''] })}
            />
            <CardField
              label="Heroのカード2"
              value={value.heroCards[1] ?? ''}
              onChange={(c) => patch({ heroCards: [value.heroCards[0] ?? '', c] })}
            />
          </div>
        </div>

        <div className="rounded-lg border p-3 space-y-2" style={{ borderColor: 'var(--color-border)' }}>
          <Field label="Villain" hint="主な相手">
            <select
              value={value.villainPosition}
              onChange={(e) => patch({ villainPosition: e.target.value as Position | '' })}
              className="text-sm rounded border px-2 py-1.5"
              style={fieldStyle}
            >
              <option value="">なし</option>
              {seats
                .filter((p) => p !== value.heroPosition)
                .map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
            </select>
          </Field>
          <div className="flex flex-wrap gap-2">
            <CardField
              label="Villainのカード1"
              value={value.villainCards[0] ?? ''}
              onChange={(c) => patch({ villainCards: [c, value.villainCards[1] ?? ''] })}
            />
            <CardField
              label="Villainのカード2"
              value={value.villainCards[1] ?? ''}
              onChange={(c) => patch({ villainCards: [value.villainCards[0] ?? '', c] })}
            />
          </div>
          <p className="text-[11px]" style={mutedTextStyle}>
            任意。ショーダウンで判明した場合に入力すると、テーブル図で表示できます。
          </p>
        </div>
      </div>

      {children}
    </div>
  );
}
