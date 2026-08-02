import { RANKS, type Position, type Street } from '../poker/types';

export const POSITIONS: Position[] = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
export const STREETS: { value: Street; label: string }[] = [
  { value: 'preflop', label: 'プリフロップ' },
  { value: 'flop', label: 'フロップ' },
  { value: 'turn', label: 'ターン' },
  { value: 'river', label: 'リバー' },
];
export const SUITS: { value: string; label: string }[] = [
  { value: 's', label: '♠s' },
  { value: 'h', label: '♥h' },
  { value: 'd', label: '♦d' },
  { value: 'c', label: '♣c' },
];
export const CARD_RE = /^[2-9TJQKA][shdc]$/;

export interface TablePlayerState {
  position: Position;
  enabled: boolean;
  stack: string;
  bet: string;
  folded: boolean;
  card1: string;
  card2: string;
}

export interface TableBlockState {
  street: Street;
  board: string[];
  autoPot: boolean;
  carriedPot: string;
  manualPot: string;
  heroPosition: Position | '';
  activePosition: Position | '';
  showHoleCards: boolean;
  caption: string;
  players: TablePlayerState[];
}

export function initialPlayers(): TablePlayerState[] {
  return POSITIONS.map((position) => ({
    position,
    enabled: true,
    stack: '100',
    bet: '',
    folded: false,
    card1: '',
    card2: '',
  }));
}

export function initialTableState(street: Street = 'preflop'): TableBlockState {
  return {
    street,
    board: ['', '', '', '', ''],
    autoPot: true,
    carriedPot: '0',
    manualPot: '0',
    heroPosition: 'BB',
    activePosition: '',
    showHoleCards: true,
    caption: '',
    players: initialPlayers(),
  };
}

export function normalizeCard(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return '';
  const rank = trimmed[0].toUpperCase();
  const suit = trimmed[1] ? trimmed[1].toLowerCase() : '';
  return rank + suit;
}

export function roundNum(n: number): number {
  return Math.round(n * 100) / 100;
}

export function sumBets(players: TablePlayerState[]): number {
  return players
    .filter((p) => p.enabled)
    .reduce((sum, p) => sum + (parseFloat(p.bet) || 0), 0);
}

export function computePot(state: TableBlockState): number {
  if (!state.autoPot) return parseFloat(state.manualPot) || 0;
  return (parseFloat(state.carriedPot) || 0) + sumBets(state.players);
}

export function validateTableState(state: TableBlockState): string[] {
  const errs: string[] = [];
  const counts = new Map<string, number>();
  const boardCards = state.board.map(normalizeCard).filter(Boolean);

  const register = (raw: string, where: string) => {
    if (!raw) return;
    if (!CARD_RE.test(raw)) {
      errs.push(`${where}: "${raw}" はカード表記として不正です（例: Ac, Td）`);
      return;
    }
    counts.set(raw, (counts.get(raw) ?? 0) + 1);
  };

  boardCards.forEach((c, i) => register(c, `ボード${i + 1}枚目`));

  const enabledPlayers = state.players.filter((p) => p.enabled);
  enabledPlayers.forEach((p) => {
    const c1 = normalizeCard(p.card1);
    const c2 = normalizeCard(p.card2);
    if (c1) register(c1, `${p.position} のカード1`);
    if (c2) register(c2, `${p.position} のカード2`);
    if (c1 && c2 && c1 === c2) errs.push(`${p.position}: 同じカードを2枚指定しています`);
    if ((parseFloat(p.stack) || 0) < 0) errs.push(`${p.position}: スタックが負の値です`);
    if ((parseFloat(p.bet) || 0) < 0) errs.push(`${p.position}: ベット額が負の値です`);
  });

  for (const [card, count] of counts) {
    if (count > 1) errs.push(`カード "${card}" が ${count} 回重複しています`);
  }
  if (boardCards.length > 5) errs.push('ボードは5枚までです');
  if (enabledPlayers.length === 0) errs.push('プレイヤーが1人も選択されていません');

  return errs;
}

