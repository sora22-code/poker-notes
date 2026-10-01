import { findCardErrors, isValidCard } from './cards';
import type { PlayerSeat, Position, Street } from './types';

export type GameFormat = 'cash' | 'tournament';
export type TableSize = 6 | 9;
export type ActionKind = 'fold' | 'check' | 'call' | 'bet' | 'raise';

export const STREET_ORDER: Street[] = ['preflop', 'flop', 'turn', 'river'];
export const STREET_LABEL: Record<Street, string> = {
  preflop: 'プリフロップ',
  flop: 'フロップ',
  turn: 'ターン',
  river: 'リバー',
};
export const SEATS: Record<TableSize, Position[]> = {
  6: ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'],
  9: ['UTG', 'UTG1', 'UTG2', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'],
};
export const SMALL_BLIND = 0.5;
export const BIG_BLIND = 1;

export interface HandSetup {
  format: GameFormat;
  tableSize: TableSize;
  /** e.g. "NL50". Free text so live/online/tournament naming all fit. */
  stakes: string;
  /** Default starting stack in bb. When starting mid-hand, this is the stack left at that street. */
  effectiveStack: number;
  /** Per-seat starting stacks that differ from `effectiveStack`. Missing seats use the default. */
  stacks?: Partial<Record<Position, number>>;
  /** Big blind ante in bb (posted by BB as dead money). 0 = no ante. */
  ante: number;
  /** Lets an author skip preflop and start at a given street with a fixed pot (hero vs villain only). */
  startStreet: Street;
  startPot: number;
  heroPosition: Position;
  villainPosition: Position | '';
  heroCards: string[];
  villainCards: string[];
}

export interface HandAction {
  position: Position;
  kind: ActionKind;
  /** For bet/raise: the player's total commitment on this street after the action ("raise to"). */
  to?: number;
}

export interface HandBoards {
  flop: string[];
  turn: string;
  river: string;
}

export interface HandInput {
  setup: HandSetup;
  boards: HandBoards;
  actions: Record<Street, HandAction[]>;
}

export interface SeatState {
  position: Position;
  stack: number;
  /** Chips put in on the current street (blinds count on preflop). */
  committed: number;
  folded: boolean;
  allIn: boolean;
}

export interface TableState {
  street: Street;
  seats: SeatState[];
  /** Everything in the middle, including the current street's commitments. */
  pot: number;
  currentBet: number;
  minRaise: number;
  acted: Position[];
  toAct: Position | null;
}

export interface AppliedAction {
  position: Position;
  kind: ActionKind;
  to: number;
  amount: number;
  allIn: boolean;
}

export interface StreetResult {
  street: Street;
  reached: boolean;
  /** snapshots[0] is the street's starting state, snapshots[i] the state after i actions. */
  snapshots: TableState[];
  actions: AppliedAction[];
  complete: boolean;
}

export interface HandResult {
  streets: Record<Street, StreetResult>;
  endedByFold: boolean;
  error: string | null;
}

export interface LegalActions {
  position: Position;
  stack: number;
  committed: number;
  toCall: number;
  canCheck: boolean;
  canCall: boolean;
  callTo: number;
  canBet: boolean;
  canRaise: boolean;
  minTo: number;
  maxTo: number;
}

export function roundBB(n: number): number {
  return Math.round(n * 100) / 100;
}

export function createDefaultSetup(): HandSetup {
  return {
    format: 'cash',
    tableSize: 6,
    stakes: 'NL50',
    effectiveStack: 100,
    ante: 0,
    startStreet: 'preflop',
    startPot: 5.5,
    heroPosition: 'BB',
    villainPosition: 'BTN',
    heroCards: ['', ''],
    villainCards: ['', ''],
  };
}

export function emptyActions(): Record<Street, HandAction[]> {
  return { preflop: [], flop: [], turn: [], river: [] };
}

export function createEmptyHand(): HandInput {
  return {
    setup: createDefaultSetup(),
    boards: { flop: ['', '', ''], turn: '', river: '' },
    actions: emptyActions(),
  };
}

export function actionOrder(street: Street, seats: Position[]): Position[] {
  if (street === 'preflop') return seats;
  return [...seats.filter((p) => p === 'SB' || p === 'BB'), ...seats.filter((p) => p !== 'SB' && p !== 'BB')];
}

function cloneState(state: TableState): TableState {
  return { ...state, seats: state.seats.map((s) => ({ ...s })), acted: [...state.acted] };
}

function seatOf(state: TableState, position: Position): SeatState {
  const seat = state.seats.find((s) => s.position === position);
  if (!seat) throw new Error(`unknown seat ${position}`);
  return seat;
}

function commit(state: TableState, seat: SeatState, amount: number) {
  const paid = Math.min(amount, seat.stack);
  seat.stack = roundBB(seat.stack - paid);
  seat.committed = roundBB(seat.committed + paid);
  state.pot = roundBB(state.pot + paid);
  if (seat.stack <= 0) {
    seat.stack = 0;
    seat.allIn = true;
  }
  return roundBB(paid);
}

function findNextToAct(state: TableState, after: Position | null): Position | null {
  const live = state.seats.filter((s) => !s.folded);
  if (live.length <= 1) return null;
  const canAct = live.filter((s) => !s.allIn);
  if (canAct.length === 0) return null;
  // Nobody left to play against: a lone player who already matches the bet has nothing to do.
  if (canAct.length === 1 && canAct[0].committed >= state.currentBet) return null;

  const order = actionOrder(
    state.street,
    state.seats.map((s) => s.position),
  );
  const start = after === null ? 0 : order.indexOf(after) + 1;
  for (let i = 0; i < order.length; i++) {
    const seat = seatOf(state, order[(start + i) % order.length]);
    if (seat.folded || seat.allIn) continue;
    if (!state.acted.includes(seat.position) || seat.committed < state.currentBet) return seat.position;
  }
  return null;
}

export function stackFor(setup: HandSetup, position: Position): number {
  const override = setup.stacks?.[position];
  return Math.max(roundBB(typeof override === 'number' ? override : setup.effectiveStack), 0);
}

/** The stack that actually matters between hero and villain: the shorter of the two. */
export function effectiveStackOf(setup: HandSetup): number {
  const hero = stackFor(setup, setup.heroPosition);
  return setup.villainPosition ? Math.min(hero, stackFor(setup, setup.villainPosition)) : hero;
}

export function hasCustomStacks(setup: HandSetup): boolean {
  return SEATS[setup.tableSize].some((p) => typeof setup.stacks?.[p] === 'number');
}

export function initialState(setup: HandSetup): TableState {
  const positions = SEATS[setup.tableSize];

  if (setup.startStreet !== 'preflop') {
    const inHand = new Set<Position>([setup.heroPosition]);
    if (setup.villainPosition) inHand.add(setup.villainPosition);
    const state: TableState = {
      street: setup.startStreet,
      seats: positions.map((position) => ({
        position,
        stack: stackFor(setup, position),
        committed: 0,
        folded: !inHand.has(position),
        allIn: false,
      })),
      pot: Math.max(roundBB(setup.startPot), 0),
      currentBet: 0,
      minRaise: BIG_BLIND,
      acted: [],
      toAct: null,
    };
    state.toAct = findNextToAct(state, null);
    return state;
  }

  const state: TableState = {
    street: 'preflop',
    seats: positions.map((position) => ({
      position,
      stack: stackFor(setup, position),
      committed: 0,
      folded: false,
      allIn: false,
    })),
    pot: 0,
    currentBet: 0,
    minRaise: BIG_BLIND,
    acted: [],
    toAct: null,
  };
  const bb = seatOf(state, 'BB');
  if (setup.ante > 0) {
    const ante = Math.min(setup.ante, bb.stack);
    bb.stack = roundBB(bb.stack - ante);
    state.pot = roundBB(state.pot + ante);
  }
  commit(state, seatOf(state, 'SB'), SMALL_BLIND);
  commit(state, bb, BIG_BLIND);
  state.currentBet = BIG_BLIND;
  state.toAct = findNextToAct(state, null);
  return state;
}

/**
 * When betting on a street ends, the part of the biggest commitment nobody matched goes back to its owner
 * (e.g. BTN shoves 100bb, a 60bb BB calls: 40bb returns). Without this the pot would be overstated.
 */
function returnUncalled(state: TableState) {
  const sorted = [...state.seats].sort((a, b) => b.committed - a.committed);
  const [top, second] = sorted;
  if (!top || !second) return;
  const excess = roundBB(top.committed - second.committed);
  if (excess <= 0) return;
  top.committed = roundBB(top.committed - excess);
  top.stack = roundBB(top.stack + excess);
  top.allIn = top.stack <= 0;
  state.pot = roundBB(state.pot - excess);
  state.currentBet = top.committed;
}

function nextStreetState(prev: TableState, street: Street): TableState {
  const state = cloneState(prev);
  state.street = street;
  state.seats.forEach((s) => (s.committed = 0));
  state.currentBet = 0;
  state.minRaise = BIG_BLIND;
  state.acted = [];
  state.toAct = findNextToAct(state, null);
  return state;
}

export function legalActions(state: TableState): LegalActions | null {
  if (!state.toAct) return null;
  const seat = seatOf(state, state.toAct);
  const toCall = roundBB(Math.max(state.currentBet - seat.committed, 0));
  const maxTo = roundBB(seat.committed + seat.stack);
  const canBet = state.currentBet === 0 && seat.stack > 0;
  const canRaise = state.currentBet > 0 && seat.stack > toCall;
  const minTo = canBet
    ? Math.min(BIG_BLIND, maxTo)
    : Math.min(roundBB(state.currentBet + state.minRaise), maxTo);
  return {
    position: seat.position,
    stack: seat.stack,
    committed: seat.committed,
    toCall,
    canCheck: toCall === 0,
    canCall: toCall > 0,
    callTo: roundBB(seat.committed + Math.min(toCall, seat.stack)),
    canBet,
    canRaise,
    minTo,
    maxTo,
  };
}

export function applyAction(
  state: TableState,
  action: HandAction,
): { state: TableState; applied: AppliedAction } | { error: string } {
  if (state.toAct !== action.position) return { error: `${action.position} の手番ではありません` };
  const legal = legalActions(state);
  if (!legal) return { error: 'このストリートのアクションは終了しています' };

  const next = cloneState(state);
  const seat = seatOf(next, action.position);
  let amount = 0;

  switch (action.kind) {
    case 'fold':
      if (!legal.canCall) return { error: 'チェックできる場面ではフォールドできません' };
      seat.folded = true;
      break;
    case 'check':
      if (!legal.canCheck) return { error: `${legal.toCall}bb のベットに直面しているのでチェックできません` };
      break;
    case 'call':
      if (!legal.canCall) return { error: 'コールするベットがありません' };
      amount = commit(next, seat, legal.toCall);
      break;
    case 'bet':
    case 'raise': {
      if (action.kind === 'bet' && !legal.canBet) return { error: 'すでにベットがあるのでベットではなくレイズです' };
      if (action.kind === 'raise' && !legal.canRaise) return { error: 'レイズできる場面ではありません' };
      const requested = action.to ?? 0;
      if (!(requested > 0)) return { error: '金額を入力してください' };
      const to = Math.min(roundBB(requested), legal.maxTo);
      if (to < legal.minTo && to < legal.maxTo) {
        return { error: `最小 ${legal.minTo}bb から入力してください（オールインを除く）` };
      }
      if (action.kind === 'raise' && to <= state.currentBet) return { error: 'レイズ額は現在のベットより大きくしてください' };
      amount = commit(next, seat, roundBB(to - seat.committed));
      const increment = roundBB(seat.committed - state.currentBet);
      if (increment >= state.minRaise) next.minRaise = increment;
      next.currentBet = Math.max(state.currentBet, seat.committed);
      next.acted = [];
      break;
    }
  }

  if (!next.acted.includes(seat.position)) next.acted.push(seat.position);
  next.toAct = findNextToAct(next, seat.position);
  if (next.toAct === null) returnUncalled(next);

  return {
    state: next,
    applied: { position: seat.position, kind: action.kind, to: seat.committed, amount, allIn: seat.allIn },
  };
}

export function computeHand(input: HandInput): HandResult {
  const streets = Object.fromEntries(
    STREET_ORDER.map((street) => [street, { street, reached: false, snapshots: [], actions: [], complete: false }]),
  ) as unknown as Record<Street, StreetResult>;

  let error: string | null = null;
  let endedByFold = false;
  const startIdx = STREET_ORDER.indexOf(input.setup.startStreet);
  let state = initialState(input.setup);

  for (let i = startIdx; i < STREET_ORDER.length; i++) {
    const street = STREET_ORDER[i];
    if (i > startIdx) state = nextStreetState(state, street);
    const res = streets[street];
    res.reached = true;
    res.snapshots = [state];

    for (const action of input.actions[street]) {
      const out = applyAction(state, action);
      if ('error' in out) {
        error = `${STREET_LABEL[street]}: ${out.error}`;
        break;
      }
      state = out.state;
      res.actions.push(out.applied);
      res.snapshots.push(state);
    }

    res.complete = error === null && state.toAct === null;
    if (error || !res.complete) break;
    if (state.seats.filter((s) => !s.folded).length <= 1) {
      endedByFold = true;
      break;
    }
  }

  return { streets, endedByFold, error };
}

/** Drops actions that no longer apply (e.g. after changing table size or stacks) so the hand stays consistent. */
export function pruneHand(input: HandInput): { input: HandInput; removed: number } {
  const result = computeHand(input);
  const actions = emptyActions();
  let removed = 0;
  for (const street of STREET_ORDER) {
    const kept = result.streets[street].reached ? result.streets[street].actions.length : 0;
    actions[street] = input.actions[street].slice(0, kept);
    removed += input.actions[street].length - kept;
  }
  return { input: { ...input, actions }, removed };
}

/** Folds everyone who isn't hero/villain until one of them is to act — the "folds to the button" shortcut. */
export function foldToKeyPlayers(input: HandInput, street: Street): HandAction[] {
  const keyPlayers = new Set<Position>([input.setup.heroPosition]);
  if (input.setup.villainPosition) keyPlayers.add(input.setup.villainPosition);
  const actions = [...input.actions[street]];
  for (let guard = 0; guard < 12; guard++) {
    const res = computeHand({ ...input, actions: { ...input.actions, [street]: actions } }).streets[street];
    const state = res.snapshots[res.snapshots.length - 1];
    if (!state?.toAct || keyPlayers.has(state.toAct)) break;
    const legal = legalActions(state);
    if (!legal?.canCall) break;
    actions.push({ position: state.toAct, kind: 'fold' });
  }
  return actions;
}

export type TableTiming = 'auto' | 'start' | 'end' | number;

/** Maps a timing choice to a snapshot index. "auto" = just before hero's last decision on the street. */
export function resolveTiming(res: StreetResult, hero: Position, timing: TableTiming): number {
  const last = Math.max(res.snapshots.length - 1, 0);
  if (timing === 'start') return 0;
  if (timing === 'end') return last;
  if (typeof timing === 'number') return Math.min(Math.max(timing, 0), last);
  for (let i = res.actions.length - 1; i >= 0; i--) {
    if (res.actions[i].position === hero) return i;
  }
  return last;
}

export function boardFor(boards: HandBoards, street: Street): string[] {
  const flop = boards.flop.filter(isValidCard);
  if (street === 'preflop') return [];
  if (street === 'flop') return flop;
  const turn = isValidCard(boards.turn) ? [boards.turn] : [];
  if (street === 'turn') return [...flop, ...turn];
  const river = isValidCard(boards.river) ? [boards.river] : [];
  return [...flop, ...turn, ...river];
}

export interface TableViewOptions {
  showFolded: boolean;
  showVillainCards: boolean;
}

export interface TableView {
  street: Street;
  pot: number;
  board: string[];
  players: PlayerSeat[];
}

export function tableView(
  input: HandInput,
  result: HandResult,
  street: Street,
  timing: TableTiming,
  options: TableViewOptions,
): TableView | null {
  const res = result.streets[street];
  if (!res.reached || res.snapshots.length === 0) return null;
  const { setup } = input;
  const state = res.snapshots[resolveTiming(res, setup.heroPosition, timing)];
  const heroCards = setup.heroCards.filter(isValidCard);
  const villainCards = setup.villainCards.filter(isValidCard);

  const players: PlayerSeat[] = state.seats
    .filter((s) => options.showFolded || !s.folded)
    .map((s) => {
      const isHero = s.position === setup.heroPosition;
      const isVillain = s.position === setup.villainPosition;
      const cards =
        isHero && heroCards.length === 2
          ? heroCards
          : isVillain && options.showVillainCards && villainCards.length === 2
            ? villainCards
            : undefined;
      return {
        position: s.position,
        stack: roundBB(s.stack),
        ...(s.committed > 0 ? { bet: roundBB(s.committed) } : {}),
        ...(s.folded ? { folded: true } : {}),
        ...(isHero ? { isHero: true } : {}),
        ...(state.toAct === s.position ? { isActive: true } : {}),
        ...(cards ? { cards } : {}),
      };
    });

  return { street, pot: roundBB(state.pot), board: boardFor(input.boards, street), players };
}

export type ActionLineKind = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'allin';

export function actionLineSteps(res: StreetResult): { position: Position; action: ActionLineKind; amount?: number }[] {
  return res.actions.map((a) => {
    if (a.kind === 'fold' || a.kind === 'check') return { position: a.position, action: a.kind };
    return { position: a.position, action: a.allIn && a.kind !== 'call' ? 'allin' : a.kind, amount: roundBB(a.to) };
  });
}

export function describeAction(a: AppliedAction): string {
  const label: Record<ActionKind, string> = {
    fold: 'フォールド',
    check: 'チェック',
    call: 'コール',
    bet: 'ベット',
    raise: 'レイズ',
  };
  if (a.kind === 'fold' || a.kind === 'check') return `${a.position} ${label[a.kind]}`;
  return `${a.position} ${a.allIn && a.kind !== 'call' ? 'オールイン' : label[a.kind]} ${roundBB(a.to)}bb`;
}

export function formatLabel(setup: HandSetup): string {
  const format = setup.format === 'cash' ? 'キャッシュゲーム' : 'トーナメント';
  const extras: string[] = [];
  if (setup.stakes.trim()) extras.push(setup.stakes.trim());
  if (setup.ante > 0) extras.push(`BBアンティ ${roundBB(setup.ante)}bb`);
  return `NLH ${setup.tableSize}-max ${format}${extras.length ? ` (${extras.join(' / ')})` : ''}`;
}

/** Counts preflop raises to classify the pot (open = 1 raise). */
export function preflopPotType(result: HandResult): 'リンプポット' | 'シングルレイズポット' | '3ベットポット' | '4ベットポット' | null {
  const res = result.streets.preflop;
  if (!res.reached) return null;
  const raises = res.actions.filter((a) => a.kind === 'raise').length;
  if (raises === 0) return res.complete ? 'リンプポット' : null;
  if (raises === 1) return 'シングルレイズポット';
  if (raises === 2) return '3ベットポット';
  return '4ベットポット';
}

/** Bet/raise size shortcuts appropriate to the spot, clamped to what's legal. */
export function sizingPresets(state: TableState, legal: LegalActions): { label: string; to: number }[] {
  const presets: { label: string; to: number }[] = [];
  const add = (label: string, to: number) => {
    const rounded = Math.round(to * 10) / 10;
    if (rounded >= legal.minTo && rounded < legal.maxTo && !presets.some((p) => p.to === rounded)) {
      presets.push({ label, to: rounded });
    }
  };

  if (legal.canBet) {
    for (const pct of [33, 50, 75, 100]) add(`${pct}%`, (state.pot * pct) / 100);
  } else if (legal.canRaise) {
    const multipliers =
      state.street === 'preflop' && state.currentBet === BIG_BLIND ? [2, 2.5, 3] : state.street === 'preflop' ? [2.2, 3, 4] : [2.5, 3];
    for (const m of multipliers) add(`${m}x`, state.currentBet * m);
  }
  return presets;
}

export function validateHand(input: HandInput, result: HandResult): string[] {
  const { setup, boards } = input;
  const errors: string[] = [];
  const seats = SEATS[setup.tableSize];
  if (!seats.includes(setup.heroPosition)) errors.push(`Heroのポジション ${setup.heroPosition} は ${setup.tableSize}-max に存在しません`);
  if (setup.villainPosition && !seats.includes(setup.villainPosition)) {
    errors.push(`Villainのポジション ${setup.villainPosition} は ${setup.tableSize}-max に存在しません`);
  }
  if (setup.villainPosition && setup.villainPosition === setup.heroPosition) errors.push('HeroとVillainが同じポジションです');
  if (setup.startStreet !== 'preflop' && !setup.villainPosition) {
    errors.push('フロップ以降から始める場合はVillainのポジションを指定してください');
  }
  if (!(setup.effectiveStack > 0)) errors.push('スタックは0より大きくしてください');
  for (const p of seats) {
    const s = setup.stacks?.[p];
    if (typeof s === 'number' && !(s > 0)) errors.push(`${p} のスタックは0より大きくしてください`);
  }

  errors.push(
    ...findCardErrors([
      { card: setup.heroCards[0], where: 'Heroのカード1' },
      { card: setup.heroCards[1], where: 'Heroのカード2' },
      { card: setup.villainCards[0], where: 'Villainのカード1' },
      { card: setup.villainCards[1], where: 'Villainのカード2' },
      ...boards.flop.map((card, i) => ({ card, where: `フロップ${i + 1}枚目` })),
      { card: boards.turn, where: 'ターン' },
      { card: boards.river, where: 'リバー' },
    ]),
  );
  if (result.error) errors.push(result.error);
  return errors;
}
