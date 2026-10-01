import type { ReactNode } from 'react';
import PokerTable from '../../poker/PokerTable';
import ActionLine from '../../poker/ActionLine';
import HandRangeChart from '../../poker/HandRangeChart';
import { panelStyle } from '../hand/styles';
import { isSectionVisible } from '../../../lib/composer/draft';
import { parseHighlight } from '../../../lib/composer/rangeBlock';
import { situationLines } from '../../../lib/composer/serialize';
import { STREET_LABEL, actionLineSteps, tableView, type HandResult } from '../../../lib/poker/nlh';
import type { ArticleDraft, SectionItem } from '../../../lib/composer/types';

function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : part,
  );
}

/** Enough Markdown for a faithful preview (paragraphs, bullets, bold) without shipping a parser. */
function MarkdownLite({ source }: { source: string }) {
  const blocks = source.trim().split(/\n{2,}/);
  return (
    <>
      {blocks.map((block, i) => {
        const lines = block.split('\n');
        if (lines.every((l) => /^\s*[-*] /.test(l))) {
          return (
            <ul key={i} className="list-disc pl-5 text-sm space-y-1">
              {lines.map((l, j) => (
                <li key={j}>{inline(l.replace(/^\s*[-*] /, ''))}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="text-sm leading-relaxed whitespace-pre-wrap">
            {inline(block)}
          </p>
        );
      })}
    </>
  );
}

function PreviewItem({ item, draft, result }: { item: SectionItem; draft: ArticleDraft; result: HandResult }) {
  switch (item.kind) {
    case 'text':
      return item.markdown.trim() ? <MarkdownLite source={item.markdown} /> : null;
    case 'table': {
      const view = tableView(draft.hand, result, item.street, item.timing, item);
      return view ? (
        <PokerTable
          street={view.street}
          pot={view.pot}
          board={view.board}
          players={view.players}
          caption={item.caption || undefined}
        />
      ) : null;
    }
    case 'actions': {
      const steps = actionLineSteps(result.streets[item.street]);
      return steps.length > 0 ? <ActionLine street={STREET_LABEL[item.street]} actions={steps} /> : null;
    }
    case 'range':
      return (
        <HandRangeChart
          title={item.state.title}
          ranges={item.state.groups}
          highlight={parseHighlight(item.state.highlight)}
        />
      );
  }
}

export default function PreviewPane({ draft, result }: { draft: ArticleDraft; result: HandResult }) {
  return (
    <div className="rounded-xl border p-5 sm:p-6 space-y-6" style={{ ...panelStyle, color: 'var(--color-text)' }}>
      <header>
        <h1 className="text-xl font-extrabold flex items-center gap-2">
          <span aria-hidden="true">{draft.frontmatter.emoji || '🃏'}</span>
          <span>{draft.frontmatter.title || '(タイトル未入力)'}</span>
        </h1>
        {draft.frontmatter.description && (
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            {draft.frontmatter.description}
          </p>
        )}
      </header>

      <section>
        <h2 className="font-bold text-base mb-2 pb-1 border-b" style={{ borderColor: 'var(--color-border)' }}>
          状況設定
        </h2>
        <ul className="list-disc pl-5 text-sm space-y-1">
          {situationLines(draft).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>

      {draft.sections
        .filter((s) => isSectionVisible(s, result))
        .map((section) => (
          <section key={section.id}>
            <h2 className="font-bold text-base mb-3 pb-1 border-b" style={{ borderColor: 'var(--color-border)' }}>
              {section.headingText}
            </h2>
            <div className="space-y-4">
              {section.items.map((item) => (
                <PreviewItem key={item.id} item={item} draft={draft} result={result} />
              ))}
            </div>
          </section>
        ))}

      <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
        ※ 専門用語のホバー解説は公開後の記事ページで自動的に付きます。
      </p>
    </div>
  );
}
