export const CARD_RE = /^[2-9TJQKA][shdc]$/;

export const SUIT_OPTIONS: { value: string; label: string }[] = [
  { value: 's', label: '♠s' },
  { value: 'h', label: '♥h' },
  { value: 'd', label: '♦d' },
  { value: 'c', label: '♣c' },
];

const SUIT_SYMBOL: Record<string, string> = { s: '♠', h: '♥', d: '♦', c: '♣' };

/** "ac" -> "Ac", " td " -> "Td". Keeps partial input ("A") so typing isn't interrupted. */
export function normalizeCard(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return '';
  const rank = trimmed[0].toUpperCase();
  const suit = trimmed[1] ? trimmed[1].toLowerCase() : '';
  return rank + suit;
}

export function isValidCard(card: string): boolean {
  return CARD_RE.test(card);
}

/** "Ac" -> "A♣" for human-readable prose. */
export function cardLabel(card: string): string {
  if (!isValidCard(card)) return card;
  return `${card[0]}${SUIT_SYMBOL[card[1]]}`;
}

/** ["Ac", "Jd"] -> "AJo", ["Ks", "Qs"] -> "KQs", ["7h", "7d"] -> "77". */
export function handCategory(cards: string[]): string | null {
  if (cards.length !== 2 || !cards.every(isValidCard)) return null;
  const order = '23456789TJQKA';
  const [a, b] = [...cards].sort((x, y) => order.indexOf(y[0]) - order.indexOf(x[0]));
  if (a[0] === b[0]) return `${a[0]}${b[0]}`;
  return `${a[0]}${b[0]}${a[1] === b[1] ? 's' : 'o'}`;
}

/** Returns human-readable errors for malformed or duplicated cards. `where` labels each card's origin. */
export function findCardErrors(cards: { card: string; where: string }[]): string[] {
  const errors: string[] = [];
  const seen = new Map<string, string>();
  for (const { card, where } of cards) {
    if (!card) continue;
    if (!isValidCard(card)) {
      errors.push(`${where}: "${card}" はカード表記として不正です（例: As, Td）`);
      continue;
    }
    const prev = seen.get(card);
    if (prev) errors.push(`${card} が「${prev}」と「${where}」で重複しています`);
    else seen.set(card, where);
  }
  return errors;
}
