import type { CardString, PlayerSeat, Street } from '../../lib/poker/types';
import PlayingCard from './PlayingCard';

export type SeatActionKind = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'allin';

export interface ReplaySeat extends PlayerSeat {
  /** The seat's latest action on the current street, shown as a speech bubble. */
  lastAction?: SeatActionKind;
}

export interface ReplayTableProps {
  players: ReplaySeat[];
  board: CardString[];
  pot: number;
  street: Street;
  /** Small text printed on the felt, e.g. "NLH 6-max キャッシュゲーム (NL50)". */
  meta?: string;
  /** Shows the "どうする？" bubble over hero while a question waits for an answer. */
  asking?: boolean;
}

const ACTION_LABEL: Record<SeatActionKind, string> = {
  fold: 'フォールド',
  check: 'チェック',
  call: 'コール',
  bet: 'ベット',
  raise: 'レイズ',
  allin: 'オールイン',
};

/** Bubble colors per action: neutral for passive actions, warm for aggression, purple for all-in. */
export const ACTION_TONE: Record<SeatActionKind, { bg: string; fg: string; border: string }> = {
  fold: { bg: 'var(--replay-bubble-bg)', fg: 'var(--replay-bubble-fg)', border: 'var(--replay-bubble-border)' },
  check: { bg: 'var(--replay-bubble-bg)', fg: '#ffffff', border: 'var(--replay-bubble-border)' },
  call: { bg: 'var(--replay-call)', fg: '#ffffff', border: 'var(--replay-call)' },
  bet: { bg: 'var(--replay-raise)', fg: '#ffffff', border: 'var(--replay-raise)' },
  raise: { bg: 'var(--replay-raise)', fg: '#ffffff', border: 'var(--replay-raise)' },
  allin: { bg: 'var(--replay-allin)', fg: '#ffffff', border: 'var(--replay-allin)' },
};

type Side = 'left' | 'right' | 'top' | 'bottom';

function seatGeometry(index: number, total: number) {
  // Same clockwise order as the article diagrams: hero at the bottom, the next player to act on hero's left.
  const theta = Math.PI / 2 + (index * 2 * Math.PI) / total;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  const at = (rx: number, ry: number) => ({
    left: `calc(50% + ${(cos * rx).toFixed(4)} * var(--seat-rx))`,
    top: `calc(50% + ${(sin * ry).toFixed(4)} * var(--seat-ry))`,
  });
  // Bubbles point toward the middle of the table so they never leave the stage. The top seat's bubble goes to
  // its right: below it would cover the name plate and its chips.
  const side: Side = index === 0 ? 'bottom' : cos > 0.3 ? 'right' : cos < -0.3 || sin < 0 ? 'left' : 'bottom';
  // Chips sit between the seat and the board, pulled in further horizontally so they clear the side seats.
  // Hero's go beside the avatar instead: above it is where the "どうする？" bubble appears.
  // The top seat's chips go beside it too (its bubble is on the right), clear of the upper side seats' bubbles.
  const top = index !== 0 && Math.abs(cos) < 0.3 && sin < 0;
  const chips =
    index === 0
      ? { left: 'calc(50% - 66px)', top: 'calc(50% + var(--seat-ry))' }
      : top
        ? { left: `calc(50% + ${cos.toFixed(4)} * var(--seat-rx) - var(--top-chip))`, top: at(1, 1).top }
        : {
          left: `calc(50% + ${cos.toFixed(4)} * var(--chip-x) * var(--seat-rx))`,
          top: `calc(50% + ${sin.toFixed(4)} * var(--chip-y) * var(--seat-ry))`,
        };
  // Seats below the board drop their bubble to mid-avatar so it stays clear of their own chips above.
  return { seat: at(1, 1), chips, side, low: sin > 0.2 };
}

