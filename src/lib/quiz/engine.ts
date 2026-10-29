import { handCategory } from '../poker/cards';
import {
  STREET_LABEL,
  STREET_ORDER,
  boardFor,
  computeHand,
  describeAction,
  legalActions,
  roundBB,
  sizingPresets,
  type AppliedAction,
  type HandInput,
  type HandResult,
  type TableState,
} from '../poker/nlh';
import type { Street } from '../poker/types';
import type { HandQuiz, QuizChoice, QuizPoint } from './types';

export interface ReplayStep {
  street: Street;
  /** Snapshot index within the street: 0 = street start, i = after i actions. */
  index: number;
  label: string;
}

/** Every frame of the hand in order: each street's start, then one frame per action. */
export function buildSteps(input: HandInput, result: HandResult): ReplayStep[] {
  const steps: ReplayStep[] = [];
  for (const street of STREET_ORDER) {
    const res = result.streets[street];
    if (!res.reached) continue;
    const board = boardFor(input.boards, street);
    const startLabel =
      street === 'preflop'
        ? 'ブラインドが置かれました'
        : `${STREET_LABEL[street]}${board.length ? `: ${board.slice(street === 'flop' ? 0 : -1).join(' ')}` : ''}`;
    steps.push({ street, index: 0, label: startLabel });
    res.actions.forEach((a, i) => steps.push({ street, index: i + 1, label: describeAction(a) }));
  }
  return steps;
}

export function stepIndexOf(steps: ReplayStep[], street: Street, index: number): number {
  return steps.findIndex((s) => s.street === street && s.index === index);
}

const KIND_LABEL = { bet: 'ベット', raise: 'レイズ' } as const;

/** Every legal option at a decision, with bet/raise sizes from the usual presets. */
export function choicesAt(state: TableState): QuizChoice[] {
  const legal = legalActions(state);
  if (!legal) return [];
  const choices: QuizChoice[] = [];
  if (legal.canCall) choices.push({ id: 'fold', label: 'フォールド' });
  if (legal.canCheck) choices.push({ id: 'check', label: 'チェック' });
  if (legal.canCall) {
    const amount = Math.min(legal.toCall, legal.stack);
    choices.push({ id: 'call', label: `コール ${roundBB(amount)}bb${legal.toCall >= legal.stack ? '(オールイン)' : ''}` });
  }
  if (legal.canBet || legal.canRaise) {
    const kind = legal.canBet ? 'bet' : 'raise';
    for (const p of sizingPresets(state, legal)) {
      choices.push({ id: `${kind}:${p.to}`, label: `${KIND_LABEL[kind]} ${p.to}bb (${p.label})` });
    }
    choices.push({ id: 'allin', label: `オールイン ${legal.maxTo}bb` });
  }
  return choices;
}

export function actionChoiceId(action: AppliedAction): string {
  if (action.kind === 'fold' || action.kind === 'check' || action.kind === 'call') return action.kind;
  if (action.allIn) return 'allin';
  return `${action.kind}:${roundBB(action.to)}`;
}

function actionChoiceLabel(action: AppliedAction): string {
  if (action.kind === 'bet' || action.kind === 'raise') return `${KIND_LABEL[action.kind]} ${roundBB(action.to)}bb`;
  return describeAction(action).replace(`${action.position} `, '');
}

export interface HeroDecision {
  pointId: string;
  street: Street;
  actionIndex: number;
  state: TableState;
  choices: QuizChoice[];
  actualChoiceId: string;
  /** "BTN レイズ 2.5bb を受けて" — what the hero is responding to. */
  context: string;
  pot: number;
  toCall: number;
}

function contextFor(street: Street, actions: AppliedAction[]): string {
  const lastAggression = [...actions].reverse().find((a) => a.kind === 'bet' || a.kind === 'raise');
  if (lastAggression) return `${describeAction(lastAggression)} を受けて`;
  if (actions.some((a) => a.kind === 'check')) return 'チェックで回ってきて';
  if (actions.some((a) => a.kind === 'call')) return street === 'preflop' ? 'リンプが入って' : 'コールが入って';
  return street === 'preflop' ? '誰も参加していない状態で' : `${STREET_LABEL[street]}の最初のアクションで`;
}

/** All of the hero's decisions in the hand, each with its legal options and what was actually played. */
export function heroDecisions(input: HandInput, result: HandResult): HeroDecision[] {
  const hero = input.setup.heroPosition;
  const decisions: HeroDecision[] = [];
  for (const street of STREET_ORDER) {
    const res = result.streets[street];
    if (!res.reached) continue;
    res.actions.forEach((action, i) => {
      if (action.position !== hero) return;
      const state = res.snapshots[i];
      const legal = legalActions(state);
      const choices = choicesAt(state);
      const actualChoiceId = actionChoiceId(action);
      if (!choices.some((c) => c.id === actualChoiceId)) {
        choices.push({ id: actualChoiceId, label: actionChoiceLabel(action) });
      }
      decisions.push({
        pointId: `${street}-${i}`,
        street,
        actionIndex: i,
        state,
        choices,
        actualChoiceId,
        context: contextFor(street, res.actions.slice(0, i)),
        pot: state.pot,
        toCall: legal?.toCall ?? 0,
      });
    });
  }
  return decisions;
}

export interface ResolvedPoint extends QuizPoint, Omit<HeroDecision, 'pointId' | 'street' | 'actionIndex'> {
  /** Correct choice ids that still exist in the current choices. */
  correct: string[];
  promptText: string;
}

/** Matches authored points to the hand as it is now; points that no longer fit a hero decision are dropped. */
export function resolvePoints(quiz: HandQuiz, result: HandResult = computeHand(quiz.hand)): ResolvedPoint[] {
  const decisions = new Map(heroDecisions(quiz.hand, result).map((d) => [d.pointId, d]));
  const hero = quiz.hand.setup.heroPosition;
  return quiz.points.flatMap((p) => {
    const d = decisions.get(p.id);
    if (!d) return [];
    const valid = p.correct.filter((id) => d.choices.some((c) => c.id === id));
    return [
      {
        ...p,
        ...d,
        id: p.id,
        street: d.street,
        actionIndex: d.actionIndex,
        correct: valid.length > 0 ? valid : [d.actualChoiceId],
        promptText: p.prompt?.trim() || `${d.context}、${hero}(Hero)の番です。どうしますか？`,
      },
    ];
  });
}

/** Pot odds: the share of the final pot the hero has to put in, i.e. the equity needed to break even on a call. */
export function requiredEquity(pot: number, toCall: number): number | null {
  if (toCall <= 0) return null;
  return Math.round((toCall / (pot + toCall)) * 1000) / 10;
}

/** "BB AJo · プリフロップ" — compact identity of a question for lists. */
export function pointHeadline(quiz: HandQuiz, point: Pick<QuizPoint, 'street'>): string {
  const { heroPosition, heroCards } = quiz.hand.setup;
  const hand = handCategory(heroCards);
  return `${heroPosition}${hand ? ` ${hand}` : ''} · ${STREET_LABEL[point.street]}`;
}
