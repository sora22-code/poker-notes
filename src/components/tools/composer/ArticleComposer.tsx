import { useEffect, useMemo, useState } from 'react';
import FrontmatterForm from './FrontmatterForm';
import SituationForm from './SituationForm';
import StreetSection from './StreetSection';
import PreviewPane from './PreviewPane';
import { createInitialDraft, sectionIdToStreet, STREET_SECTION_ORDER } from '../../../lib/composer/draft';
import { deriveNextStreetState, initialTableState, type TableBlockState } from '../../../lib/composer/tableBlock';
import { serializeDraft, suggestFilename } from '../../../lib/composer/serialize';
import { clearDraft, loadDraft, saveDraft } from '../../../lib/composer/storage';
import type { ArticleDraft, Section, SectionId } from '../../../lib/composer/types';

export default function ArticleComposer() {
  const [draft, setDraft] = useState<ArticleDraft>(() => loadDraft() ?? createInitialDraft());
  const [copied, setCopied] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    const next = { ...draft, updatedAt: Date.now() };
    saveDraft(next);
    setSavedAt(next.updatedAt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  const updateSection = (id: SectionId, next: Section) => {
    setDraft((d) => ({ ...d, sections: d.sections.map((s) => (s.id === id ? next : s)) }));
  };

  const tableSeedFor = (sectionId: SectionId): TableBlockState => {
    const idx = STREET_SECTION_ORDER.indexOf(sectionId);
    if (idx > 0) {
      for (let i = idx - 1; i >= 0; i--) {
        const prevSection = draft.sections.find((s) => s.id === STREET_SECTION_ORDER[i]);
        if (!prevSection) continue;
        const lastTable = [...prevSection.items].reverse().find((it) => it.kind === 'table');
        if (lastTable && lastTable.kind === 'table') {
          return deriveNextStreetState(lastTable.state);
        }
      }
    }
    return initialTableState(sectionIdToStreet(sectionId) ?? 'preflop');
  };

  const code = useMemo(() => serializeDraft(draft), [draft]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = suggestFilename(draft);
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    if (!window.confirm('下書きを初期状態に戻します。よろしいですか？')) return;
    clearDraft();
    setDraft(createInitialDraft());
  };

  return (
    <div className="grid grid-cols-1 2xl:grid-cols-[1fr_1fr] gap-6">
      <div className="space-y-5">
        <FrontmatterForm value={draft.frontmatter} onChange={(frontmatter) => setDraft((d) => ({ ...d, frontmatter }))} />
        <SituationForm value={draft.situation} onChange={(situation) => setDraft((d) => ({ ...d, situation }))} />

        {draft.sections.map((section) => (
          <StreetSection
            key={section.id}
            section={section}
            onChange={(next) => updateSection(section.id, next)}
            tableSeed={tableSeedFor(section.id)}
          />
        ))}

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handleReset}
            className="text-xs font-semibold px-3 py-1.5 rounded-full border cursor-pointer"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
          >
            下書きをリセット
          </button>
          {savedAt && (
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              ブラウザに自動保存済み
            </span>
          )}
        </div>
      </div>

      <div className="space-y-5 2xl:sticky 2xl:top-20 2xl:self-start">
        <div>
          <h2 className="text-sm font-bold mb-2" style={{ color: 'var(--color-text)' }}>
            プレビュー
          </h2>
          <PreviewPane draft={draft} />
        </div>

        <div
          className="rounded-xl border p-4"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <h2 className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
              MDXコード
            </h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="text-xs font-semibold px-3 py-1.5 rounded-full cursor-pointer"
                style={{ background: 'var(--color-accent)', color: '#fff' }}
              >
                {copied ? 'コピーしました' : 'MDXをコピー'}
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="text-xs font-semibold px-3 py-1.5 rounded-full border cursor-pointer"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              >
                .mdxをダウンロード
              </button>
            </div>
          </div>
          <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>
            ファイル名: <code>src/content/articles/{suggestFilename(draft)}</code>
          </p>
          <pre
            className="text-xs font-mono rounded-lg p-3 overflow-x-auto max-h-[32rem] overflow-y-auto"
            style={{ background: 'var(--code-bg)', color: 'var(--code-fg)' }}
          >
            {code}
          </pre>
        </div>
      </div>
    </div>
  );
}
