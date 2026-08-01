import { RANKS, SUITS, type Rank } from './types';

export type HandLabel = string; // "AA" | "AKs" | "AKo"

const RANK_INDEX: Record<Rank, number> = RANKS.reduce(
  (acc, r, i) => ({ ...acc, [r]: i }),
  {} as Record<Rank, number>,
);

function rankOf(ch: string): number {
  const r = ch.toUpperCase() as Rank;
  const idx = RANK_INDEX[r];
  if (idx === undefined) throw new Error(`Invalid rank: ${ch}`);
  return idx;
}

/** Canonical grid label from two rank indices (hi >= lo) and suitedness. */
function labelOf(hi: number, lo: number, kind: 'pair' | 's' | 'o'): HandLabel {
  if (kind === 'pair') return `${RANKS[hi]}${RANKS[hi]}`;
  return `${RANKS[hi]}${RANKS[lo]}${kind}`;
}

/** All 169 canonical grid labels, pairs first then descending. */
export function allGridLabels(): HandLabel[] {
  const labels: HandLabel[] = [];
  for (let hi = 12; hi >= 0; hi--) {
    for (let lo = 12; lo >= 0; lo--) {
      if (hi === lo) labels.push(labelOf(hi, hi, 'pair'));
      else if (hi > lo) labels.push(labelOf(hi, lo, 's'));
      else labels.push(labelOf(lo, hi, 'o'));
    }
  }
  return labels;
}

function addPairPlus(set: Set<HandLabel>, fromIdx: number) {
  for (let r = fromIdx; r <= 12; r++) set.add(labelOf(r, r, 'pair'));
}

function addPairRange(set: Set<HandLabel>, aIdx: number, bIdx: number) {
  const lo = Math.min(aIdx, bIdx);
  const hi = Math.max(aIdx, bIdx);
  for (let r = lo; r <= hi; r++) set.add(labelOf(r, r, 'pair'));
}

function addSuitKind(set: Set<HandLabel>, hi: number, lo: number, kind: 's' | 'o') {
  set.add(labelOf(hi, lo, kind));
}

function addSuitPlus(set: Set<HandLabel>, hi: number, fromLo: number, kind: 's' | 'o') {
  for (let lo = fromLo; lo < hi; lo++) addSuitKind(set, hi, lo, kind);
}

function addSuitRange(set: Set<HandLabel>, hi: number, loA: number, loB: number, kind: 's' | 'o') {
  const lo = Math.min(loA, loB);
  const hiLo = Math.max(loA, loB);
  for (let l = lo; l <= hiLo; l++) if (l < hi) addSuitKind(set, hi, l, kind);
}

/**
 * Parses range notation (comma separated) into a set of canonical 169-grid labels.
 * Supports: "AA", "AKs", "AKo", "AK" (both), "22+", "77-99", "ATs+", "A5o+",
 * "AK+" (both suited/offsuit incremented), "ATs-A5s", "T9s-54s"-style connector chains
 * are NOT supported; use explicit lists for those.
 */
export function parseRange(text: string): Set<HandLabel> {
  const result = new Set<HandLabel>();
  const tokens = text
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  for (const token of tokens) {
    parseToken(token, result);
  }
  return result;
}

