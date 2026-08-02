import { RANGE_PRESETS, presetLabelWithPercent, type RangePreset } from '../poker/presets';

export interface RangeGroupState {
  id: string;
  label: string;
  color: string;
  hands: string;
}

export interface RangeBlockState {
  title: string;
  groups: RangeGroupState[];
  highlight: string;
}

let uid = 0;
export function nextId(prefix: string): string {
  uid += 1;
  return `${prefix}-${uid}`;
}

export function groupFromPreset(preset: RangePreset): RangeGroupState {
  return {
    id: nextId('range-group'),
    label: presetLabelWithPercent(preset),
    color: preset.color,
    hands: preset.hands,
  };
}

export function initialRangeState(): RangeBlockState {
  const first = RANGE_PRESETS[0];
  return {
    title: presetLabelWithPercent(first),
    groups: [groupFromPreset(first)],
    highlight: '',
  };
}

export function parseHighlight(raw: string): string[] {
  return raw
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function generateRangeCode(state: RangeBlockState): string {
  const lines: string[] = [];
  lines.push('<HandRangeChart');
  lines.push('  client:visible');
  if (state.title.trim()) lines.push(`  title="${state.title.trim().replace(/"/g, '\\"')}"`);
  lines.push('  ranges={[');
  for (const g of state.groups) {
    lines.push('    {');
    lines.push(`      label: '${g.label.replace(/'/g, "\\'")}',`);
    lines.push(`      color: '${g.color}',`);
    lines.push(`      hands: '${g.hands.replace(/'/g, "\\'")}',`);
    lines.push('    },');
  }
  lines.push('  ]}');
  const highlight = parseHighlight(state.highlight);
  if (highlight.length > 0) {
    lines.push(`  highlight={[${highlight.map((h) => `'${h}'`).join(', ')}]}`);
  }
  lines.push('/>');
  return lines.join('\n');
}
