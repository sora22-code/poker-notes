import { useMemo, useState } from 'react';
import PokerTable from '../poker/PokerTable';
import { RANKS, type Position, type Street } from '../../lib/poker/types';

const POSITIONS: Position[] = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
const STREETS: { value: Street; label: string }[] = [
  { value: 'preflop', label: 'プリフロップ' },
  { value: 'flop', label: 'フロップ' },
  { value: 'turn', label: 'ターン' },
  { value: 'river', label: 'リバー' },
];
const SUITS: { value: string; label: string }[] = [
  { value: 's', label: '♠s' },
  { value: 'h', label: '♥h' },
  { value: 'd', label: '♦d' },
  { value: 'c', label: '♣c' },
];
const CARD_RE = /^[2-9TJQKA][shdc]$/;

interface PlayerState {
  position: Position;
  enabled: boolean;
  stack: string;
  bet: string;
  folded: boolean;
  card1: string;
  card2: string;
}

function initialPlayers(): PlayerState[] {
  return POSITIONS.map((position) => ({
    position,
    enabled: true,
    stack: '100',
    bet: '',
    folded: false,
    card1: '',
    card2: '',
  }));
}

function normalizeCard(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return '';
  const rank = trimmed[0].toUpperCase();
  const suit = trimmed[1] ? trimmed[1].toLowerCase() : '';
  return rank + suit;
}

function roundNum(n: number): number {
  return Math.round(n * 100) / 100;
}

function generateCode(params: {
  street: Street;
  pot: number;
  board: string[];
  players: PlayerState[];
  heroPosition: Position | '';
  activePosition: Position | '';
  caption: string;
}): string {
  const { street, pot, board, players, heroPosition, activePosition, caption } = params;
  const lines: string[] = [];
  lines.push('<PokerTable');
  lines.push('  client:visible');
  lines.push(`  street="${street}"`);
  lines.push(`  pot={${roundNum(pot)}}`);
  if (board.length > 0) {
    lines.push(`  board={[${board.map((c) => `'${c}'`).join(', ')}]}`);
  }
  lines.push('  players={[');
  for (const p of players) {
    const fields: string[] = [`position: '${p.position}'`];
    const stack = parseFloat(p.stack);
    if (!Number.isNaN(stack)) fields.push(`stack: ${roundNum(stack)}`);
    const bet = parseFloat(p.bet);
    if (!Number.isNaN(bet) && bet > 0) fields.push(`bet: ${roundNum(bet)}`);
    if (p.position === heroPosition) fields.push('isHero: true');
    if (p.position === activePosition) fields.push('isActive: true');
    if (p.folded) fields.push('folded: true');
    const c1 = normalizeCard(p.card1);
    const c2 = normalizeCard(p.card2);
    if (CARD_RE.test(c1) && CARD_RE.test(c2)) fields.push(`cards: ['${c1}', '${c2}']`);
    lines.push(`    { ${fields.join(', ')} },`);
  }
  lines.push('  ]}');
  if (caption.trim()) {
    lines.push(`  caption="${caption.trim().replace(/"/g, '\\"')}"`);
  }
  lines.push('/>');
  return lines.join('\n');
}

interface CardFieldProps {
  value: string;
  onChange: (value: string) => void;
}

