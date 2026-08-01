import { rankIndexOfId, suitIndexOfId } from './deck';
import { CATEGORY_NAMES } from './types';

export const CATEGORY = {
  HIGH_CARD: 0,
  PAIR: 1,
  TWO_PAIR: 2,
  TRIPS: 3,
  STRAIGHT: 4,
  FLUSH: 5,
  FULL_HOUSE: 6,
  QUADS: 7,
  STRAIGHT_FLUSH: 8,
} as const;

export interface HandResult {
  /** Monotonically comparable score, higher wins. */
  score: number;
  category: number;
  categoryName: string;
}

function makeResult(category: number, tiebreak: number[]): HandResult {
  let score = category;
  for (const t of tiebreak) score = score * 13 + t;
  return { score, category, categoryName: CATEGORY_NAMES[category] };
}

/** Returns the top rank index of a straight given descending unique rank indices, or null. Handles the wheel (A-2-3-4-5). */
function findStraightTop(uniqueRanksDesc: number[]): number | null {
  const set = new Set(uniqueRanksDesc);
  for (let top = 12; top >= 4; top--) {
    let ok = true;
    for (let k = 0; k < 5; k++) {
      if (!set.has(top - k)) {
        ok = false;
        break;
      }
    }
    if (ok) return top;
  }
  if ([12, 0, 1, 2, 3].every((r) => set.has(r))) return 3;
  return null;
}

function removeN(flatRanksDesc: number[], rank: number, count: number): number[] {
  const out = flatRanksDesc.slice();
  let removed = 0;
  for (let i = out.length - 1; i >= 0 && removed < count; i--) {
    if (out[i] === rank) {
      out.splice(i, 1);
      removed++;
    }
  }
  return out;
}

/**
 * Evaluates the best 5-card hand from 5-7 numeric card ids (0-51).
 */
export function evaluate7(cardIds: number[]): HandResult {
  const rankCounts = new Array(13).fill(0);
  const suitCounts = new Array(4).fill(0);
  const suitRanks: number[][] = [[], [], [], []];

  for (const id of cardIds) {
    const r = rankIndexOfId(id);
    const s = suitIndexOfId(id);
    rankCounts[r]++;
    suitCounts[s]++;
    suitRanks[s].push(r);
  }

  let flushSuit = -1;
  for (let s = 0; s < 4; s++) if (suitCounts[s] >= 5) flushSuit = s;

  if (flushSuit >= 0) {
    const uniqueDesc = Array.from(new Set(suitRanks[flushSuit])).sort((a, b) => b - a);
    const sfTop = findStraightTop(uniqueDesc);
    if (sfTop !== null) {
      return makeResult(CATEGORY.STRAIGHT_FLUSH, [sfTop, 0, 0, 0, 0]);
    }
  }

  const countsEntries = rankCounts
    .map((c, r) => ({ r, c }))
    .filter((e) => e.c > 0)
    .sort((a, b) => b.c - a.c || b.r - a.r);

  const flatRanksDesc = cardIds.map(rankIndexOfId).sort((a, b) => b - a);

  if (countsEntries[0].c === 4) {
    const quad = countsEntries[0].r;
    const remaining = removeN(flatRanksDesc, quad, 4);
    const kicker = remaining[0] ?? 0;
    return makeResult(CATEGORY.QUADS, [quad, kicker, 0, 0, 0]);
  }

  if (countsEntries[0].c === 3 && countsEntries[1] && countsEntries[1].c >= 2) {
    const trips = countsEntries[0].r;
    const pair = countsEntries[1].r;
    return makeResult(CATEGORY.FULL_HOUSE, [trips, pair, 0, 0, 0]);
  }

  if (flushSuit >= 0) {
    const top5 = Array.from(new Set(suitRanks[flushSuit]))
      .sort((a, b) => b - a)
      .slice(0, 5);
    while (top5.length < 5) top5.push(0);
    return makeResult(CATEGORY.FLUSH, top5);
  }

  const uniqueRanksDesc = Array.from(new Set(flatRanksDesc)).sort((a, b) => b - a);
  const straightTop = findStraightTop(uniqueRanksDesc);
  if (straightTop !== null) {
    return makeResult(CATEGORY.STRAIGHT, [straightTop, 0, 0, 0, 0]);
  }

  if (countsEntries[0].c === 3) {
    const trips = countsEntries[0].r;
    const remaining = removeN(flatRanksDesc, trips, 3);
    const kickers = remaining.slice(0, 2);
    while (kickers.length < 2) kickers.push(0);
    return makeResult(CATEGORY.TRIPS, [trips, kickers[0], kickers[1], 0, 0]);
  }

  if (countsEntries[0].c === 2 && countsEntries[1] && countsEntries[1].c === 2) {
    const p1 = countsEntries[0].r;
    const p2 = countsEntries[1].r;
    const remaining = removeN(removeN(flatRanksDesc, p1, 2), p2, 2);
    const kicker = remaining[0] ?? 0;
    return makeResult(CATEGORY.TWO_PAIR, [p1, p2, kicker, 0, 0]);
  }

  if (countsEntries[0].c === 2) {
    const pair = countsEntries[0].r;
    const remaining = removeN(flatRanksDesc, pair, 2);
    const kickers = remaining.slice(0, 3);
    while (kickers.length < 3) kickers.push(0);
    return makeResult(CATEGORY.PAIR, [pair, kickers[0], kickers[1], kickers[2], 0]);
  }

  const top5 = uniqueRanksDesc.slice(0, 5);
  while (top5.length < 5) top5.push(0);
  return makeResult(CATEGORY.HIGH_CARD, top5);
}
