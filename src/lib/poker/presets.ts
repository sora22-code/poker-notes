import { comboCount } from './range';

export interface RangePreset {
  id: string;
  label: string;
  color: string;
  hands: string;
}

export const RANGE_PRESETS: RangePreset[] = [
  {
    id: 'utg-open',
    label: 'UTG オープンレンジ',
    color: 'var(--color-poker-raise)',
    hands: '22+, A9s+, KTs+, QTs+, JTs, T9s, 98s, ATo+, KJo+',
  },
  {
    id: 'hj-open',
    label: 'HJ オープンレンジ',
    color: 'var(--color-tag-review)',
    hands: '22+, A7s+, K9s+, QTs+, J9s+, T8s+, 98s, 87s, ATo+, KTo+, QJo',
  },
  {
    id: 'co-open',
    label: 'CO オープンレンジ',
    color: 'var(--color-poker-bet)',
    hands: '22+, A2s+, K6s+, Q8s+, J8s+, T7s+, 97s+, 86s+, 76s, 65s, A8o+, KTo+, QTo+, JTo',
  },
  {
    id: 'btn-open',
    label: 'BTN オープンレンジ',
    color: 'var(--color-poker-raise)',
    hands: '22+, A2s+, K2s+, Q4s+, J6s+, T7s+, 96s+, 86s+, 75s+, 65s, 54s, ATo+, KTo+, QTo+, JTo',
  },
  {
    id: 'sb-open',
    label: 'SB オープンレンジ(レイズファースト)',
    color: 'var(--color-poker-raise)',
    hands: '22+, A2s+, K5s+, Q7s+, J7s+, T7s+, 97s+, 87s, 76s, 65s, 54s, A5o+, KTo+, QTo+, JTo',
  },
  {
    id: 'bb-defend-vs-btn',
    label: 'BB 防衛レンジ(vs BTNオープン)',
    color: 'var(--color-poker-bet)',
    hands: '22-TT, A2s-AQs, K6s+, Q8s+, J8s+, T8s+, 97s+, 87s, 76s, 65s, 54s, ATo-AQo, KJo+, QJo',
  },
];

/** Live combo-count percentage, computed rather than hardcoded so it can never drift out of sync with range.ts. */
export function presetPercent(preset: Pick<RangePreset, 'hands'>): string {
  return ((comboCount(preset.hands) / 1326) * 100).toFixed(0);
}

export function presetLabelWithPercent(preset: RangePreset): string {
  return `${preset.label} (約${presetPercent(preset)}%)`;
}

export function findPreset(id: string): RangePreset | undefined {
  return RANGE_PRESETS.find((p) => p.id === id);
}
