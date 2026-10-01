import CardField from './CardField';
import { mutedTextStyle } from './styles';
import type { HandBoards } from '../../../lib/poker/nlh';
import type { Street } from '../../../lib/poker/types';

interface BoardInputProps {
  street: Street;
  boards: HandBoards;
  onChange: (next: HandBoards) => void;
}

/** Only the cards that come out on this street; earlier streets' cards are shown for context. */
export default function BoardInput({ street, boards, onChange }: BoardInputProps) {
  if (street === 'preflop') return null;

  return (
    <div>
      <span className="text-xs font-semibold" style={mutedTextStyle}>
        {street === 'flop' ? 'フロップの3枚' : street === 'turn' ? 'ターンの1枚' : 'リバーの1枚'}
      </span>
      <div className="flex flex-wrap items-center gap-2 mt-1">
        {street === 'flop' &&
          boards.flop.map((c, i) => (
            <CardField
              key={i}
              label={`フロップ${i + 1}枚目`}
              value={c}
              onChange={(v) => onChange({ ...boards, flop: boards.flop.map((x, j) => (j === i ? v : x)) })}
            />
          ))}
        {street === 'turn' && (
          <CardField label="ターン" value={boards.turn} onChange={(v) => onChange({ ...boards, turn: v })} />
        )}
        {street === 'river' && (
          <CardField label="リバー" value={boards.river} onChange={(v) => onChange({ ...boards, river: v })} />
        )}
      </div>
    </div>
  );
}
