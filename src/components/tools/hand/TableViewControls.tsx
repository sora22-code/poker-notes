import PokerTable from '../../poker/PokerTable';
import { fieldStyle, mutedTextStyle } from './styles';
import { isValidCard } from '../../../lib/poker/cards';
import {
  STREET_LABEL,
  STREET_ORDER,
  describeAction,
  tableView,
  type HandInput,
  type HandResult,
  type TableTiming,
} from '../../../lib/poker/nlh';
import type { Street } from '../../../lib/poker/types';

export interface TableViewSettings {
  street: Street;
  timing: TableTiming;
  showFolded: boolean;
  showVillainCards: boolean;
  caption: string;
}

interface TableViewControlsProps {
  input: HandInput;
  result: HandResult;
  value: TableViewSettings;
  onChange: (next: TableViewSettings) => void;
  streetSelectable?: boolean;
}

function encodeTiming(t: TableTiming): string {
  return typeof t === 'number' ? `after:${t}` : t;
}

function decodeTiming(raw: string): TableTiming {
  if (raw.startsWith('after:')) return Number(raw.slice('after:'.length));
  return raw as TableTiming;
}

export function timingOptions(result: HandResult, street: Street): { value: TableTiming; label: string }[] {
  const res = result.streets[street];
  const options: { value: TableTiming; label: string }[] = [
    { value: 'auto', label: 'Heroの判断直前（おすすめ）' },
    { value: 'start', label: `${STREET_LABEL[street]}の開始時` },
  ];
  for (let i = 1; i < res.actions.length; i++) {
    options.push({ value: i, label: `「${describeAction(res.actions[i - 1])}」の後` });
  }
  options.push({ value: 'end', label: `${STREET_LABEL[street]}の終了時` });
  return options;
}

export default function TableViewControls({ input, result, value, onChange, streetSelectable }: TableViewControlsProps) {
  const patch = (p: Partial<TableViewSettings>) => onChange({ ...value, ...p });
  const reachedStreets = STREET_ORDER.filter((s) => result.streets[s].reached);
  const view = tableView(input, result, value.street, value.timing, value);
  const hasVillainCards = input.setup.villainCards.filter(isValidCard).length === 2;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        {streetSelectable && (
          <label className="flex items-center gap-2 text-sm">
            <span style={mutedTextStyle}>ストリート</span>
            <select
              value={value.street}
              onChange={(e) => patch({ street: e.target.value as Street, timing: 'auto' })}
              className="text-sm rounded border px-2 py-1"
              style={fieldStyle}
            >
              {reachedStreets.map((s) => (
                <option key={s} value={s}>
                  {STREET_LABEL[s]}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="flex items-center gap-2 text-sm">
          <span style={mutedTextStyle}>表示タイミング</span>
          <select
            value={encodeTiming(value.timing)}
            onChange={(e) => patch({ timing: decodeTiming(e.target.value) })}
            className="text-sm rounded border px-2 py-1 max-w-64"
            style={fieldStyle}
          >
            {timingOptions(result, value.street).map((o) => (
              <option key={encodeTiming(o.value)} value={encodeTiming(o.value)}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-sm">
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={value.showFolded} onChange={(e) => patch({ showFolded: e.target.checked })} />
          <span style={mutedTextStyle}>フォールドした人も表示</span>
        </label>
        {hasVillainCards && (
          <label className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={value.showVillainCards}
              onChange={(e) => patch({ showVillainCards: e.target.checked })}
            />
            <span style={mutedTextStyle}>Villainのカードを公開</span>
          </label>
        )}
      </div>

      <input
        value={value.caption}
        onChange={(e) => patch({ caption: e.target.value })}
        placeholder="キャプション（任意）例: A-7-3 レインボー。BTNの小さいCベットに直面"
        className="w-full text-sm rounded border px-2 py-1.5"
        style={fieldStyle}
      />

      {view ? (
        <PokerTable
          street={view.street}
          pot={view.pot}
          board={view.board}
          players={view.players}
          caption={value.caption || undefined}
        />
      ) : (
        <p className="text-sm" style={mutedTextStyle}>
          {STREET_LABEL[value.street]}まで進んでいないため、図を表示できません。
        </p>
      )}
    </div>
  );
}
