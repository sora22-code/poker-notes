import { useState } from 'react';
import ActionLine from '../../poker/ActionLine';
import HandRangeChart from '../../poker/HandRangeChart';
import RangeInsertForm from './RangeInsertForm';
import InsertMenu from './InsertMenu';
import BoardInput from '../hand/BoardInput';
import StreetActionsPanel from '../hand/StreetActionsPanel';
import TableViewControls from '../hand/TableViewControls';
import { fieldStyle, mutedTextStyle, panelStyle, secondaryButtonStyle } from '../hand/styles';
import {
  createActionsItem,
  createRangeItem,
  createTableItem,
  createTextItem,
  lastReachedStreet,
  sectionIdToStreet,
} from '../../../lib/composer/draft';
import { parseHighlight } from '../../../lib/composer/rangeBlock';
import { STREET_LABEL, STREET_ORDER, actionLineSteps, type HandInput, type HandResult } from '../../../lib/poker/nlh';
import type { Section, SectionItem } from '../../../lib/composer/types';

interface StreetSectionProps {
  section: Section;
  onChange: (next: Section) => void;
  input: HandInput;
  result: HandResult;
  onHandChange: (next: HandInput) => void;
}

function unreachedReason(section: Section, input: HandInput, result: HandResult): string {
  const street = sectionIdToStreet(section.id);
  if (!street) return '';
  const idx = STREET_ORDER.indexOf(street);
  if (idx < STREET_ORDER.indexOf(input.setup.startStreet)) {
    return `「${STREET_LABEL[input.setup.startStreet]}から入力」の設定のため省略されます。`;
  }
  if (result.endedByFold) return '全員フォールドでハンドが終了したため、このストリートはありません。';
  if (result.error) return '入力エラーを解消すると入力できます。';
  return `${STREET_LABEL[STREET_ORDER[idx - 1]]}のアクションを最後まで入力すると書けるようになります。`;
}

export default function StreetSection({ section, onChange, input, result, onHandChange }: StreetSectionProps) {
  const street = sectionIdToStreet(section.id);
  const reached = street ? result.streets[street].reached : true;
  const setItems = (items: SectionItem[]) => onChange({ ...section, items });

  if (!reached) {
    return (
      <div className="rounded-xl border px-4 py-3" style={{ ...panelStyle, opacity: 0.7 }}>
        <span className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>
          {section.label}
        </span>
        <span className="ml-2 text-xs" style={mutedTextStyle}>
          {unreachedReason(section, input, result)}
        </span>
      </div>
    );
  }

  const insertOptions = street
    ? [
        { key: 'table', label: 'テーブル図', icon: '🃏' },
        { key: 'actions', label: 'アクションライン', icon: '➡️' },
        { key: 'range', label: 'レンジ表', icon: '📊' },
      ]
    : [
        { key: 'table', label: 'テーブル図', icon: '🃏' },
        { key: 'range', label: 'レンジ表', icon: '📊' },
      ];

  const insert = (kind: string) => {
    const target = street ?? lastReachedStreet(result);
    const item =
      kind === 'table' ? createTableItem(target) : kind === 'actions' ? createActionsItem(target) : createRangeItem();
    setItems([...section.items, item]);
  };

  const updateItem = (id: string, next: SectionItem) => setItems(section.items.map((it) => (it.id === id ? next : it)));
  const removeItem = (id: string) => setItems(section.items.filter((it) => it.id !== id));
  const moveItem = (id: string, dir: -1 | 1) => {
    const idx = section.items.findIndex((it) => it.id === id);
    const swap = idx + dir;
    if (idx < 0 || swap < 0 || swap >= section.items.length) return;
    const items = section.items.slice();
    [items[idx], items[swap]] = [items[swap], items[idx]];
    setItems(items);
  };

  return (
    <div className="rounded-xl border p-4 space-y-3" style={panelStyle}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>
          {section.label}
        </span>
        <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={mutedTextStyle}>
          <input
            type="checkbox"
            checked={section.enabled}
            onChange={(e) => onChange({ ...section, enabled: e.target.checked })}
          />
          記事に含める
        </label>
      </div>

      {street && (
        <div className="space-y-3">
          <BoardInput
            street={street}
            boards={input.boards}
            onChange={(boards) => onHandChange({ ...input, boards })}
          />
          <StreetActionsPanel
            input={input}
            result={result}
            street={street}
            onChange={(actions) => onHandChange({ ...input, actions: { ...input.actions, [street]: actions } })}
          />
        </div>
      )}

      {section.enabled && (
        <div className="space-y-3">
          <label className="block text-sm">
            <span style={mutedTextStyle}>見出し</span>
            <input
              value={section.headingText}
              onChange={(e) => onChange({ ...section, headingText: e.target.value })}
              placeholder={`例: ${section.label}: AJoはコールかフォールドか`}
              className="w-full mt-1 text-sm rounded border px-2 py-1.5"
              style={fieldStyle}
            />
          </label>

          {section.items.map((item, i) => (
            <ItemCard
              key={item.id}
              item={item}
              input={input}
              result={result}
              streetSelectable={!street}
              onChange={(next) => updateItem(item.id, next)}
              onRemove={() => removeItem(item.id)}
              onMoveUp={i > 0 ? () => moveItem(item.id, -1) : undefined}
              onMoveDown={i < section.items.length - 1 ? () => moveItem(item.id, 1) : undefined}
            />
          ))}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setItems([...section.items, createTextItem()])}
              className="text-xs font-semibold px-3 py-1.5 rounded-full border cursor-pointer"
              style={secondaryButtonStyle}
            >
              + テキスト
            </button>
            <InsertMenu options={insertOptions} onSelect={insert} />
          </div>
        </div>
      )}
    </div>
  );
}

