import type { CardString, PlayerSeat, Street } from '../../lib/poker/types';
import PlayingCard from './PlayingCard';
import Seat from './Seat';

export interface PokerTableProps {
  players: PlayerSeat[];
  board?: CardString[];
  pot: number;
  street?: Street;
  caption?: string;
  showHoleCards?: boolean;
}

const STREET_LABEL: Record<Street, string> = {
  preflop: 'プリフロップ',
  flop: 'フロップ',
  turn: 'ターン',
  river: 'リバー',
};

function seatPosition(index: number, total: number) {
  const angleStep = (2 * Math.PI) / total;
  // index 0 sits at the bottom (90deg / PI/2), seats fan out clockwise from there.
  const theta = Math.PI / 2 - index * angleStep;
  const rx = 43;
  const ry = 36;
  const x = 50 + rx * Math.cos(theta);
  const y = 50 + ry * Math.sin(theta);
  return { left: `${x}%`, top: `${y}%` };
}

export default function PokerTable({
  players,
  board = [],
  pot,
  street,
  caption,
  showHoleCards = true,
}: PokerTableProps) {
  const heroIndex = players.findIndex((p) => p.isHero);
  const ordered = heroIndex > 0 ? [...players.slice(heroIndex), ...players.slice(0, heroIndex)] : players;

  return (
    <figure className="not-prose my-6">
      <div
        className="relative w-full rounded-[999px] border-4"
        style={{
          aspectRatio: '16 / 10',
          background: 'var(--poker-table-bg)',
        }}
      >
        <div
          className="absolute inset-[9%] rounded-[999px] border-2"
          style={{ background: 'var(--poker-felt)', borderColor: 'var(--poker-felt-border)' }}
        />

        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          {street && (
            <span className="text-xs font-bold tracking-wide" style={{ color: 'var(--poker-felt-border)' }}>
              {STREET_LABEL[street]}
            </span>
          )}
          <div className="flex gap-1">
            {board.map((c, i) => (
              <PlayingCard key={i} card={c} size="md" />
            ))}
            {Array.from({ length: Math.max(0, 5 - board.length) }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="w-9 h-13 rounded-md border-2 border-dashed opacity-40"
                style={{ borderColor: 'var(--poker-felt-border)' }}
              />
            ))}
          </div>
          <span
            className="text-xs font-bold px-3 py-1 rounded-full"
            style={{ background: 'var(--poker-pot-badge-bg)', color: 'var(--poker-pot-badge-fg)' }}
          >
            POT {pot.toLocaleString()}
          </span>
        </div>

        {ordered.map((p, i) => (
          <div
            key={`${p.position}-${i}`}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={seatPosition(i, ordered.length)}
          >
            <Seat player={p} showHoleCards={showHoleCards} />
          </div>
        ))}
      </div>
      {caption && (
        <figcaption className="text-center text-sm mt-2" style={{ color: 'var(--color-text-muted)' }}>
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
