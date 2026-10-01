import { fieldStyle, mutedTextStyle, panelStyle, secondaryButtonStyle } from '../hand/styles';
import { mergeTags } from '../../../lib/composer/assist';
import type { Frontmatter } from '../../../lib/composer/types';

export interface FrontmatterFormProps {
  value: Frontmatter;
  onChange: (next: Frontmatter) => void;
  suggestedSlug: string;
  suggestedTags: string[];
}

const smallButton = 'text-[11px] font-semibold px-2.5 py-1 rounded-full border cursor-pointer';

export default function FrontmatterForm({ value, onChange, suggestedSlug, suggestedTags }: FrontmatterFormProps) {
  const patch = (p: Partial<Frontmatter>) => onChange({ ...value, ...p });
  const missingTags = suggestedTags.filter((t) => !value.tags.split(',').map((x) => x.trim()).includes(t));

  return (
    <div className="rounded-xl border p-4 space-y-3" style={panelStyle}>
      <div>
        <h2 className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
          記事情報
        </h2>
        <p className="text-xs mt-0.5" style={mutedTextStyle}>
          記事一覧やSNSでシェアされたときに表示される情報です。
        </p>
      </div>

      <label className="block text-sm">
        <span style={mutedTextStyle}>タイトル</span>
        <input
          value={value.title}
          onChange={(e) => patch({ title: e.target.value })}
          placeholder="例: BTN 2.5bbオープンにBBでAJoをどう守るか"
          className="w-full mt-1 text-sm rounded border px-2 py-1.5"
          style={fieldStyle}
        />
      </label>

      <label className="block text-sm">
        <span style={mutedTextStyle}>説明</span>
        <textarea
          value={value.description}
          onChange={(e) => patch({ description: e.target.value })}
          rows={2}
          placeholder="例: BTNの2.5bbオープンにBBでAJoをコールし、トップペアでリバーまで進めたハンドの振り返り。"
          className="w-full mt-1 text-sm rounded border px-2 py-1.5"
          style={fieldStyle}
        />
      </label>

      <div className="flex flex-wrap gap-3">
        <label className="text-sm">
          <span style={mutedTextStyle}>絵文字</span>
          <input
            value={value.emoji}
            onChange={(e) => patch({ emoji: e.target.value })}
            className="w-16 mt-1 block text-sm rounded border px-2 py-1.5 text-center"
            style={fieldStyle}
          />
        </label>

        <label className="text-sm">
          <span style={mutedTextStyle}>カテゴリ</span>
          <select
            value={value.category}
            onChange={(e) => patch({ category: e.target.value as Frontmatter['category'] })}
            className="mt-1 block text-sm rounded border px-2 py-1.5"
            style={fieldStyle}
          >
            <option value="review">ハンドレビュー</option>
            <option value="strategy">戦略解説</option>
          </select>
        </label>

        <label className="text-sm">
          <span style={mutedTextStyle}>公開日</span>
          <input
            type="date"
            value={value.publishedAt}
            onChange={(e) => patch({ publishedAt: e.target.value })}
            className="mt-1 block text-sm rounded border px-2 py-1.5"
            style={fieldStyle}
          />
        </label>
      </div>

      <div className="text-sm">
        <div className="flex items-center justify-between gap-2">
          <span style={mutedTextStyle}>タグ (カンマ区切り)</span>
          {missingTags.length > 0 && (
            <button
              type="button"
              className={smallButton}
              style={secondaryButtonStyle}
              onClick={() => patch({ tags: mergeTags(value.tags, suggestedTags) })}
            >
              ハンドから追加: {missingTags.join(', ')}
            </button>
          )}
        </div>
        <input
          value={value.tags}
          onChange={(e) => patch({ tags: e.target.value })}
          placeholder="BB防衛, 6-max, シングルレイズポット"
          className="w-full mt-1 text-sm rounded border px-2 py-1.5"
          style={fieldStyle}
        />
      </div>

      <div className="text-sm">
        <div className="flex items-center justify-between gap-2">
          <span style={mutedTextStyle}>スラッグ (URLとファイル名。半角英数字とハイフン)</span>
          {suggestedSlug && suggestedSlug !== value.slug && (
            <button
              type="button"
              className={smallButton}
              style={secondaryButtonStyle}
              onClick={() => patch({ slug: suggestedSlug })}
            >
              ハンドから生成: {suggestedSlug}
            </button>
          )}
        </div>
        <input
          value={value.slug}
          onChange={(e) => patch({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
          placeholder="bb-vs-btn-ajo-srp"
          className="w-full mt-1 text-sm font-mono rounded border px-2 py-1.5"
          style={fieldStyle}
        />
      </div>
    </div>
  );
}
