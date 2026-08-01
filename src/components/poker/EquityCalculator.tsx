import { useEffect, useRef, useState } from 'react';
import type { EquityResult } from '../../lib/poker/equity';

export interface EquityCalculatorProps {
  hands?: string[];
  board?: string[];
  iterations?: number;
  readonly?: boolean;
}

export default function EquityCalculator({
  hands: initialHands = ['AKs', 'QQ'],
  board: initialBoard = [],
  iterations = 20000,
  readonly = false,
}: EquityCalculatorProps) {
  const [hands, setHands] = useState<string[]>(initialHands);
  const [board, setBoard] = useState<string>(initialBoard.join(' '));
  const [result, setResult] = useState<EquityResult | null>(null);
  const [running, setRunning] = useState(false);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    const worker = new Worker(new URL('../../lib/workers/equity.worker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;
    worker.onmessage = (e: MessageEvent<EquityResult>) => {
      setResult(e.data);
      setRunning(false);
    };
    run(worker, initialHands, initialBoard, iterations);
    return () => worker.terminate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function run(worker: Worker | null, h: string[], b: string[], iters: number) {
    if (!worker) return;
    setRunning(true);
    worker.postMessage({ hands: h, board: b, iterations: iters });
  }

  const handleRecalculate = () => {
    const boardCards = board.trim().length > 0 ? board.trim().split(/\s+/) : [];
    run(workerRef.current, hands, boardCards, iterations);
  };

  const updateHand = (i: number, value: string) => {
    setHands((prev) => prev.map((h, idx) => (idx === i ? value : h)));
  };

  return (
    <div
      className="not-prose my-6 rounded-xl border p-4"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
          エクイティ計算機
        </h4>
        {!readonly && (
          <button
            onClick={handleRecalculate}
            disabled={running}
            className="text-xs font-semibold px-3 py-1.5 rounded-full disabled:opacity-50 cursor-pointer"
            style={{ background: 'var(--color-accent)', color: '#fff' }}
          >
            {running ? '計算中…' : '再計算'}
          </button>
        )}
      </div>

      <div className="space-y-2 mb-3">
        {hands.map((h, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-xs w-14 shrink-0" style={{ color: 'var(--color-text-muted)' }}>
              Hand {i + 1}
            </span>
            {readonly ? (
              <span className="text-sm font-mono">{h}</span>
            ) : (
              <input
                value={h}
                onChange={(e) => updateHand(i, e.target.value)}
                className="text-sm font-mono px-2 py-1 rounded border flex-1"
                style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-muted)' }}
              />
            )}
            <span className="text-sm font-bold ml-auto tabular-nums" style={{ color: 'var(--color-accent)' }}>
              {result ? `${result.equity[i]?.toFixed(1)}%` : '—'}
            </span>
          </div>
        ))}
      </div>

      {!readonly && (
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs w-14 shrink-0" style={{ color: 'var(--color-text-muted)' }}>
            Board
          </span>
          <input
            value={board}
            onChange={(e) => setBoard(e.target.value)}
            placeholder="例: Ah Kd 2c"
            className="text-sm font-mono px-2 py-1 rounded border flex-1"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-muted)' }}
          />
        </div>
      )}

      {result && (
        <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
          {result.iterations.toLocaleString()} 回のモンテカルロ試行に基づく概算値です。
        </p>
      )}
    </div>
  );
}
