import { useState } from 'react';
import PokerTable from '../../poker/PokerTable';
import HandRangeChart from '../../poker/HandRangeChart';
import TableStateForm from './TableStateForm';
import RangeInsertForm from './RangeInsertForm';
import InsertMenu from './InsertMenu';
import { createRangeItem, createTableItem, createTextItem } from '../../../lib/composer/draft';
import { computePot, roundNum, tableStateToBoard, tableStateToPlayers, type TableBlockState } from '../../../lib/composer/tableBlock';
import { parseHighlight } from '../../../lib/composer/rangeBlock';
import type { Section, SectionItem } from '../../../lib/composer/types';

const fieldStyle = { borderColor: 'var(--color-border)', background: 'var(--color-surface-muted)' };

interface StreetSectionProps {
  section: Section;
  onChange: (next: Section) => void;
  tableSeed: TableBlockState;
}

export default function StreetSection({ section, onChange, tableSeed }: StreetSectionProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const setItems = (items: SectionItem[]) => onChange({ ...section, items });

  const addText = () => setItems([...section.items, createTextItem()]);

  const insert = (kind: string) => {
    const item = kind === 'table' ? createTableItem() : createRangeItem();
    if (item.kind === 'table') item.state = tableSeed;
    setItems([...section.items, item]);
    setExpandedId(item.id);
  };

  const updateItem = (id: string, next: SectionItem) => {
    setItems(section.items.map((it) => (it.id === id ? next : it)));
  };
  const removeItem = (id: string) => setItems(section.items.filter((it) => it.id !== id));
  const moveItem = (id: string, dir: -1 | 1) => {
    const idx = section.items.findIndex((it) => it.id === id);
    const swapIdx = idx + dir;
    if (idx < 0 || swapIdx < 0 || swapIdx >= section.items.length) return;
    const items = section.items.slice();
    [items[idx], items[swapIdx]] = [items[swapIdx], items[idx]];
    setItems(items);
  };

  return (
    <div
      className="rounded-xl border p-4 space-y-3"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
    >
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={section.enabled}
          onChange={(e) => onChange({ ...section, enabled: e.target.checked })}
        />
        <span className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>
          {section.label}
        </span>
      </label>

      {section.enabled && (
        <div className="space-y-3">
          <label className="block text-sm">
            <span style={{ color: 'var(--color-text-muted)' }}>見出しテキスト (## の後に続く文字)</span>
            <input
              value={section.headingText}
              onChange={(e) => onChange({ ...section, headingText: e.target.value })}
              className="w-full mt-1 text-sm rounded border px-2 py-1.5"
              style={fieldStyle}
            />
          </label>

          <div className="space-y-3">
            {section.items.map((item, i) => (
              <ItemCard
                key={item.id}
                item={item}
                expanded={expandedId === item.id}
                onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
                onChange={(next) => updateItem(item.id, next)}
                onRemove={() => removeItem(item.id)}
                onMoveUp={i > 0 ? () => moveItem(item.id, -1) : undefined}
                onMoveDown={i < section.items.length - 1 ? () => moveItem(item.id, 1) : undefined}
              />
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={addText}
              className="text-xs font-semibold px-3 py-1.5 rounded-full border cursor-pointer"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
            >
              + テキスト
            </button>
            <InsertMenu
              options={[
                { key: 'table', label: 'テーブル図', icon: '🃏' },
                { key: 'range', label: 'レンジ表', icon: '📊' },
              ]}
              onSelect={insert}
            />
          </div>
        </div>
      )}
    </div>
  );
}

interface ItemCardProps {
  item: SectionItem;
  expanded: boolean;
  onToggle: () => void;
  onChange: (next: SectionItem) => void;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

function ItemCard({ item, expanded, onToggle, onChange, onRemove, onMoveUp, onMoveDown }: ItemCardProps) {
  const kindLabel = item.kind === 'text' ? 'テキスト' : item.kind === 'table' ? 'テーブル図' : 'レンジ表';
  const kindIcon = item.kind === 'text' ? '📝' : item.kind === 'table' ? '🃏' : '📊';

  return (
    <div className="rounded-lg border" style={{ borderColor: 'var(--color-border)' }}>
      <div
        className="flex items-center justify-between px-3 py-1.5 text-xs"
        style={{ background: 'var(--color-surface-muted)', color: 'var(--color-text-muted)' }}
      >
        <span className="font-semibold">
          {kindIcon} {kindLabel}
        </span>
        <div className="flex items-center gap-1">
          {onMoveUp && (
            <button type="button" onClick={onMoveUp} className="px-1.5 cursor-pointer" title="上へ">
              ↑
            </button>
          )}
          {onMoveDown && (
            <button type="button" onClick={onMoveDown} className="px-1.5 cursor-pointer" title="下へ">
              ↓
            </button>
          )}
          {item.kind !== 'text' && (
            <button type="button" onClick={onToggle} className="px-1.5 cursor-pointer">
              {expanded ? '折りたたむ' : '編集'}
            </button>
          )}
          <button type="button" onClick={onRemove} className="px-1.5 cursor-pointer" title="削除">
            ✕
          </button>
        </div>
      </div>

      <div className="p-3">
        {item.kind === 'text' && (
          <textarea
            value={item.markdown}
            onChange={(e) => onChange({ ...item, markdown: e.target.value })}
            placeholder="本文を入力（Markdown可）"
            rows={4}
            className="w-full text-sm rounded border px-2 py-1.5"
            style={fieldStyle}
          />
        )}

        {item.kind === 'table' &&
          (expanded ? (
            <TableStateForm value={item.state} onChange={(state) => onChange({ ...item, state })} />
          ) : (
            <PokerTable
              street={item.state.street}
              pot={roundNum(computePot(item.state))}
              board={tableStateToBoard(item.state)}
              players={tableStateToPlayers(item.state)}
              caption={item.state.caption || undefined}
              showHoleCards={item.state.showHoleCards}
            />
          ))}

        {item.kind === 'range' &&
          (expanded ? (
            <RangeInsertForm value={item.state} onChange={(state) => onChange({ ...item, state })} />
          ) : (
            <HandRangeChart
              title={item.state.title}
              ranges={item.state.groups}
              highlight={parseHighlight(item.state.highlight)}
            />
          ))}
      </div>
    </div>
  );
}
