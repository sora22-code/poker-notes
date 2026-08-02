import { useMemo, useState } from 'react';
import PokerTable from '../poker/PokerTable';
import TableStateForm from './composer/TableStateForm';
import {
  computePot,
  generateTableCode,
  initialTableState,
  roundNum,
  tableStateToBoard,
  tableStateToPlayers,
  validateTableState,
  type TableBlockState,
} from '../../lib/composer/tableBlock';

export default function HandEditor() {
  const [state, setState] = useState<TableBlockState>(initialTableState());
  const [copied, setCopied] = useState(false);

  const errors = useMemo(() => validateTableState(state), [state]);
  const tablePlayers = useMemo(() => tableStateToPlayers(state), [state]);
  const boardCards = useMemo(() => tableStateToBoard(state), [state]);
  const pot = computePot(state);
  const code = useMemo(() => generateTableCode(state), [state]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleReset = () => setState(initialTableState());

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-6">
      <div className="space-y-5">
        <TableStateForm value={state} onChange={setState} />
        <button
          type="button"
          onClick={handleReset}
          className="text-xs font-semibold px-3 py-1.5 rounded-full border cursor-pointer"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
        >
          リセット
        </button>
      </div>

      <div className="space-y-5 xl:sticky xl:top-20 xl:self-start">
        <div
          className="rounded-xl border p-4"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <h2 className="text-sm font-bold mb-2" style={{ color: 'var(--color-text)' }}>
            プレビュー
          </h2>
          <PokerTable
            street={state.street}
            pot={roundNum(pot)}
            board={boardCards}
            players={tablePlayers}
            caption={state.caption || undefined}
            showHoleCards={state.showHoleCards}
          />
        </div>

        {errors.length > 0 && (
          <div
            className="rounded-lg border-l-4 p-3 text-sm space-y-1"
            style={{
              background: 'color-mix(in srgb, var(--color-poker-raise) 10%, transparent)',
              borderColor: 'var(--color-poker-raise)',
              color: 'var(--color-text)',
            }}
          >
            {errors.map((e, i) => (
              <p key={i}>⚠️ {e}</p>
            ))}
          </div>
        )}

        <div
          className="rounded-xl border p-4"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
              MDXコード
            </h2>
            <button
              type="button"
              onClick={handleCopy}
              className="text-xs font-semibold px-3 py-1.5 rounded-full cursor-pointer"
              style={{ background: 'var(--color-accent)', color: '#fff' }}
            >
              {copied ? 'コピーしました' : 'MDXをコピー'}
            </button>
          </div>
          <pre
            className="text-xs font-mono rounded-lg p-3 overflow-x-auto"
            style={{ background: 'var(--code-bg)', color: 'var(--code-fg)' }}
          >
            {code}
          </pre>
        </div>
      </div>
    </div>
  );
}
