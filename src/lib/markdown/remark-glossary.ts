import { GLOSSARY } from '../glossary';

// Node types we never descend into: headings (per spec), links (avoid nesting
// interactive elements inside anchors), and anything without child nodes.
const SKIP_TYPES = new Set(['heading', 'link', 'code', 'inlineCode']);

interface Pattern {
  match: string;
  term: string;
  definition: string;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildPatterns(): Pattern[] {
  const patterns: Pattern[] = [];
  for (const entry of GLOSSARY) {
    patterns.push({ match: entry.term, term: entry.term, definition: entry.definition });
    for (const alias of entry.aliases ?? []) {
      patterns.push({ match: alias, term: entry.term, definition: entry.definition });
    }
  }
  // Longest surface form first so alternation prefers the more specific match
  // (e.g. "ブラフキャッチ" before "ブラフ").
  patterns.sort((a, b) => b.match.length - a.match.length);
  return patterns;
}

function buildRegex(patterns: Pattern[]): RegExp {
  const alternation = patterns.map((p) => escapeRegExp(p.match)).join('|');
  // Guard the all-caps English abbreviations (BTN, BB, GTO...) from matching
  // inside a longer run of Latin letters (e.g. "100bb"). Harmless no-op for
  // Japanese terms since they're never adjacent to Latin letters anyway.
  return new RegExp(`(?<![A-Za-z])(${alternation})(?![A-Za-z])`, 'g');
}

function textToNodes(value: string, patterns: Pattern[], regex: RegExp, used: Set<string>): any[] {
  const out: any[] = [];
  let lastIndex = 0;
  regex.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(value))) {
    const matchedText = match[0];
    const pattern = patterns.find((p) => p.match === matchedText);
    const start = match.index;
    const end = start + matchedText.length;

    if (!pattern || used.has(pattern.term)) {
      // Already introduced this term earlier in the article, or somehow no
      // pattern found (shouldn't happen) - leave as plain text and keep scanning.
      continue;
    }

    if (start > lastIndex) {
      out.push({ type: 'text', value: value.slice(lastIndex, start) });
    }

    used.add(pattern.term);
    out.push({
      type: 'mdxJsxTextElement',
      name: 'GlossaryTerm',
      attributes: [
        { type: 'mdxJsxAttribute', name: 'term', value: pattern.term },
        { type: 'mdxJsxAttribute', name: 'definition', value: pattern.definition },
      ],
      children: [{ type: 'text', value: matchedText }],
    });

    lastIndex = end;
  }

  if (lastIndex < value.length) {
    out.push({ type: 'text', value: value.slice(lastIndex) });
  }

  return out.length > 0 ? out : [{ type: 'text', value }];
}

function walk(node: any, patterns: Pattern[], regex: RegExp, used: Set<string>) {
  if (!node || typeof node !== 'object' || !Array.isArray(node.children)) return;
  if (SKIP_TYPES.has(node.type)) return;

  const newChildren: any[] = [];
  for (const child of node.children) {
    if (child.type === 'text') {
      newChildren.push(...textToNodes(child.value, patterns, regex, used));
    } else {
      walk(child, patterns, regex, used);
      newChildren.push(child);
    }
  }
  node.children = newChildren;
}

/**
 * Remark plugin: wraps the first occurrence of each glossary term found in
 * article prose (skipping headings, links, and code) with a <GlossaryTerm>
 * MDX component so it renders as a hoverable/tappable definition popover.
 */
export function remarkGlossary() {
  const patterns = buildPatterns();
  const regex = buildRegex(patterns);

  return (tree: any) => {
    const used = new Set<string>();
    walk(tree, patterns, regex, used);
  };
}

export default remarkGlossary;
