import type { CSSProperties } from 'react';

export const fieldStyle: CSSProperties = {
  borderColor: 'var(--color-border)',
  background: 'var(--color-surface-muted)',
  color: 'var(--color-text)',
};

export const panelStyle: CSSProperties = {
  background: 'var(--color-surface)',
  borderColor: 'var(--color-border)',
};

export const primaryButtonStyle: CSSProperties = { background: 'var(--color-accent)', color: '#fff' };

export const secondaryButtonStyle: CSSProperties = {
  borderColor: 'var(--color-border)',
  color: 'var(--color-text)',
  background: 'var(--color-surface)',
};

export const mutedTextStyle: CSSProperties = { color: 'var(--color-text-muted)' };

export const errorBoxStyle: CSSProperties = {
  background: 'color-mix(in srgb, var(--color-poker-raise) 10%, transparent)',
  borderColor: 'var(--color-poker-raise)',
  color: 'var(--color-text)',
};

export const warningBoxStyle: CSSProperties = {
  background: 'color-mix(in srgb, var(--color-tag-review) 12%, transparent)',
  borderColor: 'var(--color-tag-review)',
  color: 'var(--color-text)',
};
