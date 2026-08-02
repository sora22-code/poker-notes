import { generateTableCode } from './tableBlock';
import { generateRangeCode } from './rangeBlock';
import type { ArticleDraft, Section, SectionItem, SituationData } from './types';

function yamlString(s: string): string {
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function serializeFrontmatter(fm: ArticleDraft['frontmatter']): string {
  const tags = fm.tags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
  const lines = [
    '---',
    `title: ${yamlString(fm.title)}`,
    `description: ${yamlString(fm.description)}`,
    `emoji: ${yamlString(fm.emoji || '🃏')}`,
    `category: ${yamlString(fm.category)}`,
    `tags: [${tags.map(yamlString).join(', ')}]`,
    `publishedAt: ${fm.publishedAt}`,
    'draft: false',
    '---',
  ];
  return lines.join('\n');
}

function serializeSituation(situation: SituationData): string {
  const lines = ['## 状況設定', ''];
  if (situation.format.trim()) lines.push(`- フォーマット: ${situation.format.trim()}`);
  if (situation.stacks.trim()) lines.push(`- スタック: ${situation.stacks.trim()}`);
  if (situation.heroPosition || situation.villainPosition) {
    lines.push(`- ポジション: Hero は ${situation.heroPosition || '?'}、Villain は ${situation.villainPosition || '?'}`);
  }
  if (situation.villainImage.trim()) lines.push(`- Villain のイメージ: ${situation.villainImage.trim()}`);
  return lines.join('\n');
}

function serializeItem(item: SectionItem): string {
  if (item.kind === 'text') return item.markdown.trim();
  if (item.kind === 'table') return generateTableCode(item.state);
  return generateRangeCode(item.state);
}

function serializeSection(section: Section): string {
  const body = section.items
    .map(serializeItem)
    .filter((s) => s.length > 0)
    .join('\n\n');
  return `## ${section.headingText}\n\n${body}`;
}

export function collectImports(draft: ArticleDraft): string[] {
  const kinds = new Set<SectionItem['kind']>();
  for (const section of draft.sections) {
    if (!section.enabled) continue;
    for (const item of section.items) kinds.add(item.kind);
  }
  const imports: string[] = [];
  if (kinds.has('table')) imports.push("import PokerTable from '../../components/poker/PokerTable';");
  if (kinds.has('range')) imports.push("import HandRangeChart from '../../components/poker/HandRangeChart';");
  return imports;
}

export function serializeDraft(draft: ArticleDraft): string {
  const frontmatter = serializeFrontmatter(draft.frontmatter);
  const imports = collectImports(draft);
  const enabledSections = draft.sections.filter((s) => s.enabled);

  const parts: string[] = [];
  const situationText = serializeSituation(draft.situation);
  if (situationText.split('\n').length > 2) parts.push(situationText);
  for (const section of enabledSections) {
    parts.push(serializeSection(section));
  }

  const body = parts.join('\n\n');
  const importsBlock = imports.length > 0 ? `${imports.join('\n')}\n\n` : '';

  return `${frontmatter}\n\n${importsBlock}${body}\n`;
}

export function suggestFilename(draft: ArticleDraft): string {
  const slug = draft.frontmatter.slug.trim();
  return `${slug || 'untitled-article'}.mdx`;
}
