import type { ArticleDraft } from './types';

// v2 = NLH hand engine based drafts. Older (manual table) drafts aren't convertible, so they're simply ignored.
const STORAGE_KEY = 'poker-notes:article-composer-draft:v2';

export function saveDraft(draft: ArticleDraft): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // localStorage may be unavailable (private mode, quota) - autosave is best-effort.
  }
}

export function loadDraft(): ArticleDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ArticleDraft;
    return parsed?.version === 2 ? parsed : null;
  } catch {
    return null;
  }
}

export function clearDraft(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
