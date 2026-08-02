import { createDeck, shuffle, stringToId } from './deck';
import { evaluate7 } from './evaluator';
import { expandRangeToCombos } from './range';
import type { CardString } from './types';

export interface EquityResult {
  labels: string[];
  win: number[];
  tie: number[];
  equity: number[];
  iterations: number;
}

const EXACT_COMBO_RE = /^([2-9TJQKAtjqka][shdc]){2}$/;

function isExactCombo(hand: string): boolean {
  return EXACT_COMBO_RE.test(hand.replace(/\s+/g, ''));
}

function parseExactCombo(hand: string): [number, number] {
  const clean = hand.replace(/\s+/g, '');
  return [stringToId(clean.slice(0, 2)), stringToId(clean.slice(2, 4))];
}

/**
 * Monte Carlo equity calculation. Each entry in `hands` may be an exact combo
 * ("AhKd") or range notation ("JJ+", "ATs+", "AKo"). Range hands are sampled
 * uniformly (weighted by combo count) each iteration, respecting already-used cards.
 */
export function calculateEquityMonteCarlo(
  hands: string[],
  board: CardString[] = [],
  iterations = 5000,
  rng: () => number = Math.random,
): EquityResult {
  const n = hands.length;
  const wins = new Array(n).fill(0);
  const ties = new Array(n).fill(0);
  let validIterations = 0;

  const boardIds = board.map(stringToId);

  const exactCombos: Array<[number, number] | null> = hands.map((h) => (isExactCombo(h) ? parseExactCombo(h) : null));
  const rangeCombos: Array<Array<[number, number]>> = hands.map((h, i) =>
    exactCombos[i] ? [] : expandRangeToCombos(h),
  );

  for (let iter = 0; iter < iterations; iter++) {
    const usedIds = new Set<number>(boardIds);
    const holeCards: Array<[number, number] | null> = new Array(n).fill(null);
    let ok = true;

    for (let i = 0; i < n; i++) {
      if (exactCombos[i]) {
        const [a, b] = exactCombos[i]!;
        if (usedIds.has(a) || usedIds.has(b)) {
          ok = false;
          break;
        }
        usedIds.add(a);
        usedIds.add(b);
        holeCards[i] = [a, b];
      } else {
        const candidates = rangeCombos[i].filter(([a, b]) => !usedIds.has(a) && !usedIds.has(b));
        if (candidates.length === 0) {
          ok = false;
          break;
        }
        const pick = candidates[Math.floor(rng() * candidates.length)];
        usedIds.add(pick[0]);
        usedIds.add(pick[1]);
        holeCards[i] = pick;
      }
    }

    if (!ok) continue;

    const deck = shuffle(createDeck(Array.from(usedIds)), rng);
    const fullBoard = boardIds.slice();
    let deckIdx = 0;
    while (fullBoard.length < 5) {
      fullBoard.push(deck[deckIdx]);
      deckIdx++;
    }

    const scores = holeCards.map((hc) => evaluate7([...hc!, ...fullBoard]).score);
    const best = Math.max(...scores);
    const winners = scores.reduce<number[]>((acc, s, i) => (s === best ? [...acc, i] : acc), []);

    validIterations++;
    if (winners.length === 1) {
      wins[winners[0]]++;
    } else {
      for (const w of winners) ties[w]++;
    }
  }

  const denom = validIterations || 1;
  const win = wins.map((w) => (w / denom) * 100);
  const tie = ties.map((t) => (t / denom) * 100);
  const equity = win.map((w, i) => w + tie[i] / Math.max(1, tieGroupSize(ties, i, denom)));

  return { labels: hands, win, tie, equity, iterations: validIterations };
}

// Approximates equity share of ties by average tie-group size; exact per-hand
// tie-share bookkeeping is unnecessary for the multiway display use case.
function tieGroupSize(ties: number[], _i: number, _denom: number): number {
  const activeTies = ties.filter((t) => t > 0).length;
  return activeTies > 0 ? activeTies : 1;
}
