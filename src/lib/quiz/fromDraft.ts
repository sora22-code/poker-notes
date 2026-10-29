import { heroDecisions } from './engine';
import type { HandQuiz } from './types';
import type { HandResult } from '../poker/nlh';
import type { ArticleDraft } from '../composer/types';

/** Turns the composer's per-decision settings into the HandQuiz that gets exported from the article. */
export function buildQuizFromDraft(draft: ArticleDraft, result: HandResult): HandQuiz | null {
  const points = heroDecisions(draft.hand, result).flatMap((d) => {
    const cfg = draft.quiz.points[d.pointId];
    if (!cfg?.enabled) return [];
    const correct = cfg.correct.filter((id) => d.choices.some((c) => c.id === id));
    return [
      {
        id: d.pointId,
        street: d.street,
        actionIndex: d.actionIndex,
        ...(cfg.prompt.trim() ? { prompt: cfg.prompt.trim() } : {}),
        correct: correct.length > 0 ? correct : [d.actualChoiceId],
        explanation: cfg.explanation.trim(),
      },
    ];
  });
  if (points.length === 0) return null;
  const slug = draft.frontmatter.slug.trim();
  const title = draft.frontmatter.title.trim() || 'ハンドクイズ';
  return {
    kind: 'hand-quiz',
    version: 1,
    id: slug || 'untitled-article',
    title,
    ...(slug ? { source: { title, slug } } : {}),
    hand: draft.hand,
    points,
  };
}
