import type { Frontmatter } from '../../../lib/composer/types';

const fieldStyle = { borderColor: 'var(--color-border)', background: 'var(--color-surface-muted)' };

export interface FrontmatterFormProps {
  value: Frontmatter;
  onChange: (next: Frontmatter) => void;
}

export default function FrontmatterForm({ value, onChange }: FrontmatterFormProps) {
  const patch = (p: Partial<Frontmatter>) => onChange({ ...value, ...p });

  return (
    <div
      className="rounded-xl border p-4 space-y-3"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
    >
      <h2 className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
        Frontmatter
      </h2>

      <label className="block text-sm">
        <span style={{ color: 'var(--color-text-muted)' }}>タイトル</span>
        <input
          value={value.title}
          onChange={(e) => patch({ title: e.target.value })}
          className="w-full mt-1 text-sm rounded border px-2 py-1.5"
          style={fieldStyle}
        />
      </label>

      <label className="block text-sm">
        <span style={{ color: 'var(--color-text-muted)' }}>説明 (一覧・OGPに使用)</span>
        <textarea
          value={value.description}
          onChange={(e) => patch({ description: e.target.value })}
          rows={2}
          className="w-full mt-1 text-sm rounded border px-2 py-1.5"
          style={fieldStyle}
        />
      </label>

      <div className="flex flex-wrap gap-3">
        <label className="text-sm">
          <span style={{ color: 'var(--color-text-muted)' }}>絵文字</span>
          <input
            value={value.emoji}
            onChange={(e) => patch({ emoji: e.target.value })}
            className="w-16 mt-1 block text-sm rounded border px-2 py-1.5 text-center"
            style={fieldStyle}
          />
        </label>

        <label className="text-sm">
          <span style={{ color: 'var(--color-text-muted)' }}>カテゴリ</span>
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
          <span style={{ color: 'var(--color-text-muted)' }}>公開日</span>
          <input
            type="date"
            value={value.publishedAt}
            onChange={(e) => patch({ publishedAt: e.target.value })}
            className="mt-1 block text-sm rounded border px-2 py-1.5"
            style={fieldStyle}
          />
        </label>
      </div>

      <label className="block text-sm">
        <span style={{ color: 'var(--color-text-muted)' }}>タグ (カンマ区切り)</span>
        <input
          value={value.tags}
          onChange={(e) => patch({ tags: e.target.value })}
          placeholder="プリフロップ, BB防衛, 6-max"
          className="w-full mt-1 text-sm rounded border px-2 py-1.5"
          style={fieldStyle}
        />
      </label>

      <label className="block text-sm">
        <span style={{ color: 'var(--color-text-muted)' }}>スラッグ (URL・ファイル名になります)</span>
        <input
          value={value.slug}
          onChange={(e) => patch({ slug: e.target.value.replace(/[^a-z0-9-]/g, '') })}
          placeholder="bb-defend-ajo-vs-btn-open"
          className="w-full mt-1 text-sm font-mono rounded border px-2 py-1.5"
          style={fieldStyle}
        />
      </label>
    </div>
  );
}
