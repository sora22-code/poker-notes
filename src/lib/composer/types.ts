import type { Street } from '../poker/types';
import type { HandInput, TableTiming } from '../poker/nlh';
import type { RangeBlockState } from './rangeBlock';

export type SectionId = 'preflop' | 'flop' | 'turn' | 'river' | 'result' | 'learning';

export interface TableItem {
  id: string;
  kind: 'table';
  street: Street;
  timing: TableTiming;
  showFolded: boolean;
  showVillainCards: boolean;
  caption: string;
}

export type SectionItem =
  | { id: string; kind: 'text'; markdown: string }
  | TableItem
  | { id: string; kind: 'actions'; street: Street }
  | { id: string; kind: 'range'; state: RangeBlockState };

export interface Section {
  id: SectionId;
  label: string;
  enabled: boolean;
  headingText: string;
  items: SectionItem[];
}

export interface Frontmatter {
  title: string;
  description: string;
  emoji: string;
  category: 'strategy' | 'review';
  tags: string;
  slug: string;
  publishedAt: string;
}

/** Author settings for one hero decision, keyed by point id (`${street}-${actionIndex}`). */
export interface QuizPointDraft {
  enabled: boolean;
  correct: string[];
  prompt: string;
  explanation: string;
}

export interface QuizDraft {
  /** Where the interactive replayer goes: right after 状況設定 (before spoilers), at the end, or nowhere. */
  placement: 'top' | 'bottom' | 'none';
  points: Record<string, QuizPointDraft>;
}

export interface ArticleDraft {
  version: 2;
  frontmatter: Frontmatter;
  hand: HandInput;
  villainImage: string;
  sections: Section[];
  quiz: QuizDraft;
  updatedAt: number;
}
