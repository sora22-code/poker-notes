import type { CardString } from '../../lib/poker/types';

const SUIT_SYMBOL: Record<string, string> = { s: '♠', h: '♥', d: '♦', c: '♣' };
const SUIT_VAR: Record<string, string> = {
  s: 'var(--card-spade)',
  h: 'var(--card-heart)',
  d: 'var(--card-diamond)',
  c: 'var(--card-club)',
};

export interface PlayingCardProps {
  card?: CardString;
  faceDown?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CLASSES: Record<string, string> = {
  sm: 'w-6 h-9 text-[10px]',
  md: 'w-9 h-13 text-sm',
  lg: 'w-12 h-17 text-base',
};

export default function PlayingCard({ card, faceDown, size = 'md' }: PlayingCardProps) {
  const dims = SIZE_CLASSES[size] ?? SIZE_CLASSES.md;

  if (faceDown || !card) {
    return (
      <div
        className={`${dims} rounded-md border shadow-sm flex items-center justify-center`}
        style={{ background: 'var(--card-back-bg)', borderColor: 'var(--card-border)' }}
        aria-label="face-down card"
      >
        <div className="w-2/3 h-2/3 rounded-sm border border-white/40" />
      </div>
    );
  }

  const rank = card[0].toUpperCase();
  const suit = card[1].toLowerCase();
  const color = SUIT_VAR[suit] ?? 'var(--card-spade)';

  return (
    <div
      className={`${dims} rounded-md border shadow-sm flex flex-col items-center justify-center font-bold leading-none select-none`}
      style={{ background: 'var(--card-face-bg)', borderColor: 'var(--card-border)', color }}
    >
      <span>{rank}</span>
      <span className="text-[0.9em]">{SUIT_SYMBOL[suit]}</span>
    </div>
  );
}
