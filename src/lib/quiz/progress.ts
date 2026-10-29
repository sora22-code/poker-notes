import { answerKey, type HandQuiz, type QuizSetItem } from './types';

const STORAGE_KEY = 'poker-notes:quiz-progress:v1';
const CHANGE_EVENT = 'poker-notes:quiz-progress';

export interface AnswerRecord {
  quizId: string;
  pointId: string;
  lastCorrect: boolean;
  lastChoice: string;
  correctCount: number;
  wrongCount: number;
  lastAnsweredAt: number;
}

export interface QuizProgress {
  /** Quizzes the user has answered, kept so shared questions stay replayable after the link is gone. */
  quizzes: Record<string, HandQuiz>;
  answers: Record<string, AnswerRecord>;
}

const empty = (): QuizProgress => ({ quizzes: {}, answers: {} });

export function loadProgress(): QuizProgress {
  if (typeof window === 'undefined') return empty();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as QuizProgress;
    return { quizzes: parsed.quizzes ?? {}, answers: parsed.answers ?? {} };
  } catch {
    return empty();
  }
}

function saveProgress(progress: QuizProgress) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Private mode or quota: progress is a convenience, the quiz still works without it.
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

export function recordAnswer(quiz: HandQuiz, pointId: string, choiceId: string, correct: boolean) {
  const progress = loadProgress();
  const key = answerKey(quiz.id, pointId);
  const prev = progress.answers[key];
  progress.quizzes[quiz.id] = quiz;
  progress.answers[key] = {
    quizId: quiz.id,
    pointId,
    lastCorrect: correct,
    lastChoice: choiceId,
    correctCount: (prev?.correctCount ?? 0) + (correct ? 1 : 0),
    wrongCount: (prev?.wrongCount ?? 0) + (correct ? 0 : 1),
    lastAnsweredAt: Date.now(),
  };
  saveProgress(progress);
}

export function forgetAnswers(items: QuizSetItem[]) {
  const progress = loadProgress();
  for (const item of items) delete progress.answers[answerKey(item.quizId, item.pointId)];
  saveProgress(progress);
}

/** Questions whose latest answer was wrong, newest first. Answering one correctly later removes it. */
export function wrongItems(progress: QuizProgress): (QuizSetItem & { record: AnswerRecord })[] {
  return Object.values(progress.answers)
    .filter((r) => !r.lastCorrect)
    .sort((a, b) => b.lastAnsweredAt - a.lastAnsweredAt)
    .map((record) => ({ quizId: record.quizId, pointId: record.pointId, record }));
}

/** Subscribes to progress changes from this tab (custom event) and other tabs (storage event). */
export function onProgressChange(callback: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) callback();
  };
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener('storage', onStorage);
  };
}
