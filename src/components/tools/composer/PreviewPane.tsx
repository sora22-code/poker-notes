import PokerTable from '../../poker/PokerTable';
import HandRangeChart from '../../poker/HandRangeChart';
import { computePot, roundNum, tableStateToBoard, tableStateToPlayers } from '../../../lib/composer/tableBlock';
import { parseHighlight } from '../../../lib/composer/rangeBlock';
import type { ArticleDraft, SectionItem } from '../../../lib/composer/types';

export interface PreviewPaneProps {
  draft: ArticleDraft;
}

function PreviewItem({ item }: { item: SectionItem }) {
  if (item.kind === 'text') {
    if (!item.markdown.trim()) return null;
    return (
      <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--color-text)' }}>
        {item.markdown}
      </p>
    );
  }
  if (item.kind === 'table') {
    return (
      <PokerTable
        street={item.state.street}
        pot={roundNum(computePot(item.state))}
        board={tableStateToBoard(item.state)}
        players={tableStateToPlayers(item.state)}
        caption={item.state.caption || undefined}
        showHoleCards={item.state.showHoleCards}
      />
    );
  }
  return (
    <HandRangeChart title={item.state.title} ranges={item.state.groups} highlight={parseHighlight(item.state.highlight)} />
  );
}

export default function PreviewPane({ draft }: PreviewPaneProps) {
  const { situation } = draft;
  const hasSituation = Boolean(
    situation.format.trim() || situation.stacks.trim() || situation.heroPosition || situation.villainImage.trim(),
  );

  return (
    <div
      className="rounded-xl border p-5 sm:p-6 space-y-6"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
    >
      <header>
        <h1 className="text-xl font-extrabold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
          <span aria-hidden="true">{draft.frontmatter.emoji || '🃏'}</span>
          <span>{draft.frontmatter.title || '(無題の記事)'}</span>
        </h1>
        {draft.frontmatter.description && (
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            {draft.frontmatter.description}
          </p>
        )}
      </header>

      {hasSituation && (
        <section>
          <h2
            className="font-bold text-base mb-2 pb-1 border-b"
            style={{ color: 'var(--color-text)', borderColor: 'var(--color-border)' }}
          >
            状況設定
          </h2>
          <ul className="list-disc pl-5 text-sm space-y-1" style={{ color: 'var(--color-text)' }}>
            {situation.format.trim() && <li>フォーマット: {situation.format}</li>}
            {situation.stacks.trim() && <li>スタック: {situation.stacks}</li>}
            {(situation.heroPosition || situation.villainPosition) && (
              <li>
                ポジション: Hero は {situation.heroPosition || '?'}、Villain は {situation.villainPosition || '?'}
              </li>
            )}
            {situation.villainImage.trim() && <li>Villain のイメージ: {situation.villainImage}</li>}
          </ul>
        </section>
      )}

      {draft.sections
        .filter((s) => s.enabled)
        .map((section) => (
          <section key={section.id}>
            <h2
              className="font-bold text-base mb-3 pb-1 border-b"
              style={{ color: 'var(--color-text)', borderColor: 'var(--color-border)' }}
            >
              {section.headingText}
            </h2>
            <div className="space-y-4">
              {section.items.map((item) => (
                <PreviewItem key={item.id} item={item} />
              ))}
            </div>
          </section>
        ))}
    </div>
  );
}
