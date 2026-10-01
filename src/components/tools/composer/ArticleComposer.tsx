import { useEffect, useMemo, useState } from 'react';
import FrontmatterForm from './FrontmatterForm';
import StreetSection from './StreetSection';
import PreviewPane from './PreviewPane';
import HandSetupForm from '../hand/HandSetupForm';
import {
  errorBoxStyle,
  fieldStyle,
  mutedTextStyle,
  panelStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
  warningBoxStyle,
} from '../hand/styles';
import { checkDraft, suggestSlug, suggestTags } from '../../../lib/composer/assist';
import { createInitialDraft } from '../../../lib/composer/draft';
import { serializeDraft, suggestFilename } from '../../../lib/composer/serialize';
import { clearDraft, loadDraft, saveDraft } from '../../../lib/composer/storage';
import { computeHand, pruneHand, type HandInput } from '../../../lib/poker/nlh';
import type { ArticleDraft, Section, SectionId } from '../../../lib/composer/types';

const tabButton = 'text-xs font-semibold px-3 py-1.5 rounded-full cursor-pointer';

export default function ArticleComposer() {
  const [draft, setDraft] = useState<ArticleDraft>(() => loadDraft() ?? createInitialDraft());
  const [notice, setNotice] = useState<string | null>(null);
  const [tab, setTab] = useState<'preview' | 'mdx'>('preview');
  const [copied, setCopied] = useState(false);

  const result = useMemo(() => computeHand(draft.hand), [draft.hand]);
  const code = useMemo(() => serializeDraft(draft, result), [draft, result]);
  const checks = useMemo(() => checkDraft(draft, result), [draft, result]);

  useEffect(() => {
    saveDraft({ ...draft, updatedAt: Date.now() });
  }, [draft]);

  const updateHand = (next: HandInput) => {
    const { input, removed } = pruneHand(next);
    setDraft((d) => ({ ...d, hand: input }));
    setNotice(removed > 0 ? `前提が変わったため、成り立たなくなったアクションを ${removed} 件取り消しました。` : null);
  };

  const updateSection = (id: SectionId, next: Section) => {
    setDraft((d) => ({ ...d, sections: d.sections.map((s) => (s.id === id ? next : s)) }));
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDownload = () => {
    const url = URL.createObjectURL(new Blob([code], { type: 'text/markdown;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = suggestFilename(draft);
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    if (!window.confirm('下書きをすべて消して最初からやり直します。よろしいですか？')) return;
    clearDraft();
    setDraft(createInitialDraft());
    setNotice(null);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-6">
      <div className="space-y-5 min-w-0">
        <HandSetupForm value={draft.hand.setup} onChange={(setup) => updateHand({ ...draft.hand, setup })}>
          <label className="block text-sm">
            <span style={mutedTextStyle}>Villainのイメージ</span>
            <span className="ml-1 text-[11px]" style={mutedTextStyle}>
              (任意)
            </span>
            <input
              value={draft.villainImage}
              onChange={(e) => setDraft((d) => ({ ...d, villainImage: e.target.value }))}
              placeholder="例: VPIP 28 / PFR 24 のやや広めにオープンするレギュラー"
              className="w-full mt-1 text-sm rounded border px-2 py-1.5"
              style={fieldStyle}
            />
          </label>
        </HandSetupForm>

        {notice && (
          <div className="rounded-lg border-l-4 p-3 text-sm" style={warningBoxStyle}>
            {notice}
          </div>
        )}

        {draft.sections.map((section) => (
          <StreetSection
            key={section.id}
            section={section}
            onChange={(next) => updateSection(section.id, next)}
            input={draft.hand}
            result={result}
            onHandChange={updateHand}
          />
        ))}

        <FrontmatterForm
          value={draft.frontmatter}
          onChange={(frontmatter) => setDraft((d) => ({ ...d, frontmatter }))}
          suggestedSlug={suggestSlug(draft.hand, result)}
          suggestedTags={suggestTags(draft.hand, result)}
        />

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handleReset}
            className="text-xs font-semibold px-3 py-1.5 rounded-full border cursor-pointer"
            style={secondaryButtonStyle}
          >
            下書きを消して最初から
          </button>
          <span className="text-xs" style={mutedTextStyle}>
            入力内容はこのブラウザに自動保存されます
          </span>
        </div>
      </div>

      <div className="space-y-4 min-w-0 xl:sticky xl:top-20 xl:self-start xl:max-h-[calc(100vh-6rem)] xl:overflow-y-auto">
        <div className="rounded-xl border p-4 space-y-3" style={panelStyle}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-1.5" role="tablist">
              {(['preview', 'mdx'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={tab === t}
                  onClick={() => setTab(t)}
                  className={tabButton}
                  style={tab === t ? primaryButtonStyle : secondaryButtonStyle}
                >
                  {t === 'preview' ? 'プレビュー' : 'MDXコード'}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={handleCopy} className={tabButton} style={primaryButtonStyle}>
                {copied ? 'コピーしました' : 'MDXをコピー'}
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className={`${tabButton} border`}
                style={secondaryButtonStyle}
              >
                .mdxをダウンロード
              </button>
            </div>
          </div>

          {(checks.errors.length > 0 || checks.warnings.length > 0) && (
            <div className="space-y-2">
              {checks.errors.length > 0 && (
                <div className="rounded-lg border-l-4 p-3 text-sm space-y-1" style={errorBoxStyle}>
                  {checks.errors.map((e) => (
                    <p key={e}>{e}</p>
                  ))}
                </div>
              )}
              {checks.warnings.length > 0 && (
                <div className="rounded-lg border-l-4 p-3 text-sm" style={warningBoxStyle}>
                  <p className="font-semibold mb-1">公開前チェック</p>
                  <ul className="list-disc pl-5 space-y-0.5">
                    {checks.warnings.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <p className="text-xs" style={mutedTextStyle}>
            保存先: <code>src/content/articles/{suggestFilename(draft)}</code>
          </p>
        </div>

        {tab === 'preview' ? (
          <PreviewPane draft={draft} result={result} />
        ) : (
          <pre
            className="text-xs font-mono rounded-xl p-4 overflow-x-auto"
            style={{ background: 'var(--code-bg)', color: 'var(--code-fg)' }}
          >
            {code}
          </pre>
        )}
      </div>
    </div>
  );
}