function CardField({ value, onChange }: CardFieldProps) {
  const rank = value ? value[0]?.toUpperCase() ?? '' : '';
  const suit = value ? value[1]?.toLowerCase() ?? '' : '';
  const inputStyle = { borderColor: 'var(--color-border)', background: 'var(--color-surface-muted)' };

  return (
    <div className="flex items-center gap-1">
      <input
        value={value}
        onChange={(e) => onChange(normalizeCard(e.target.value))}
        placeholder="Ac"
        className="w-12 text-xs font-mono px-1.5 py-1 rounded border text-center"
        style={inputStyle}
      />
      <select
        value={rank}
        onChange={(e) => onChange((e.target.value || '') + suit)}
        className="text-xs rounded border py-1"
        style={inputStyle}
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
        style={inputStyle}
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

const fieldStyle = { borderColor: 'var(--color-border)', background: 'var(--color-surface-muted)' };
const POSITION_LABEL: Record<Position | '', string> = {
  UTG: 'UTG',
  UTG1: 'UTG1',
  UTG2: 'UTG2',
  LJ: 'LJ',
  HJ: 'HJ',
  CO: 'CO',
  BTN: 'BTN',
  SB: 'SB',
  BB: 'BB',
  '': 'なし',
};

export default function HandEditor() {
  const [street, setStreet] = useState<Street>('preflop');
  const [board, setBoard] = useState<string[]>(['', '', '', '', '']);
  const [autoPot, setAutoPot] = useState(true);
  const [carriedPot, setCarriedPot] = useState('0');
  const [manualPot, setManualPot] = useState('0');
  const [caption, setCaption] = useState('');
  const [heroPosition, setHeroPosition] = useState<Position | ''>('BB');
  const [activePosition, setActivePosition] = useState<Position | ''>('');
  const [players, setPlayers] = useState<PlayerState[]>(initialPlayers());
  const [copied, setCopied] = useState(false);
  const [showHoleCards, setShowHoleCards] = useState(true);

  const updatePlayer = (position: Position, patch: Partial<PlayerState>) => {
    setPlayers((prev) => prev.map((p) => (p.position === position ? { ...p, ...patch } : p)));
  };

  const updateBoard = (index: number, value: string) => {
    setBoard((prev) => prev.map((c, i) => (i === index ? value : c)));
  };

  const enabledPlayers = players.filter((p) => p.enabled);
  const boardCards = board.map(normalizeCard).filter(Boolean);

  const sumBets = enabledPlayers.reduce((sum, p) => sum + (parseFloat(p.bet) || 0), 0);
  const computedPot = (parseFloat(carriedPot) || 0) + sumBets;
  const pot = autoPot ? computedPot : parseFloat(manualPot) || 0;

  const errors = useMemo(() => {
    const errs: string[] = [];
    const counts = new Map<string, number>();
    const register = (raw: string, where: string) => {
      if (!raw) return;
      if (!CARD_RE.test(raw)) {
        errs.push(`${where}: "${raw}" はカード表記として不正です（例: Ac, Td）`);
        return;
      }
      counts.set(raw, (counts.get(raw) ?? 0) + 1);
    };

    boardCards.forEach((c, i) => register(c, `ボード${i + 1}枚目`));
    enabledPlayers.forEach((p) => {
      const c1 = normalizeCard(p.card1);
      const c2 = normalizeCard(p.card2);
      if (c1) register(c1, `${p.position} のカード1`);
      if (c2) register(c2, `${p.position} のカード2`);
      if (c1 && c2 && c1 === c2) errs.push(`${p.position}: 同じカードを2枚指定しています`);
      if ((parseFloat(p.stack) || 0) < 0) errs.push(`${p.position}: スタックが負の値です`);
      if ((parseFloat(p.bet) || 0) < 0) errs.push(`${p.position}: ベット額が負の値です`);
    });
    for (const [card, count] of counts) {
      if (count > 1) errs.push(`カード "${card}" が ${count} 回重複しています`);
    }
    if (boardCards.length > 5) errs.push('ボードは5枚までです');
    if (enabledPlayers.length === 0) errs.push('プレイヤーが1人も選択されていません');

    return errs;
  }, [board, enabledPlayers, boardCards]);

  const tablePlayers = useMemo(
    () =>
      enabledPlayers.map((p) => {
        const c1 = normalizeCard(p.card1);
        const c2 = normalizeCard(p.card2);
        const cards = CARD_RE.test(c1) && CARD_RE.test(c2) ? [c1, c2] : undefined;
        return {
          position: p.position,
          stack: parseFloat(p.stack) || 0,
          bet: parseFloat(p.bet) || undefined,
          isHero: p.position === heroPosition,
          isActive: p.position === activePosition,
          folded: p.folded,
          cards,
        };
      }),
    [enabledPlayers, heroPosition, activePosition],
  );

  const code = useMemo(
    () => generateCode({ street, pot, board: boardCards, players: enabledPlayers, heroPosition, activePosition, caption }),
    [street, pot, boardCards, enabledPlayers, heroPosition, activePosition, caption],
  );

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleReset = () => {
    setStreet('preflop');
    setBoard(['', '', '', '', '']);
    setAutoPot(true);
    setCarriedPot('0');
    setManualPot('0');
    setCaption('');
    setHeroPosition('BB');
    setActivePosition('');
    setPlayers(initialPlayers());
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-6">
      {/* form */}
      <div className="space-y-5">
        <div
          className="rounded-xl border p-4 space-y-3"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <h2 className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
            局面
          </h2>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <span style={{ color: 'var(--color-text-muted)' }}>ストリート</span>
              <select
                value={street}
                onChange={(e) => setStreet(e.target.value as Street)}
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
          </div>

          <div>
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              ボード (最大5枚)
            </span>
            <div className="flex flex-wrap gap-2 mt-1">
              {board.map((c, i) => (
                <CardField key={i} value={c} onChange={(v) => updateBoard(i, v)} />
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={autoPot} onChange={(e) => setAutoPot(e.target.checked)} />
              <span style={{ color: 'var(--color-text-muted)' }}>ポット自動計算</span>
            </label>

            {autoPot ? (
              <label className="flex items-center gap-2 text-sm">
                <span style={{ color: 'var(--color-text-muted)' }}>持ち越し分</span>
                <input
                  value={carriedPot}
                  onChange={(e) => setCarriedPot(e.target.value)}
                  inputMode="decimal"
                  className="w-20 text-sm rounded border px-2 py-1"
                  style={fieldStyle}
                />
              </label>
            ) : (
              <label className="flex items-center gap-2 text-sm">
                <span style={{ color: 'var(--color-text-muted)' }}>ポット(手動)</span>
                <input
                  value={manualPot}
                  onChange={(e) => setManualPot(e.target.value)}
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
                value={heroPosition}
                onChange={(e) => setHeroPosition(e.target.value as Position | '')}
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
                value={activePosition}
                onChange={(e) => setActivePosition(e.target.value as Position | '')}
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
              <input type="checkbox" checked={showHoleCards} onChange={(e) => setShowHoleCards(e.target.checked)} />
              <span style={{ color: 'var(--color-text-muted)' }}>全員のカードを表示</span>
            </label>
          </div>

          <label className="block text-sm">
            <span style={{ color: 'var(--color-text-muted)' }}>キャプション</span>
            <input
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
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
          <h2 className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
            プレイヤー
          </h2>

          <div className="space-y-2">
            {players.map((p) => (
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

          <button
            type="button"
            onClick={handleReset}
            className="text-xs font-semibold px-3 py-1.5 rounded-full border cursor-pointer"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
          >
            リセット
          </button>
        </div>
      </div>

      {/* preview + output */}
      <div className="space-y-5 xl:sticky xl:top-20 xl:self-start">
        <div
          className="rounded-xl border p-4"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <h2 className="text-sm font-bold mb-2" style={{ color: 'var(--color-text)' }}>
            プレビュー
          </h2>
          <PokerTable
            street={street}
            pot={roundNum(pot)}
            board={boardCards}
            players={tablePlayers}
            caption={caption || undefined}
            showHoleCards={showHoleCards}
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
