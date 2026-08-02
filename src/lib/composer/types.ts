import type { Position } from '../poker/types';
import type { TableBlockState } from './tableBlock';
import type { RangeBlockState } from './rangeBlock';

export type SectionId = 'preflop' | 'flop' | 'turn' | 'river' | 'result' | 'learning';

export type SectionItem =
  | { id: string; kind: 'text'; markdown: string }
  | { id: string; kind: 'table'; state: TableBlockState }
  | { id: string; kind: 'range'; state: RangeBlockState };

export interface Section {
  id: SectionId;
  label: string;
  enabled: boolean;
  headingText: string;
  items: SectionItem[];
}

export interface SituationData {
  format: string;
  stacks: string;
  heroPosition: Position | '';
  villainPosition: Position | '';
  villainImage: string;
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

export interface ArticleDraft {
  frontmatter: Frontmatter;
  situation: SituationData;
  sections: Section[];
  updatedAt: number;
}
