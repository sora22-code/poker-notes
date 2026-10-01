import { useMemo, useState } from 'react';
import HandSetupForm from './hand/HandSetupForm';
import BoardInput from './hand/BoardInput';
import StreetActionsPanel from './hand/StreetActionsPanel';
import TableViewControls, { type TableViewSettings } from './hand/TableViewControls';
import {
  errorBoxStyle,
  mutedTextStyle,
  panelStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
  warningBoxStyle,
} from './hand/styles';
import { actionLineCode, pokerTableCode } from '../../lib/composer/codegen';
import { lastReachedStreet } from '../../lib/composer/draft';
import {
  STREET_LABEL,
  STREET_ORDER,
  computeHand,
  createEmptyHand,
  pruneHand,
  tableView,
  validateHand,
  type HandInput,
} from '../../lib/poker/nlh';
import type { Street } from '../../lib/poker/types';

const tabButton = 'text-xs font-semibold px-3 py-1.5 rounded-full cursor-pointer';

export default function HandEditor() {
  const [hand, setHand] = useState<HandInput>(createEmptyHand);
  const [notice, setNotice] = useState<string | null>(null);
  const [pickedStreet, setPickedStreet] = useState<Street | null>(null);
  const [settings, setSettings] = useState<Omit<TableViewSettings, 'street'>>({
    timing: 'auto',
    showFolded: true,
    showVillainCards: false,
    caption: '',
  });
  const [output, setOutput] = useState<'table' | 'actions'>('table');
  const [copied, setCopied] = useState(false);

  const result = useMemo(() => computeHand(hand), [hand]);
  const errors = useMemo(() => validateHand(hand, result), [hand, result]);
  // Follow the latest street until the author explicitly picks one to draw.
  const street = pickedStreet && result.streets[pickedStreet].reached ? pickedStreet : lastReachedStreet(result);
  const view = tableView(hand, result, street, settings.timing, settings);
  const code =
    output === 'table'
      ? view
        ? pokerTableCode(view, settings.caption)
        : ''
      : actionLineCode(result.streets[street]) || '（このストリートにはまだアクションがありません）';

  const updateHand = (next: HandInput) => {
    const { input, removed } = pruneHand(next);
    setHand(input);
    setNotice(removed > 0 ? `前提が変わったため、成り立たなくなったアクションを ${removed} 件取り消しました。` : null);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-6">
      <div className="space-y-5 min-w-0">
        <HandSetupForm value={hand.setup} onChange={(setup) => updateHand({ ...hand, setup })} />

        {notice && (
          <div className="rounded-lg border-l-4 p-3 text-sm" style={warningBoxStyle}>
            {notice}
          </div>
        )}

        {STREET_ORDER.filter((s) => result.streets[s].reached).map((s) => (
          <div key={s} className="rounded-xl border p-4 space-y-3" style={panelStyle}>
            <h2 className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
              {STREET_LABEL[s]}
            </h2>
            <BoardInput street={s} boards={hand.boards} onChange={(boards) => updateHand({ ...hand, boards })} />
            <StreetActionsPanel
              input={hand}
              result={result}
              street={s}
              onChange={(actions) => updateHand({ ...hand, actions: { ...hand.actions, [s]: actions } })}
            />
          </div>
        ))}

        <button
          type="button"
          onClick={() => {
            setHand(createEmptyHand());
            setPickedStreet(null);
            setNotice(null);
          }}
          className="text-xs font-semibold px-3 py-1.5 rounded-full border cursor-pointer"
          style={secondaryButtonStyle}
        >
          最初からやり直す
        </button>
      </div>

      <div className="space-y-4 min-w-0 xl:sticky xl:top-20 xl:self-start">
        <div className="rounded-xl border p-4 space-y-3" style={panelStyle}>
          <h2 className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
            テーブル図
          </h2>
          <TableViewControls
            input={hand}
            result={result}
            streetSelectable
            value={{ ...settings, street }}
            onChange={({ street: nextStreet, ...rest }) => {
              if (nextStreet !== street) setPickedStreet(nextStreet);
              setSettings(rest);
            }}
          />
        </div>

        {errors.length > 0 && (
          <div className="rounded-lg border-l-4 p-3 text-sm space-y-1" style={errorBoxStyle}>
            {errors.map((e) => (
              <p key={e}>{e}</p>
            ))}
          </div>
        )}

        <div className="rounded-xl border p-4 space-y-3" style={panelStyle}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-1.5" role="tablist">
              {(['table', 'actions'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={output === t}
                  onClick={() => setOutput(t)}
                  className={tabButton}
                  style={output === t ? primaryButtonStyle : secondaryButtonStyle}
                >
                  {t === 'table' ? 'テーブル図のMDX' : `アクションライン(${STREET_LABEL[street]})のMDX`}
                </button>
              ))}
            </div>
            <button type="button" onClick={handleCopy} className={tabButton} style={primaryButtonStyle}>
              {copied ? 'コピーしました' : 'コピー'}
            </button>
          </div>
          <pre
            className="text-xs font-mono rounded-lg p-3 overflow-x-auto"
            style={{ background: 'var(--code-bg)', color: 'var(--code-fg)' }}
          >
            {code}
          </pre>
          <p className="text-[11px]" style={mutedTextStyle}>
            記事全体を書く場合は「記事コンポーザー」を使うと、ストリートごとの図とアクションラインがまとめて入ります。
          </p>
        </div>
      </div>
    </div>
  );
}
