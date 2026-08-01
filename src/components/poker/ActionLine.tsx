import type { Position } from '../../lib/poker/types';

export type ActionKind = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'post';

export interface ActionStep {
  position: Position;
  action: ActionKind;
  amount?: number;
}

export interface ActionLineProps {
  street?: string;
  actions: ActionStep[];
}

const ACTION_LABEL: Record<ActionKind, string> = {
  fold: 'フォールド',
  check: 'チェック',
  call: 'コール',
  bet: 'ベット',
  raise: 'レイズ',
  post: 'ポスト',
};

const ACTION_COLOR: Record<ActionKind, string> = {
  fold: 'var(--color-poker-fold)',
  check: 'var(--color-text-muted)',
  call: 'var(--color-poker-call)',
  bet: 'var(--color-poker-bet)',
  raise: 'var(--color-poker-raise)',
  post: 'var(--color-text-muted)',
};

export default function ActionLine({ street, actions }: ActionLineProps) {
  return (
    <div className="not-prose flex flex-wrap items-center gap-2 my-3">
      {street && (
        <span className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
          {street}
        </span>
      )}
      {actions.map((a, i) => (
        <span key={i} className="inline-flex items-center gap-1">
          <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
            {a.position}
          </span>
          <span className="text-sm font-medium" style={{ color: ACTION_COLOR[a.action] }}>
            {ACTION_LABEL[a.action]}
            {typeof a.amount === 'number' ? ` ${a.amount.toLocaleString()}` : ''}
          </span>
          {i < actions.length - 1 && (
            <span className="mx-1" style={{ color: 'var(--color-border)' }}>
              →
            </span>
          )}
        </span>
      ))}
    </div>
  );
}
