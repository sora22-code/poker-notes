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
  // Index 0 (hero) sits at the bottom; the rest follow in action order going clockwise, like a real table:
  // the next player to act is on hero's left (screen left), the one before (e.g. SB next to BB) on hero's right.
  const theta = Math.PI / 2 + index * angleStep;
  // Radii come from CSS variables so the oval can switch between portrait (phones) and landscape per breakpoint.
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  // On narrow portrait tables the side seats crowd the board row. --seat-spread (0..1) blends in a flattened
  // curve (|sin|^0.7) that pushes side seats toward the top/bottom while top and bottom seats stay put.
  const spread = Math.sign(sin) * Math.pow(Math.abs(sin), 0.7);
  const y = `(${sin.toFixed(4)} * (1 - var(--seat-spread)) + ${spread.toFixed(4)} * var(--seat-spread))`;
  return { left: `calc(50% + ${cos.toFixed(4)} * var(--seat-rx))`, top: `calc(50% + ${y} * var(--seat-ry))` };
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
    <figure className="not-prose my-6 @container">
      {/* The shape follows the table's own width (container queries), not the viewport: narrow tables (phones, or
          the half-width preview column in the tools) get a portrait oval, since a 16:10 oval leaves seats no room. */}
      <div
        className={`relative w-full rounded-[999px] border-4 ${
          ordered.length > 6
            ? 'aspect-[2/3] [--seat-rx:40%] [--seat-ry:41%] [--seat-spread:0]'
            : ordered.length > 3
              ? 'aspect-[2/3] [--seat-rx:38%] [--seat-ry:39%] [--seat-spread:1] @min-[320px]:aspect-[3/4] @min-[320px]:[--seat-rx:37%] @min-[320px]:[--seat-ry:38%]'
              : 'aspect-[4/5] [--seat-rx:37%] [--seat-ry:39%] [--seat-spread:1]'
        } @md:aspect-[4/3] @md:[--seat-rx:41%] @md:[--seat-ry:38%] @md:[--seat-spread:0] @xl:aspect-[16/10] @xl:[--seat-rx:43%] @xl:[--seat-ry:36%]`}
        style={{ background: 'var(--poker-table-bg)' }}
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
          <div className="flex gap-0.5 sm:gap-1">
            {board.map((c, i) => (
              <PlayingCard key={i} card={c} size="md" />
            ))}
            {Array.from({ length: Math.max(0, 5 - board.length) }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="w-6 h-9 min-[360px]:w-7 min-[360px]:h-10 sm:w-9 sm:h-13 rounded-md border-2 border-dashed opacity-40"
                style={{ borderColor: 'var(--poker-felt-border)' }}
              />
            ))}
          </div>
          <span
            className="text-xs font-bold px-3 py-1 rounded-full"
            style={{ background: 'var(--poker-pot-badge-bg)', color: 'var(--poker-pot-badge-fg)' }}
          >
            POT {pot.toLocaleString()}bb
          </span>
        </div>

        {ordered.map((p, i) => (
          <div
            key={`${p.position}-${i}`}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={seatPosition(i, ordered.length)}
          >
            <Seat player={p} showHoleCards={showHoleCards} compact={ordered.length > 6} />
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
