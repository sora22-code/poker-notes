import {
  POSITIONS,
  RANKS,
  STREETS,
  SUITS,
  computePot,
  normalizeCard,
  roundNum,
  type TableBlockState,
  type TablePlayerState,
} from '../../../lib/composer/tableBlock';
import type { Position, Street } from '../../../lib/poker/types';

const fieldStyle = { borderColor: 'var(--color-border)', background: 'var(--color-surface-muted)' };

interface CardFieldProps {
  value: string;
  onChange: (value: string) => void;
}

function CardField({ value, onChange }: CardFieldProps) {
  const rank = value ? value[0]?.toUpperCase() ?? '' : '';
  const suit = value ? value[1]?.toLowerCase() ?? '' : '';

  return (
    <div className="flex items-center gap-1">
      <input
        value={value}
        onChange={(e) => onChange(normalizeCard(e.target.value))}
        placeholder="Ac"
        className="w-12 text-xs font-mono px-1.5 py-1 rounded border text-center"
        style={fieldStyle}
      />
      <select
        value={rank}
        onChange={(e) => onChange((e.target.value || '') + suit)}
        className="text-xs rounded border py-1"
        style={fieldStyle}
        aria-label="ランク"
      >
        <option value="">-</option>
        {RANKS.slice()
          .reverse()
          .map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
      </select>
      <select
        value={suit}
        onChange={(e) => onChange(rank + (e.target.value || ''))}
        className="text-xs rounded border py-1"
        style={fieldStyle}
        aria-label="スート"
      >
        <option value="">-</option>
        {SUITS.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export interface TableStateFormProps {
  value: TableBlockState;
  onChange: (next: TableBlockState) => void;
  /** Hides the street selector when the street is fixed by the surrounding section. */
  lockStreet?: boolean;
}

export default function TableStateForm({ value, onChange, lockStreet }: TableStateFormProps) {
  const patch = (p: Partial<TableBlockState>) => onChange({ ...value, ...p });

  const updatePlayer = (position: Position, p: Partial<TablePlayerState>) => {
    onChange({
      ...value,
      players: value.players.map((pl) => (pl.position === position ? { ...pl, ...p } : pl)),
    });
  };

  const updateBoard = (index: number, card: string) => {
    onChange({ ...value, board: value.board.map((c, i) => (i === index ? card : c)) });
  };

  const pot = computePot(value);

  return (
    <div className="space-y-5">
      <div
        className="rounded-xl border p-4 space-y-3"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <h3 className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
          局面
        </h3>

        {!lockStreet && (
          <label className="flex items-center gap-2 text-sm">
            <span style={{ color: 'var(--color-text-muted)' }}>ストリート</span>
            <select
              value={value.street}
              onChange={(e) => patch({ street: e.target.value as Street })}
              className="text-sm rounded border px-2 py-1"
              style={fieldStyle}
            >
              {STREETS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        )}

        <div>
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            ボード (最大5枚)
          </span>
          <div className="flex flex-wrap gap-2 mt-1">
            {value.board.map((c, i) => (
              <CardField key={i} value={c} onChange={(v) => updateBoard(i, v)} />
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={value.autoPot} onChange={(e) => patch({ autoPot: e.target.checked })} />
            <span style={{ color: 'var(--color-text-muted)' }}>ポット自動計算</span>
          </label>

          {value.autoPot ? (
            <label className="flex items-center gap-2 text-sm">
              <span style={{ color: 'var(--color-text-muted)' }}>持ち越し分</span>
              <input
                value={value.carriedPot}
                onChange={(e) => patch({ carriedPot: e.target.value })}
                inputMode="decimal"
                className="w-20 text-sm rounded border px-2 py-1"
                style={fieldStyle}
              />
            </label>
          ) : (
            <label className="flex items-center gap-2 text-sm">
              <span style={{ color: 'var(--color-text-muted)' }}>ポット(手動)</span>
              <input
                value={value.manualPot}
                onChange={(e) => patch({ manualPot: e.target.value })}
                inputMode="decimal"
                className="w-24 text-sm rounded border px-2 py-1"
                style={fieldStyle}
              />
            </label>
          )}

          <span className="text-sm font-bold" style={{ color: 'var(--color-accent)' }}>
            POT {roundNum(pot)}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <span style={{ color: 'var(--color-text-muted)' }}>Hero</span>
            <select
              value={value.heroPosition}
              onChange={(e) => patch({ heroPosition: e.target.value as Position | '' })}
              className="text-sm rounded border px-2 py-1"
              style={fieldStyle}
            >
              <option value="">なし</option>
              {POSITIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 text-sm">
            <span style={{ color: 'var(--color-text-muted)' }}>手番(アクティブ)</span>
            <select
              value={value.activePosition}
              onChange={(e) => patch({ activePosition: e.target.value as Position | '' })}
              className="text-sm rounded border px-2 py-1"
              style={fieldStyle}
            >
              <option value="">なし</option>
              {POSITIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={value.showHoleCards}
              onChange={(e) => patch({ showHoleCards: e.target.checked })}
            />
            <span style={{ color: 'var(--color-text-muted)' }}>全員のカードを表示</span>
          </label>
        </div>

        <label className="block text-sm">
          <span style={{ color: 'var(--color-text-muted)' }}>キャプション</span>
          <input
            value={value.caption}
            onChange={(e) => patch({ caption: e.target.value })}
            placeholder="例: A-7-3 レインボー。"
            className="w-full mt-1 text-sm rounded border px-2 py-1.5"
            style={fieldStyle}
          />
        </label>
      </div>

      <div
        className="rounded-xl border p-4 space-y-3"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <h3 className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
          プレイヤー
        </h3>

        <div className="space-y-2">
          {value.players.map((p) => (
            <div
              key={p.position}
              className="flex flex-wrap items-center gap-2 rounded-lg border px-2.5 py-2"
              style={{ borderColor: 'var(--color-border)', opacity: p.enabled ? 1 : 0.5 }}
            >
              <label className="flex items-center gap-1.5 w-16 shrink-0">
                <input
                  type="checkbox"
                  checked={p.enabled}
                  onChange={(e) => updatePlayer(p.position, { enabled: e.target.checked })}
                />
                <span className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
                  {p.position}
                </span>
              </label>

              <label className="flex items-center gap-1 text-xs">
                <span style={{ color: 'var(--color-text-muted)' }}>stack</span>
                <input
                  value={p.stack}
                  onChange={(e) => updatePlayer(p.position, { stack: e.target.value })}
                  inputMode="decimal"
                  disabled={!p.enabled}
                  className="w-16 text-xs rounded border px-1.5 py-1"
                  style={fieldStyle}
                />
              </label>

              <label className="flex items-center gap-1 text-xs">
                <span style={{ color: 'var(--color-text-muted)' }}>bet</span>
                <input
                  value={p.bet}
                  onChange={(e) => updatePlayer(p.position, { bet: e.target.value })}
                  inputMode="decimal"
                  disabled={!p.enabled}
                  className="w-14 text-xs rounded border px-1.5 py-1"
                  style={fieldStyle}
                />
              </label>

              <label className="flex items-center gap-1 text-xs">
                <input
                  type="checkbox"
                  checked={p.folded}
                  disabled={!p.enabled}
                  onChange={(e) => updatePlayer(p.position, { folded: e.target.checked })}
                />
                <span style={{ color: 'var(--color-text-muted)' }}>fold</span>
              </label>

              <div className="flex items-center gap-1">
                <CardField value={p.card1} onChange={(v) => updatePlayer(p.position, { card1: v })} />
                <CardField value={p.card2} onChange={(v) => updatePlayer(p.position, { card2: v })} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
