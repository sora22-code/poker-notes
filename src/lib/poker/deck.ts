import { RANKS, SUITS, type Card, type CardString, type Rank, type Suit } from './types';

export function parseCard(s: CardString): Card {
  const rank = s[0].toUpperCase() as Rank;
  const suit = s[1].toLowerCase() as Suit;
  return { rank, suit };
}

export function cardToString(c: Card): CardString {
  return `${c.rank}${c.suit}`;
}

/** Numeric card id 0-51: rankIndex * 4 + suitIndex */
export function cardToId(c: Card): number {
  return RANKS.indexOf(c.rank) * 4 + SUITS.indexOf(c.suit);
}

export function idToCard(id: number): Card {
  return { rank: RANKS[Math.floor(id / 4)], suit: SUITS[id % 4] };
}

export function stringToId(s: CardString): number {
  return cardToId(parseCard(s));
}

export function idToString(id: number): CardString {
  return cardToString(idToCard(id));
}

export function rankIndexOfId(id: number): number {
  return Math.floor(id / 4);
}

export function suitIndexOfId(id: number): number {
  return id % 4;
}

export function fullDeckIds(): number[] {
  return Array.from({ length: 52 }, (_, i) => i);
}

export function createDeck(excludingIds: number[] = []): number[] {
  const exclude = new Set(excludingIds);
  return fullDeckIds().filter((id) => !exclude.has(id));
}

export function shuffle<T>(arr: T[], rng: () => number = Math.random): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
