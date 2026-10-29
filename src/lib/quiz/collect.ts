import { isHandQuiz, type HandQuiz } from './types';

interface ArticleModule {
  frontmatter?: { title?: string; draft?: boolean };
  [exportName: string]: unknown;
}

/**
 * Finds every `export const x = { kind: 'hand-quiz', ... }` across published articles, so a quiz only has to be
 * written once (in its article) to also appear in the site-wide 問題集.
 */
export function collectSiteQuizzes(modules: Record<string, ArticleModule>): HandQuiz[] {
  const quizzes: HandQuiz[] = [];
  for (const [path, mod] of Object.entries(modules)) {
    if (mod.frontmatter?.draft) continue;
    const slug = path.split('/').pop()!.replace(/\.mdx$/, '');
    for (const value of Object.values(mod)) {
      if (!isHandQuiz(value) || value.points.length === 0) continue;
      quizzes.push({ ...value, source: value.source ?? { title: mod.frontmatter?.title ?? value.title, slug } });
    }
  }
  return quizzes;
}