export interface TablePreviewPlayer {
  position: Position;
  stack: number;
  bet?: number;
  isHero?: boolean;
  isActive?: boolean;
  folded?: boolean;
  cards?: string[];
}

export function tableStateToPlayers(state: TableBlockState): TablePreviewPlayer[] {
  return state.players
    .filter((p) => p.enabled)
    .map((p) => {
      const c1 = normalizeCard(p.card1);
      const c2 = normalizeCard(p.card2);
      const cards = CARD_RE.test(c1) && CARD_RE.test(c2) ? [c1, c2] : undefined;
      return {
        position: p.position,
        stack: parseFloat(p.stack) || 0,
        bet: parseFloat(p.bet) || undefined,
        isHero: p.position === state.heroPosition,
        isActive: p.position === state.activePosition,
        folded: p.folded,
        cards,
      };
    });
}

export function tableStateToBoard(state: TableBlockState): string[] {
  return state.board.map(normalizeCard).filter(Boolean);
}

export function generateTableCode(state: TableBlockState): string {
  const board = tableStateToBoard(state);
  const pot = computePot(state);
  const lines: string[] = [];
  lines.push('<PokerTable');
  lines.push('  client:visible');
  lines.push(`  street="${state.street}"`);
  lines.push(`  pot={${roundNum(pot)}}`);
  if (board.length > 0) {
    lines.push(`  board={[${board.map((c) => `'${c}'`).join(', ')}]}`);
  }
  lines.push('  players={[');
  for (const p of state.players.filter((p) => p.enabled)) {
    const fields: string[] = [`position: '${p.position}'`];
    const stack = parseFloat(p.stack);
    if (!Number.isNaN(stack)) fields.push(`stack: ${roundNum(stack)}`);
    const bet = parseFloat(p.bet);
    if (!Number.isNaN(bet) && bet > 0) fields.push(`bet: ${roundNum(bet)}`);
    if (p.position === state.heroPosition) fields.push('isHero: true');
    if (p.position === state.activePosition) fields.push('isActive: true');
    if (p.folded) fields.push('folded: true');
    const c1 = normalizeCard(p.card1);
    const c2 = normalizeCard(p.card2);
    if (CARD_RE.test(c1) && CARD_RE.test(c2)) fields.push(`cards: ['${c1}', '${c2}']`);
    lines.push(`    { ${fields.join(', ')} },`);
  }
  lines.push('  ]}');
  if (state.caption.trim()) {
    lines.push(`  caption="${state.caption.trim().replace(/"/g, '\\"')}"`);
  }
  lines.push('/>');
  return lines.join('\n');
}

const NEXT_STREET: Partial<Record<Street, Street>> = {
  preflop: 'flop',
  flop: 'turn',
  turn: 'river',
};
const NEW_BOARD_SLOTS: Record<Street, number> = { preflop: 0, flop: 3, turn: 1, river: 1 };

/**
 * Derives a starting point for the next street's table state from the
 * previous street's finished state: stacks reduced by committed bets, bets
 * cleared, folds carried forward, and the board extended with empty slots
 * for the new street's cards. This is what lets an author fill in only the
 * delta between streets instead of re-entering the whole table each time.
 */
export function deriveNextStreetState(prev: TableBlockState): TableBlockState {
  const nextStreet = NEXT_STREET[prev.street] ?? prev.street;
  const prevBoard = tableStateToBoard(prev);
  const newSlots = NEW_BOARD_SLOTS[nextStreet] ?? 0;
  const board = [...prevBoard, ...Array(newSlots).fill('')];
  while (board.length < 5) board.push('');

  const players = prev.players.map((p) => {
    const stack = (parseFloat(p.stack) || 0) - (parseFloat(p.bet) || 0);
    return { ...p, stack: String(roundNum(Math.max(stack, 0))), bet: '' };
  });

  return {
    street: nextStreet,
    board: board.slice(0, 5),
    autoPot: true,
    carriedPot: String(roundNum(computePot(prev))),
    manualPot: String(roundNum(computePot(prev))),
    heroPosition: prev.heroPosition,
    activePosition: '',
    showHoleCards: prev.showHoleCards,
    caption: '',
    players,
  };
}

export { RANKS };
