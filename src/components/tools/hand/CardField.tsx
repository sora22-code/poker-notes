import { RANKS } from '../../../lib/poker/types';
import { SUIT_OPTIONS, isValidCard, normalizeCard } from '../../../lib/poker/cards';
import { fieldStyle } from './styles';

interface CardFieldProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

/** One card: free text ("As") plus rank/suit pickers for people who don't know the notation yet. */
export default function CardField({ value, onChange, label }: CardFieldProps) {
  const rank = value ? (value[0]?.toUpperCase() ?? '') : '';
  const suit = value ? (value[1]?.toLowerCase() ?? '') : '';
  const invalid = value.length > 0 && !isValidCard(value);

  return (
    <div className="flex items-center gap-1" title="ランク(2〜9,T,J,Q,K,A)+スート(s/h/d/c)。例: As, Td">
      <input
        value={value}
        onChange={(e) => onChange(normalizeCard(e.target.value).slice(0, 2))}
        placeholder="As"
        aria-label={label ?? 'カード'}
        className="w-11 text-xs font-mono px-1.5 py-1 rounded border text-center"
        style={{ ...fieldStyle, ...(invalid ? { borderColor: 'var(--color-poker-raise)' } : {}) }}
      />
      <select
        value={rank}
        onChange={(e) => onChange((e.target.value || '') + suit)}
        className="text-xs rounded border py-1"
        style={fieldStyle}
        aria-label={`${label ?? 'カード'}のランク`}
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
        style={fieldStyle}
        aria-label={`${label ?? 'カード'}のスート`}
      >
        <option value="">-</option>
        {SUIT_OPTIONS.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
    </div>
  );
}