interface ItemCardProps {
  item: SectionItem;
  input: HandInput;
  result: HandResult;
  streetSelectable: boolean;
  onChange: (next: SectionItem) => void;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

const ITEM_META: Record<SectionItem['kind'], { icon: string; label: string }> = {
  text: { icon: '📝', label: 'テキスト' },
  table: { icon: '🃏', label: 'テーブル図' },
  actions: { icon: '➡️', label: 'アクションライン' },
  range: { icon: '📊', label: 'レンジ表' },
};

function ItemCard({ item, input, result, streetSelectable, onChange, onRemove, onMoveUp, onMoveDown }: ItemCardProps) {
  const [editingRange, setEditingRange] = useState(false);
  const meta = ITEM_META[item.kind];

  return (
    <div className="rounded-lg border" style={{ borderColor: 'var(--color-border)' }}>
      <div
        className="flex items-center justify-between px-3 py-1.5 text-xs"
        style={{ background: 'var(--color-surface-muted)', color: 'var(--color-text-muted)' }}
      >
        <span className="font-semibold">
          {meta.icon} {meta.label}
          {(item.kind === 'table' || item.kind === 'actions') && ` ・ ${STREET_LABEL[item.street]}`}
        </span>
        <div className="flex items-center gap-1">
          {item.kind === 'range' && (
            <button type="button" onClick={() => setEditingRange((v) => !v)} className="px-1.5 cursor-pointer">
              {editingRange ? '完了' : '編集'}
            </button>
          )}
          {onMoveUp && (
            <button type="button" onClick={onMoveUp} className="px-1.5 cursor-pointer" aria-label="上へ移動">
              ↑
            </button>
          )}
          {onMoveDown && (
            <button type="button" onClick={onMoveDown} className="px-1.5 cursor-pointer" aria-label="下へ移動">
              ↓
            </button>
          )}
          <button type="button" onClick={onRemove} className="px-1.5 cursor-pointer" aria-label="削除">
            ✕
          </button>
        </div>
      </div>

      <div className="p-3">
        {item.kind === 'text' && (
          <>
            <textarea
              value={item.markdown}
              onChange={(e) => onChange({ ...item, markdown: e.target.value })}
              placeholder="本文。なぜそのアクションを選んだか、何を考えたかを書きます"
              rows={4}
              className="w-full text-sm rounded border px-2 py-1.5"
              style={fieldStyle}
            />
            <p className="text-[11px] mt-1" style={mutedTextStyle}>
              Markdownが使えます: **太字**、「- 」で箇条書き、空行で段落を分ける
            </p>
          </>
        )}

        {item.kind === 'table' && (
          <TableViewControls
            input={input}
            result={result}
            streetSelectable={streetSelectable}
            value={item}
            onChange={(settings) => onChange({ ...item, ...settings })}
          />
        )}

        {item.kind === 'actions' &&
          (actionLineSteps(result.streets[item.street]).length > 0 ? (
            <ActionLine street={STREET_LABEL[item.street]} actions={actionLineSteps(result.streets[item.street])} />
          ) : (
            <p className="text-sm" style={mutedTextStyle}>
              上の「{STREET_LABEL[item.street]}のアクション」を入力すると、ここに自動で表示されます。
            </p>
          ))}

        {item.kind === 'range' && (
          <div className="space-y-3">
            {editingRange && <RangeInsertForm value={item.state} onChange={(state) => onChange({ ...item, state })} />}
            <HandRangeChart
              title={item.state.title}
              ranges={item.state.groups}
              highlight={parseHighlight(item.state.highlight)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
