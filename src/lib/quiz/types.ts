import type { HandInput } from '../poker/nlh';
import type { Street } from '../poker/types';

/** One question = one hero decision: "the action at `actionIndex` on `street`". */
export interface QuizPoint {
  /** `${street}-${actionIndex}`, stable as long as the hand's earlier actions don't change. */
  id: string;
  street: Street;
  actionIndex: number;
  /** Optional custom question text; defaults to a generated "どうしますか？". */
  prompt?: string;
  /** Choice ids accepted as correct. More than one = several acceptable answers. */
  correct: string[];
  explanation: string;
}

export interface HandQuiz {
  /** Marker so build-time collection can find quizzes among an MDX module's exports. */
  kind: 'hand-quiz';
  version: 1;
  id: string;
  title: string;
  source?: { title: string; slug: string };
  hand: HandInput;
  points: QuizPoint[];
}

export interface QuizChoice {
  id: string;
  label: string;
}

export interface QuizSetItem {
  quizId: string;
  pointId: string;
}

export function isHandQuiz(value: unknown): value is HandQuiz {
  return Boolean(value && typeof value === 'object' && (value as HandQuiz).kind === 'hand-quiz');
}

export function answerKey(quizId: string, pointId: string): string {
  return `${quizId}::${pointId}`;
}
