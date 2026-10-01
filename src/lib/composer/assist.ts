import { handCategory, isValidCard } from '../poker/cards';
import { preflopPotType, validateHand, type HandInput, type HandResult } from '../poker/nlh';
import { parseTags } from './serialize';
import type { ArticleDraft } from './types';

const POT_SLUG: Record<string, string> = {
  リンプポット: 'limped',
  シングルレイズポット: 'srp',
  '3ベットポット': '3bp',
  '4ベットポット': '4bp',
};

/** e.g. "bb-vs-btn-ajo-srp" — derived from the hand so authors don't have to invent an ASCII slug. */
export function suggestSlug(input: HandInput, result: HandResult): string {
  const { heroPosition, villainPosition, heroCards } = input.setup;
  const parts = [heroPosition.toLowerCase()];
  if (villainPosition) parts.push('vs', villainPosition.toLowerCase());
  const category = handCategory(heroCards);
  if (category) parts.push(category.toLowerCase());
  const pot = preflopPotType(result);
  if (pot) parts.push(POT_SLUG[pot]);
  return parts.join('-');
}

export function suggestTags(input: HandInput, result: HandResult): string[] {
  const { setup } = input;
  const tags = [`${setup.tableSize}-max`, setup.format === 'cash' ? 'キャッシュ' : 'トーナメント'];
  const pot = preflopPotType(result);
  if (pot) tags.push(pot);
  return tags;
}

export function mergeTags(existing: string, additions: string[]): string {
  const merged = [...parseTags(existing)];
  for (const tag of additions) if (!merged.includes(tag)) merged.push(tag);
  return merged.join(', ');
}

export interface DraftChecks {
  errors: string[];
  warnings: string[];
}

/** Blocking errors (the hand itself is broken) vs. things to fix before publishing. */
export function checkDraft(draft: ArticleDraft, result: HandResult): DraftChecks {
  const errors = validateHand(draft.hand, result);
  const warnings: string[] = [];
  const fm = draft.frontmatter;
  if (!fm.title.trim()) warnings.push('タイトルが未入力です');
  if (!fm.description.trim()) warnings.push('説明が未入力です（記事一覧とSNSシェア時に表示されます）');
  if (!fm.slug.trim()) warnings.push('スラッグが未入力です（「ハンドから生成」で自動入力できます）');
  if (draft.hand.setup.heroCards.filter(isValidCard).length < 2) warnings.push('Heroのハンドが未入力です');
  const hasProse = draft.sections.some((s) => s.items.some((i) => i.kind === 'text' && i.markdown.trim()));
  if (!hasProse) warnings.push('本文がまだありません');
  return { errors, warnings };
}
