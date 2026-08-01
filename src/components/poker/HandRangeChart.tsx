import { useMemo, useState } from 'react';
import { allGridLabels, parseRange, type HandLabel } from '../../lib/poker/range';

export interface RangeGroup {
  label: string;
  color?: string;
  hands: string;
}

export interface HandRangeChartProps {
  title?: string;
  ranges: RangeGroup[];
  highlight?: string[];
  interactive?: boolean;
}

const DEFAULT_COLORS = [
  'var(--color-poker-raise)',
  'var(--color-poker-bet)',
  'var(--color-poker-call)',
  'var(--color-tag-review)',
];

export default function HandRangeChart({ title, ranges, highlight, interactive }: HandRangeChartProps) {
  const [hovered, setHovered] = useState<HandLabel | null>(null);

  const grid = useMemo(() => allGridLabels(), []);

  const labelColorMap = useMemo(() => {
    const map = new Map<HandLabel, string>();
    ranges.forEach((group, i) => {
      const color = group.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length];
      const labels = parseRange(group.hands);
      for (const l of labels) if (!map.has(l)) map.set(l, color);
    });
    return map;
  }, [ranges]);

  const highlightSet = useMemo(() => new Set(highlight ?? []), [highlight]);

  return (
    <div className="not-prose my-6">
      {title && (
        <h4 className="text-sm font-bold mb-2" style={{ color: 'var(--color-text)' }}>
          {title}
        </h4>
      )}
      <div
        className="inline-grid gap-[2px] p-2 rounded-lg border"
        style={{
          gridTemplateColumns: 'repeat(13, minmax(0, 1fr))',
          background: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
        }}
      >
        {grid.map((label) => {
          const color = labelColorMap.get(label);
          const isHighlight = highlightSet.has(label);
          return (
            <div
              key={label}
              onMouseEnter={() => interactive && setHovered(label)}
              onMouseLeave={() => interactive && setHovered(null)}
              className="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center text-[9px] md:text-[10px] font-semibold rounded-sm transition-transform"
              style={{
                background: color ?? 'var(--color-surface-muted)',
                color: color ? '#fff' : 'var(--color-text-muted)',
                outline: isHighlight ? '2px solid var(--color-accent)' : undefined,
                outlineOffset: isHighlight ? '-2px' : undefined,
                transform: interactive && hovered === label ? 'scale(1.15)' : undefined,
              }}
              title={label}
            >
              {label}
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-3 mt-2">
        {ranges.map((group, i) => (
          <span
            key={group.label}
            className="inline-flex items-center gap-1 text-xs"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <span
              className="w-3 h-3 rounded-sm inline-block"
              style={{ background: group.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length] }}
            />
            {group.label}
          </span>
        ))}
      </div>
      {interactive && hovered && (
        <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
          {hovered}
        </p>
      )}
    </div>
  );
}
