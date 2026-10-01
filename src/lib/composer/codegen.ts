import { actionLineSteps, type StreetResult, type TableView } from '../poker/nlh';
import type { Street } from '../poker/types';

const STREET_TITLE: Record<Street, string> = { preflop: 'Preflop', flop: 'Flop', turn: 'Turn', river: 'River' };

function jsString(s: string): string {
  return `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

function attrString(s: string): string {
  return `"${s.replace(/"/g, '\\"')}"`;
}

export function pokerTableCode(view: TableView, caption = ''): string {
  const lines = ['<PokerTable', '  client:visible', `  street="${view.street}"`, `  pot={${view.pot}}`];
  if (view.board.length > 0) lines.push(`  board={[${view.board.map(jsString).join(', ')}]}`);
  lines.push('  players={[');
  for (const p of view.players) {
    const fields = [`position: '${p.position}'`];
    if (typeof p.stack === 'number') fields.push(`stack: ${p.stack}`);
    if (p.bet) fields.push(`bet: ${p.bet}`);
    if (p.isHero) fields.push('isHero: true');
    if (p.isActive) fields.push('isActive: true');
    if (p.folded) fields.push('folded: true');
    if (p.cards?.length) fields.push(`cards: [${p.cards.map(jsString).join(', ')}]`);
    lines.push(`    { ${fields.join(', ')} },`);
  }
  lines.push('  ]}');
  if (caption.trim()) lines.push(`  caption=${attrString(caption.trim())}`);
  lines.push('/>');
  return lines.join('\n');
}

export function actionLineCode(res: StreetResult): string {
  const steps = actionLineSteps(res);
  if (steps.length === 0) return '';
  const lines = ['<ActionLine', `  street="${STREET_TITLE[res.street]}"`, '  actions={['];
  for (const s of steps) {
    const fields = [`position: '${s.position}'`, `action: '${s.action}'`];
    if (typeof s.amount === 'number') fields.push(`amount: ${s.amount}`);
    lines.push(`    { ${fields.join(', ')} },`);
  }
  lines.push('  ]}', '/>');
  return lines.join('\n');
}
