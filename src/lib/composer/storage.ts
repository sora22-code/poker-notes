import type { ArticleDraft } from './types';

const STORAGE_KEY = 'poker-notes:article-composer-draft';

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
    return JSON.parse(raw) as ArticleDraft;
  } catch {
    return null;
  }
}

export function clearDraft(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
}
