export interface ArticleGame {
  format: 'cash' | 'tournament';
  tableSize: 6 | 9;
  stakes?: string;
  effectiveStack?: number;
}

/** "NLH 6-max キャッシュ · NL50 · 100bb" — a one-line summary of which game a hand is from. */
export function gameSummary(game: ArticleGame): string {
  const parts = [`NLH ${game.tableSize}-max ${game.format === 'cash' ? 'キャッシュ' : 'トーナメント'}`];
  if (game.stakes) parts.push(game.stakes);
  if (game.effectiveStack) parts.push(`${game.effectiveStack}bb`);
  return parts.join(' · ');
}
