import { initialTableState } from './tableBlock';
import { initialRangeState, nextId } from './rangeBlock';
import type { Street } from '../poker/types';
import type { ArticleDraft, Section, SectionId, SectionItem } from './types';

const SECTION_DEFS: { id: SectionId; label: string; headingText: string }[] = [
  { id: 'preflop', label: 'プリフロップ', headingText: 'プリフロップ' },
  { id: 'flop', label: 'フロップ', headingText: 'フロップ' },
  { id: 'turn', label: 'ターン', headingText: 'ターン' },
  { id: 'river', label: 'リバー', headingText: 'リバー' },
  { id: 'result', label: '結果と振り返り', headingText: '結果と振り返り' },
  { id: 'learning', label: '学び', headingText: '学び' },
];

export function createTextItem(markdown = ''): SectionItem {
  return { id: nextId('item'), kind: 'text', markdown };
}

export function createTableItem(street?: Street): SectionItem {
  return { id: nextId('item'), kind: 'table', state: initialTableState(street) };
}

export function createRangeItem(): SectionItem {
  return { id: nextId('item'), kind: 'range', state: initialRangeState() };
}

export const STREET_SECTION_ORDER: SectionId[] = ['preflop', 'flop', 'turn', 'river'];

export function sectionIdToStreet(id: SectionId): Street | null {
  return (STREET_SECTION_ORDER as string[]).includes(id) ? (id as Street) : null;
}

export function createInitialDraft(): ArticleDraft {
  const today = new Date().toISOString().slice(0, 10);
  return {
    frontmatter: {
      title: '',
      description: '',
      emoji: '🃏',
      category: 'review',
      tags: '',
      slug: '',
      publishedAt: today,
    },
    situation: {
      format: '6-max キャッシュゲーム (NL50)',
      stacks: '全員100bbエフェクティブ',
      heroPosition: 'BB',
      villainPosition: 'BTN',
      villainImage: '',
    },
    sections: SECTION_DEFS.map(
      (def): Section => ({
        id: def.id,
        label: def.label,
        headingText: def.headingText,
        enabled: def.id === 'preflop' || def.id === 'result' || def.id === 'learning',
        items: [createTextItem()],
      }),
    ),
    updatedAt: Date.now(),
  };
}