function parseToken(tokenRaw: string, set: Set<HandLabel>) {
  const token = tokenRaw.replace(/\s+/g, '');
  if (!token) return;

  // Pair range: "77-99"
  let m = /^([2-9TJQKAtjqka])\1-([2-9TJQKAtjqka])\2$/.exec(token);
  if (m) {
    addPairRange(set, rankOf(m[1]), rankOf(m[2]));
    return;
  }

  // Pair plus: "22+"
  m = /^([2-9TJQKAtjqka])\1\+$/.exec(token);
  if (m) {
    addPairPlus(set, rankOf(m[1]));
    return;
  }

  // Exact pair: "AA"
  m = /^([2-9TJQKAtjqka])\1$/.exec(token);
  if (m) {
    set.add(labelOf(rankOf(m[1]), rankOf(m[1]), 'pair'));
    return;
  }

  // Suited/offsuit range with same high card: "ATs-A5s" / "ATo-A5o"
  m = /^([2-9TJQKAtjqka])([2-9TJQKAtjqka])([so])-\1([2-9TJQKAtjqka])\3$/.exec(token);
  if (m) {
    const hi = rankOf(m[1]);
    addSuitRange(set, hi, rankOf(m[2]), rankOf(m[4]), m[3] as 's' | 'o');
    return;
  }

  // Suited/offsuit plus: "ATs+" / "A5o+"
  m = /^([2-9TJQKAtjqka])([2-9TJQKAtjqka])([so])\+$/.exec(token);
  if (m) {
    const hi = rankOf(m[1]);
    const lo = rankOf(m[2]);
    if (hi === lo) {
      addPairPlus(set, hi);
    } else {
      addSuitPlus(set, Math.max(hi, lo), Math.min(hi, lo) === lo ? lo : hi, m[3] as 's' | 'o');
    }
    return;
  }

  // Bare rank pair plus without suit qualifier: "AK+" (both s and o incremented)
  m = /^([2-9TJQKAtjqka])([2-9TJQKAtjqka])\+$/.exec(token);
  if (m) {
    const a = rankOf(m[1]);
    const b = rankOf(m[2]);
    const hi = Math.max(a, b);
    const lo = Math.min(a, b);
    addSuitPlus(set, hi, lo, 's');
    addSuitPlus(set, hi, lo, 'o');
    return;
  }

  // Exact suited/offsuit: "AKs" / "AKo"
  m = /^([2-9TJQKAtjqka])([2-9TJQKAtjqka])([so])$/.exec(token);
  if (m) {
    const a = rankOf(m[1]);
    const b = rankOf(m[2]);
    addSuitKind(set, Math.max(a, b), Math.min(a, b), m[3] as 's' | 'o');
    return;
  }

  // Bare two ranks, both suited and offsuit: "AK"
  m = /^([2-9TJQKAtjqka])([2-9TJQKAtjqka])$/.exec(token);
  if (m) {
    const a = rankOf(m[1]);
    const b = rankOf(m[2]);
    if (a === b) {
      set.add(labelOf(a, a, 'pair'));
    } else {
      addSuitKind(set, Math.max(a, b), Math.min(a, b), 's');
      addSuitKind(set, Math.max(a, b), Math.min(a, b), 'o');
    }
    return;
  }

  // Silently ignore unrecognized tokens rather than throwing on user-authored article content.
}

/** Expands a canonical grid label into concrete two-card combos (as numeric rank/suit index pairs). */
export function labelToCombos(label: HandLabel): Array<[number, number]> {
  const combos: Array<[number, number]> = [];
  const kind = label.endsWith('s') ? 's' : label.endsWith('o') ? 'o' : 'pair';
  const hi = rankOf(label[0]);
  const lo = rankOf(label[1]);

  if (kind === 'pair') {
    for (let s1 = 0; s1 < 4; s1++) {
      for (let s2 = s1 + 1; s2 < 4; s2++) {
        combos.push([hi * 4 + s1, hi * 4 + s2]);
      }
    }
    return combos;
  }

  if (kind === 's') {
    for (let s = 0; s < 4; s++) {
      combos.push([hi * 4 + s, lo * 4 + s]);
    }
    return combos;
  }

  for (let s1 = 0; s1 < 4; s1++) {
    for (let s2 = 0; s2 < 4; s2++) {
      if (s1 !== s2) combos.push([hi * 4 + s1, lo * 4 + s2]);
    }
  }
  return combos;
}

/** Expands a whole range string into concrete combos, excluding any combo touching a blocked card id. */
export function expandRangeToCombos(text: string, blockedIds: Set<number> = new Set()): Array<[number, number]> {
  const labels = parseRange(text);
  const combos: Array<[number, number]> = [];
  for (const label of labels) {
    for (const combo of labelToCombos(label)) {
      if (!blockedIds.has(combo[0]) && !blockedIds.has(combo[1])) combos.push(combo);
    }
  }
  return combos;
}

export function comboCount(text: string): number {
  return expandRangeToCombos(text).length;
}

export { SUITS };
