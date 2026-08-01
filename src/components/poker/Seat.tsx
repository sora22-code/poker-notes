import type { PlayerSeat } from '../../lib/poker/types';
import PlayingCard from './PlayingCard';

export interface SeatProps {
  player: PlayerSeat;
  showHoleCards?: boolean;
}

export default function Seat({ player, showHoleCards = true }: SeatProps) {
  const ringStyle = player.isHero
    ? { boxShadow: `0 0 0 2px var(--poker-seat-hero-ring)` }
    : player.isActive
      ? { boxShadow: `0 0 0 2px var(--poker-seat-active-ring)` }
      : {};

  return (
    <div
      className="flex flex-col items-center gap-1"
      style={{ opacity: player.folded ? 'var(--poker-seat-fold-opacity)' : 1 }}
    >
      {typeof player.bet === 'number' && player.bet > 0 && (
        <span
          className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
          style={{ background: 'var(--poker-bet-badge-bg)', color: 'var(--poker-bet-badge-fg)' }}
        >
          {player.bet.toLocaleString()}
        </span>
      )}

      <div
        className="rounded-xl border px-3 py-2 flex flex-col items-center gap-1.5 min-w-20"
        style={{
          background: 'var(--poker-seat-bg)',
          borderColor: 'var(--poker-seat-border)',
          ...ringStyle,
        }}
      >
        <div className="flex items-center gap-1">
          <span className="text-xs font-bold tracking-wide" style={{ color: 'var(--color-text)' }}>
            {player.position}
          </span>
          {player.isHero && (
            <span
              className="text-[9px] font-semibold px-1 rounded"
              style={{ background: 'var(--color-accent-soft)', color: 'var(--color-accent)' }}
            >
              HERO
            </span>
          )}
        </div>

        <div className="flex gap-0.5">
          {player.cards && player.cards.length > 0 ? (
            showHoleCards ? (
              player.cards.map((c, i) => <PlayingCard key={i} card={c} size="sm" />)
            ) : (
              player.cards.map((_, i) => <PlayingCard key={i} faceDown size="sm" />)
            )
          ) : (
            <div className="h-9" />
          )}
        </div>

        {typeof player.stack === 'number' && (
          <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
            {player.stack.toLocaleString()}
          </span>
        )}
      </div>
    </div>
  );
}
