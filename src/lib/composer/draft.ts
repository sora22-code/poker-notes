import { createEmptyHand, STREET_ORDER, type HandResult } from '../poker/nlh';
import { initialRangeState, nextId } from './rangeBlock';
import type { Street } from '../poker/types';
import type { ArticleDraft, Section, SectionId, SectionItem, TableItem } from './types';

const SECTION_DEFS: { id: SectionId; label: string }[] = [
  { id: 'preflop', label: 'プリフロップ' },
  { id: 'flop', label: 'フロップ' },
  { id: 'turn', label: 'ターン' },
  { id: 'river', label: 'リバー' },
  { id: 'result', label: '結果と振り返り' },
  { id: 'learning', label: '学び' },
];

export function sectionIdToStreet(id: SectionId): Street | null {
  return (STREET_ORDER as string[]).includes(id) ? (id as Street) : null;
}

export function createTextItem(markdown = ''): SectionItem {
  return { id: nextId('item'), kind: 'text', markdown };
}

export function createTableItem(street: Street): TableItem {
  return {
    id: nextId('item'),
    kind: 'table',
    street,
    timing: 'auto',
    // Preflop diagrams read better with every seat visible; postflop, folded seats are just noise.
    showFolded: street === 'preflop',
    showVillainCards: false,
    caption: '',
  };
}

export function createActionsItem(street: Street): SectionItem {
  return { id: nextId('item'), kind: 'actions', street };
}

export function createRangeItem(): SectionItem {
  return { id: nextId('item'), kind: 'range', state: initialRangeState() };
}

/** Street sections start with the structure every hand review uses: action line, diagram, then prose. */
function defaultItems(id: SectionId): SectionItem[] {
  const street = sectionIdToStreet(id);
  if (!street) return [createTextItem()];
  return [createActionsItem(street), createTableItem(street), createTextItem()];
}

export function createInitialDraft(): ArticleDraft {
  return {
    version: 2,
    frontmatter: {
      title: '',
      description: '',
      emoji: '🃏',
      category: 'review',
      tags: '',
      slug: '',
      publishedAt: new Date().toISOString().slice(0, 10),
    },
    hand: createEmptyHand(),
    villainImage: '',
    sections: SECTION_DEFS.map(
      (def): Section => ({
        id: def.id,
        label: def.label,
        headingText: def.label,
        enabled: true,
        items: defaultItems(def.id),
      }),
    ),
    updatedAt: Date.now(),
  };
}

/** A section is part of the article only if it's switched on and, for streets, the hand actually got there. */
export function isSectionVisible(section: Section, result: HandResult): boolean {
  if (!section.enabled) return false;
  const street = sectionIdToStreet(section.id);
  return street ? result.streets[street].reached : true;
}

export function lastReachedStreet(result: HandResult): Street {
  return [...STREET_ORDER].reverse().find((s) => result.streets[s].reached) ?? 'preflop';
}