function ChipIcon() {
  return (
    <span
      aria-hidden
      className="inline-block w-3 h-3 rounded-full shrink-0"
      style={{ background: 'var(--replay-chip)', boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.75)' }}
    />
  );
}

function Avatar({ hero }: { hero: boolean }) {
  if (hero) {
    return <span className="text-[11px] @md:text-xs font-extrabold tracking-wide">あなた</span>;
  }
  return (
    <svg viewBox="0 0 24 24" className="w-[70%] h-[70%] translate-y-[12%]" aria-hidden>
      <circle cx="12" cy="8" r="4.2" fill="currentColor" />
      <path d="M3.5 22c0-4.7 3.8-8.2 8.5-8.2s8.5 3.5 8.5 8.2z" fill="currentColor" />
    </svg>
  );
}

function Bubble({ kind, side, low }: { kind: SeatActionKind; side: Side; low: boolean }) {
  const tone = ACTION_TONE[kind];
  const place: Record<Side, string> = {
    left: `left-[85%] ${low ? 'top-[36%] @lg:top-[45%]' : 'top-0'}`,
    right: `right-[85%] ${low ? 'top-[36%] @lg:top-[45%]' : 'top-0'}`,
    top: 'top-[92%] left-1/2 -translate-x-1/2',
    bottom: 'bottom-[92%] left-1/2 -translate-x-1/2',
  };
  return (
    <span
      key={kind}
      data-bubble
      className={`poker-pop absolute z-20 whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] @md:text-xs font-bold shadow-md ${place[side]}`}
      style={{ background: tone.bg, color: tone.fg, borderColor: tone.border }}
    >
      {ACTION_LABEL[kind]}
    </span>
  );
}

/**
 * 9-handed tables have no room for side bubbles and loose chips, so the action and the chips in front of the
 * player share one small tag on top of the avatar, inside the seat's own footprint.
 */
function CompactTag({ kind, bet }: { kind?: SeatActionKind; bet?: number }) {
  const tone = kind ? ACTION_TONE[kind] : ACTION_TONE.check;
  // No "bb" suffix: the tag has to stay about as wide as the seat (the pot in the middle still says bb).
  const amount = typeof bet === 'number' && bet > 0 ? String(bet) : '';
  const text = kind ? `${ACTION_LABEL[kind]}${amount && kind !== 'fold' ? ` ${amount}` : ''}` : amount;
  if (!text) return null;
  return (
    <span
      key={text}
      data-bubble
      className="poker-pop absolute z-20 -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border px-1.5 text-[9px] @md:text-[11px] font-bold leading-4 shadow-md"
      style={{ background: tone.bg, color: tone.fg, borderColor: tone.border }}
    >
      {text}
    </span>
  );
}

function SeatView({ player, side, low, compact }: { player: ReplaySeat; side: Side; low: boolean; compact: boolean }) {
  const hero = Boolean(player.isHero);
  const ring = player.isActive
    ? 'var(--replay-active)'
    : hero
      ? 'var(--replay-hero)'
      : 'var(--replay-plate-bottom)';
  const size = hero
    ? 'w-12 h-12 @md:w-14 @md:h-14'
    : compact
      ? 'w-9 h-9 @md:w-12 @md:h-12'
      : 'w-10 h-10 @md:w-12 @md:h-12';
  const live = !player.folded;
  const villainCards = !hero && player.cards && player.cards.length > 0;

  return (
    <div className="relative flex flex-col items-center" style={{ opacity: player.folded ? 0.55 : 1, transition: 'opacity 0.3s ease' }}>
      <div className="relative">
        {/* Face-down cards peeking behind live opponents, like at a real table. */}
        {!hero && live && !villainCards && (
          <span aria-hidden className={`absolute -top-1 flex ${side === 'right' ? 'left-[55%]' : 'right-[45%]'}`}>
            {[0, 1].map((i) => (
              <span
                key={i}
                className="block w-3.5 h-5 @md:w-4 @md:h-6 rounded-[3px] border"
                style={{
                  background: 'var(--card-back-bg)',
                  borderColor: 'rgba(255,255,255,0.55)',
                  transform: `rotate(${i ? 14 : 2}deg)`,
                  marginLeft: i ? -8 : 0,
                }}
              />
            ))}
          </span>
        )}
        <div
          className={`${size} relative rounded-full flex items-center justify-center overflow-hidden ${player.isActive ? 'replay-active-ring' : ''}`}
          style={{
            background: hero ? 'var(--replay-hero-avatar)' : 'var(--replay-avatar)',
            color: hero ? '#ffffff' : 'var(--replay-avatar-fg)',
            boxShadow: `0 0 0 3px ${ring}`,
          }}
        >
          <Avatar hero={hero} />
        </div>
        {hero && player.cards && player.cards.length > 0 && (
          <div
            className={`absolute bottom-[-6px] flex z-10 ${
              compact
                ? 'left-[50%] origin-bottom-left @max-[340px]:scale-[0.8]'
                : 'left-[92%] origin-bottom-left scale-[0.8] @min-[300px]:scale-100'
            }`}
          >
            {player.cards.map((c, i) => (
              <div key={i} style={{ transform: `rotate(${i ? 8 : -4}deg)`, marginLeft: i ? (compact ? -4 : -10) : 0 }}>
                <PlayingCard card={c} size={compact ? 'md' : 'lg'} />
              </div>
            ))}
          </div>
        )}
        {villainCards && (
          <div className="absolute left-[70%] -top-2 flex z-10">
            {player.cards!.map((c, i) => (
              <div key={i} style={{ marginLeft: i ? -6 : 0 }}>
                <PlayingCard card={c} size="sm" />
              </div>
            ))}
          </div>
        )}
        {compact ? (
          <CompactTag kind={player.lastAction} bet={player.bet} />
        ) : (
          player.lastAction && <Bubble kind={player.lastAction} side={side} low={low} />
        )}
      </div>
      <div
        className="-mt-1.5 relative z-10 rounded-md overflow-hidden text-center leading-tight min-w-12 @md:min-w-16 shadow"
        style={{ boxShadow: player.isActive ? '0 0 0 2px var(--replay-active)' : undefined }}
      >
        <div className="px-1.5 text-[10px] @md:text-xs font-extrabold" style={{ background: 'var(--replay-plate-top)', color: 'var(--replay-plate-top-fg)' }}>
          {player.position}
        </div>
        <div className="px-1.5 text-[10px] @md:text-xs font-semibold tabular-nums" style={{ background: 'var(--replay-plate-bottom)', color: 'var(--replay-plate-bottom-fg)' }}>
          {typeof player.stack === 'number' ? (`${player.stack}bb`) : '—'}
        </div>
      </div>
    </div>
  );
}

export default function ReplayTable({ players, board, pot, meta, asking = false }: ReplayTableProps) {
  const heroIndex = players.findIndex((p) => p.isHero);
  const ordered = heroIndex > 0 ? [...players.slice(heroIndex), ...players.slice(0, heroIndex)] : players;
  const compact = ordered.length > 6;
  const geometry = ordered.map((_, i) => seatGeometry(i, ordered.length));

  return (
    <div
      className={`relative w-full ${
        compact
          ? 'aspect-[2/3] [--seat-rx:39%] [--seat-ry:40%] @max-[300px]:[--seat-rx:36%]'
          : ordered.length > 3
            ? 'aspect-[3/4] [--seat-rx:38%] [--seat-ry:39%] @max-[300px]:aspect-[2/3]'
            : 'aspect-[4/5] [--seat-rx:38%] [--seat-ry:39%]'
      } [--chip-x:0.45] [--chip-y:0.62] [--top-chip:62px] @md:[--top-chip:80px] @max-[300px]:[--chip-x:0.3] @lg:[--chip-x:0.6] @xl:[--chip-x:0.66] @lg:aspect-[16/11] @lg:[--seat-rx:42%] @lg:[--seat-ry:38%]`}
    >
      {/* Rail + felt. */}
      <div
        className="absolute inset-x-[7%] inset-y-[6%] @lg:inset-x-[5%] @lg:inset-y-[8%] rounded-[999px]"
        style={{
          background: 'var(--replay-rail)',
          boxShadow: 'inset 0 -4px 0 var(--replay-rail-edge), 0 10px 24px rgba(0,0,0,0.35)',
        }}
      >
        <div
          className="absolute inset-[4.5%] rounded-[999px]"
          style={{
            background: 'radial-gradient(ellipse at 50% 40%, var(--replay-felt-1), var(--replay-felt-2) 75%)',
            boxShadow: 'inset 0 0 0 2px var(--replay-felt-line), inset 0 6px 18px rgba(0,0,0,0.35)',
          }}
        />
      </div>

      <div data-center className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 @md:gap-2 pointer-events-none">
        {meta && (
          <span className="hidden @lg:block max-w-[30%] text-center text-[11px] font-semibold leading-tight" style={{ color: 'var(--replay-felt-text)' }}>
            {meta}
          </span>
        )}
        <div className="flex gap-0.5 @md:gap-1">
          {board.map((c, i) => (
            <div key={`${c}-${i}`} className="poker-pop">
              <PlayingCard card={c} size="md" />
            </div>
          ))}
          {Array.from({ length: Math.max(0, 5 - board.length) }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="w-6 h-9 min-[360px]:w-7 min-[360px]:h-10 sm:w-9 sm:h-13 rounded-md border"
              style={{ borderColor: 'var(--replay-felt-line)', background: 'rgba(255,255,255,0.04)' }}
            />
          ))}
        </div>
        <span
          className="flex items-center gap-1.5 rounded-full px-3 py-0.5 text-xs @md:text-sm font-extrabold shadow"
          style={{ background: '#ffffff', color: '#0f172a' }}
        >
          <ChipIcon />
          ポット {pot}bb
        </span>
      </div>

      {ordered.map((p, i) =>
        !compact && typeof p.bet === 'number' && p.bet > 0 ? (
          <span
            key={`chips-${p.position}`}
            data-chips
            className="poker-pop absolute z-0 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] @md:text-xs font-bold tabular-nums whitespace-nowrap"
            style={{ ...geometry[i].chips, background: 'var(--replay-chip-pill)', color: '#ffffff' }}
          >
            <ChipIcon />
            {p.bet}bb
          </span>
        ) : null,
      )}

      {ordered.map((p, i) => (
        <div
          key={`${p.position}-${i}`}
          data-seat={p.position}
          className={`absolute -translate-x-1/2 -translate-y-1/2 ${p.isHero ? 'z-30' : 'z-10'}`}
          style={geometry[i].seat}
        >
          {p.isHero && asking && (
            <span
              data-bubble
              data-asking
              className={`poker-pop absolute ${compact ? 'bottom-[calc(100%-4px)]' : 'bottom-[calc(100%+6px)]'} left-1/2 -translate-x-1/2 z-30 whitespace-nowrap rounded-xl px-3 py-1 text-sm @max-[300px]:px-2 @max-[300px]:py-0.5 @max-[300px]:text-xs @md:text-base font-extrabold shadow-lg`}
              style={{ background: '#ffffff', color: '#0f172a' }}
            >
              どうする？
              <span aria-hidden className="absolute left-1/2 -bottom-1 w-2.5 h-2.5 -translate-x-1/2 rotate-45" style={{ background: '#ffffff' }} />
            </span>
          )}
          <SeatView player={asking && p.isHero ? { ...p, lastAction: undefined, bet: undefined } : p} side={geometry[i].side} low={geometry[i].low} compact={compact} />
        </div>
      ))}
    </div>
  );
}
