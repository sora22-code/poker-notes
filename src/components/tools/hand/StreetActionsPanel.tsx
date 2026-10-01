import { useState } from 'react';
import { mutedTextStyle, primaryButtonStyle, secondaryButtonStyle, fieldStyle } from './styles';
import {
  STREET_LABEL,
  describeAction,
  foldToKeyPlayers,
  legalActions,
  sizingPresets,
  type HandAction,
  type HandInput,
  type HandResult,
  type LegalActions,
  type TableState,
} from '../../../lib/poker/nlh';
import type { Position, Street } from '../../../lib/poker/types';

const smallButton = 'text-xs font-semibold px-3 py-1.5 rounded-full border cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed';

interface ActionControlsProps {
  state: TableState;
  legal: LegalActions;
  heroPosition: Position;
  onAction: (action: HandAction) => void;
}

function ActionControls({ state, legal, heroPosition, onAction }: ActionControlsProps) {
  const presets = sizingPresets(state, legal);
  const [amount, setAmount] = useState(String(presets[0]?.to ?? legal.minTo));
  const kind = legal.canBet ? 'bet' : 'raise';
  const canSize = legal.canBet || legal.canRaise;
  const amountNum = Number(amount);
  const amountInvalid = !(amountNum > 0) || (amountNum < legal.minTo && amountNum < legal.maxTo);
  const callIsAllIn = legal.canCall && legal.toCall >= legal.stack;
  const act = (a: Omit<HandAction, 'position'>) => onAction({ position: legal.position, ...a });

  return (
    <div className="space-y-2">
      <p className="text-sm" style={{ color: 'var(--color-text)' }}>
        <strong>{legal.position}</strong>
        {legal.position === heroPosition && <span style={{ color: 'var(--color-accent)' }}> (Hero)</span>} の番
        <span className="ml-2 text-xs" style={mutedTextStyle}>
          残り {legal.stack}bb
          {legal.committed > 0 && ` / このストリートで ${legal.committed}bb 投入済み`}
        </span>
      </p>

      <div className="flex flex-wrap gap-2">
        {legal.canCall && (
          <button type="button" className={smallButton} style={secondaryButtonStyle} onClick={() => act({ kind: 'fold' })}>
            フォールド
          </button>
        )}
        {legal.canCheck && (
          <button type="button" className={smallButton} style={secondaryButtonStyle} onClick={() => act({ kind: 'check' })}>
            チェック
          </button>
        )}
        {legal.canCall && (
          <button type="button" className={smallButton} style={secondaryButtonStyle} onClick={() => act({ kind: 'call' })}>
            コール {Math.min(legal.toCall, legal.stack)}bb{callIsAllIn ? '(オールイン)' : ''}
          </button>
        )}
      </div>

      {canSize && (
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold" style={mutedTextStyle}>
              {kind === 'bet' ? 'ベット' : 'レイズ'}
            </span>
            {presets.map((p) => (
              <button
                key={p.label}
                type="button"
                className={smallButton}
                style={secondaryButtonStyle}
                onClick={() => act({ kind, to: p.to })}
              >
                {p.label} <span style={mutedTextStyle}>{p.to}bb</span>
              </button>
            ))}
            <button
              type="button"
              className={smallButton}
              style={secondaryButtonStyle}
              onClick={() => act({ kind, to: legal.maxTo })}
            >
              オールイン <span style={mutedTextStyle}>{legal.maxTo}bb</span>
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="number"
              min={legal.minTo}
              max={legal.maxTo}
              step={0.1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-20 text-sm rounded border px-2 py-1"
              style={fieldStyle}
              aria-label={`${kind === 'bet' ? 'ベット' : 'レイズ'}額(合計)`}
            />
            <span className="text-xs" style={mutedTextStyle}>
              bbに
            </span>
            <button
              type="button"
              className={smallButton}
              style={primaryButtonStyle}
              disabled={amountInvalid}
              onClick={() => act({ kind, to: Math.min(amountNum, legal.maxTo) })}
            >
              {kind === 'bet' ? 'ベット' : 'レイズ'}
            </button>
            <span className="text-[11px]" style={mutedTextStyle}>
              最小 {legal.minTo}bb ・ 金額はこのストリートでの合計(例: 2.5bbにレイズ)
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

interface StreetActionsPanelProps {
  input: HandInput;
  result: HandResult;
  street: Street;
  onChange: (actions: HandAction[]) => void;
}

export default function StreetActionsPanel({ input, result, street, onChange }: StreetActionsPanelProps) {
  const res = result.streets[street];
  const actions = input.actions[street];
  const state = res.snapshots[res.snapshots.length - 1];
  const legal = state ? legalActions(state) : null;
  const { heroPosition, villainPosition } = input.setup;
  const isKeyPlayer = (p: Position) => p === heroPosition || p === villainPosition;
  const canFastForward = Boolean(legal && legal.canCall && !isKeyPlayer(legal.position));

  const lastStreetOfHand = result.endedByFold && res.complete && !result.error;
  const winner = state?.seats.filter((s) => !s.folded).map((s) => s.position)[0];

  let statusText = '';
  if (!legal && res.complete) {
    if (lastStreetOfHand && state && state.seats.filter((s) => !s.folded).length === 1) {
      statusText = `${winner} 以外が全員フォールドしたので、ハンドはここで終了です。`;
    } else if (res.actions.length === 0) {
      statusText = 'オールインのため、このストリートのアクションはありません。';
    } else if (street === 'river') {
      statusText = 'アクション完了。ショーダウンです。';
    } else {
      statusText = `${STREET_LABEL[street]}のアクションは完了しました。`;
    }
  }

  return (
    <div className="rounded-lg border p-3 space-y-3" style={{ borderColor: 'var(--color-border)' }}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold" style={mutedTextStyle}>
          {STREET_LABEL[street]}のアクション
        </span>
        {state && (
          <span className="text-xs font-bold" style={{ color: 'var(--color-poker-pot)' }}>
            ポット {state.pot}bb
          </span>
        )}
      </div>

      {res.actions.length > 0 ? (
        <ol className="flex flex-wrap gap-1.5">
          {res.actions.map((a, i) => (
            <li
              key={i}
              className="text-xs px-2 py-0.5 rounded-full border"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
            >
              {i + 1}. {describeAction(a)}
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-xs" style={mutedTextStyle}>
          まだアクションがありません。
        </p>
      )}

      {canFastForward && (
        <button
          type="button"
          className={smallButton}
          style={secondaryButtonStyle}
          onClick={() => onChange(foldToKeyPlayers(input, street))}
        >
          HeroかVillainの番までフォールドで進める
        </button>
      )}

      {legal && state ? (
        <ActionControls
          key={`${street}-${actions.length}`}
          state={state}
          legal={legal}
          heroPosition={heroPosition}
          onAction={(a) => onChange([...actions, a])}
        />
      ) : (
        statusText && (
          <p className="text-sm" style={{ color: 'var(--color-text)' }}>
            {statusText}
          </p>
        )
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          className={smallButton}
          style={secondaryButtonStyle}
          disabled={actions.length === 0}
          onClick={() => onChange(actions.slice(0, -1))}
        >
          1つ戻す
        </button>
        <button
          type="button"
          className={smallButton}
          style={secondaryButtonStyle}
          disabled={actions.length === 0}
          onClick={() => onChange([])}
        >
          このストリートをやり直す
        </button>
      </div>
    </div>
  );
}
