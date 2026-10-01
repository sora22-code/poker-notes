import { cardLabel, handCategory, isValidCard } from '../poker/cards';
import {
  STREET_LABEL,
  computeHand,
  effectiveStackOf,
  formatLabel,
  hasCustomStacks,
  stackFor,
  tableView,
  type HandResult,
} from '../poker/nlh';
import { actionLineCode, pokerTableCode } from './codegen';
import { isSectionVisible } from './draft';
import { generateRangeCode } from './rangeBlock';
import type { ArticleDraft, SectionItem } from './types';

function yamlString(s: string): string {
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

export function parseTags(raw: string): string[] {
  return raw
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

function serializeFrontmatter(draft: ArticleDraft): string {
  const fm = draft.frontmatter;
  const { setup } = draft.hand;
  const lines = [
    '---',
    `title: ${yamlString(fm.title)}`,
    `description: ${yamlString(fm.description)}`,
    `emoji: ${yamlString(fm.emoji || '🃏')}`,
    `category: ${yamlString(fm.category)}`,
    `tags: [${parseTags(fm.tags).map(yamlString).join(', ')}]`,
    `publishedAt: ${fm.publishedAt}`,
    'game:',
    `  format: ${yamlString(setup.format)}`,
    `  tableSize: ${setup.tableSize}`,
  ];
  if (setup.stakes.trim()) lines.push(`  stakes: ${yamlString(setup.stakes.trim())}`);
  lines.push(`  effectiveStack: ${effectiveStackOf(setup)}`, 'draft: false', '---');
  return lines.join('\n');
}

/** The "状況設定" bullet list, shared by the MDX output and the live preview. */
export function situationLines(draft: ArticleDraft): string[] {
  const { setup } = draft.hand;
  const lines = [`ゲーム: ${formatLabel(setup)}`];
  const effective = effectiveStackOf(setup);
  // Spell out both stacks only when they differ; otherwise one number says it all.
  const detail =
    hasCustomStacks(setup) && setup.villainPosition
      ? ` (Hero ${stackFor(setup, setup.heroPosition)}bb / Villain ${stackFor(setup, setup.villainPosition)}bb)`
      : '';
  if (setup.startStreet === 'preflop') {
    lines.push(`エフェクティブスタック: ${effective}bb${detail}`);
  } else {
    lines.push(`${STREET_LABEL[setup.startStreet]}開始時: ポット ${setup.startPot}bb / エフェクティブスタック ${effective}bb${detail}`);
  }
  lines.push(
    setup.villainPosition
      ? `ポジション: Hero は ${setup.heroPosition}、Villain は ${setup.villainPosition}`
      : `ポジション: Hero は ${setup.heroPosition}`,
  );
  const heroCards = setup.heroCards.filter(isValidCard);
  if (heroCards.length === 2) {
    lines.push(`Hero のハンド: ${heroCards.map(cardLabel).join(' ')} (${handCategory(heroCards)})`);
  }
  if (draft.villainImage.trim()) lines.push(`Villain のイメージ: ${draft.villainImage.trim()}`);
  return lines;
}

function serializeItem(item: SectionItem, draft: ArticleDraft, result: HandResult): string {
  switch (item.kind) {
    case 'text':
      return item.markdown.trim();
    case 'table': {
      const view = tableView(draft.hand, result, item.street, item.timing, item);
      return view ? pokerTableCode(view, item.caption) : '';
    }
    case 'actions': {
      const res = result.streets[item.street];
      return res.reached ? actionLineCode(res) : '';
    }
    case 'range':
      return generateRangeCode(item.state);
  }
}

export function collectImports(draft: ArticleDraft, result: HandResult): string[] {
  const used = new Set<SectionItem['kind']>();
  for (const section of draft.sections) {
    if (!isSectionVisible(section, result)) continue;
    for (const item of section.items) {
      if (serializeItem(item, draft, result)) used.add(item.kind);
    }
  }
  const imports: string[] = [];
  if (used.has('table')) imports.push("import PokerTable from '../../components/poker/PokerTable';");
  if (used.has('actions')) imports.push("import ActionLine from '../../components/poker/ActionLine';");
  if (used.has('range')) imports.push("import HandRangeChart from '../../components/poker/HandRangeChart';");
  return imports;
}

export function serializeDraft(draft: ArticleDraft, result: HandResult = computeHand(draft.hand)): string {
  const parts: string[] = [`## 状況設定\n\n${situationLines(draft).map((l) => `- ${l}`).join('\n')}`];

  for (const section of draft.sections) {
    if (!isSectionVisible(section, result)) continue;
    const body = section.items
      .map((item) => serializeItem(item, draft, result))
      .filter(Boolean)
      .join('\n\n');
    parts.push(body ? `## ${section.headingText}\n\n${body}` : `## ${section.headingText}`);
  }

  const imports = collectImports(draft, result);
  const importsBlock = imports.length > 0 ? `${imports.join('\n')}\n\n` : '';
  return `${serializeFrontmatter(draft)}\n\n${importsBlock}${parts.join('\n\n')}\n`;
}

export function suggestFilename(draft: ArticleDraft): string {
  return `${draft.frontmatter.slug.trim() || 'untitled-article'}.mdx`;
}
