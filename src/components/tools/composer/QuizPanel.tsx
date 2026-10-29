import { fieldStyle, mutedTextStyle, panelStyle } from '../hand/styles';
import { heroDecisions, requiredEquity } from '../../../lib/quiz/engine';
import { STREET_LABEL, type HandInput, type HandResult } from '../../../lib/poker/nlh';
import type { QuizDraft, QuizPointDraft } from '../../../lib/composer/types';

interface QuizPanelProps {
  value: QuizDraft;
  onChange: (next: QuizDraft) => void;
  input: HandInput;
  result: HandResult;
}

const PLACEMENTS: { value: QuizDraft['placement']; label: string }[] = [
  { value: 'top', label: '記事の冒頭（状況設定の直後）' },
  { value: 'bottom', label: '記事の最後' },
  { value: 'none', label: '入れない' },
];

export default function QuizPanel({ value, onChange, input, result }: QuizPanelProps) {
  const decisions = heroDecisions(input, result);
  const hero = input.setup.heroPosition;
  const enabledCount = decisions.filter((d) => value.points[d.pointId]?.enabled).length;

  const update = (pointId: string, actual: string, patch: Partial<QuizPointDraft>) => {
    const prev = value.points[pointId] ?? { enabled: false, correct: [actual], prompt: '', explanation: '' };
    onChange({ ...value, points: { ...value.points, [pointId]: { ...prev, ...patch } } });
  };

  return (
    <div className="rounded-xl border p-4 space-y-4" style={panelStyle}>
      <div>
        <h2 className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
          クイズ「この時どうする？」
          {enabledCount > 0 && (
            <span className="ml-2 text-xs font-semibold" style={{ color: 'var(--color-accent)' }}>
              {enabledCount}問
            </span>
          )}
        </h2>
        <p className="text-xs mt-0.5" style={mutedTextStyle}>
          記事にハンドの再生プレイヤーを入れ、Heroの判断の直前で止めて読者に選ばせます。読者が間違えた問題は問題集に保存され、解き直しや共有ができます。
        </p>
      </div>

      <label className="flex flex-wrap items-center gap-2 text-sm">
        <span style={mutedTextStyle}>再生プレイヤーの位置</span>
        <select
          value={value.placement}
          onChange={(e) => onChange({ ...value, placement: e.target.value as QuizDraft['placement'] })}
          className="text-sm rounded border px-2 py-1"
          style={fieldStyle}
        >
          {PLACEMENTS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </label>

      {decisions.length === 0 ? (
        <p className="text-sm" style={mutedTextStyle}>
          各ストリートで{hero}(Hero)のアクションを入力すると、その判断を問題にできます。
        </p>
      ) : (
        <ol className="space-y-3">
          {decisions.map((d) => {
            const cfg = value.points[d.pointId];
            const enabled = Boolean(cfg?.enabled);
            const correct = cfg?.correct.filter((id) => d.choices.some((c) => c.id === id)) ?? [];
            const effectiveCorrect = correct.length > 0 ? correct : [d.actualChoiceId];
            const required = requiredEquity(d.pot, d.toCall);
            const actualLabel = d.choices.find((c) => c.id === d.actualChoiceId)?.label;
            return (
              <li key={d.pointId} className="rounded-lg border p-3 space-y-2" style={{ borderColor: 'var(--color-border)' }}>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={enabled}
                    onChange={(e) => update(d.pointId, d.actualChoiceId, { enabled: e.target.checked })}
                  />
                  <span className="text-sm" style={{ color: 'var(--color-text)' }}>
                    <strong>{STREET_LABEL[d.street]}</strong>: {d.context}
                    <span className="block text-xs" style={mutedTextStyle}>
                      ポット {d.pot}bb{d.toCall > 0 && ` / コール ${d.toCall}bb / 必要勝率 ${required}%`} ・ 実際のプレー: {actualLabel}
                    </span>
                  </span>
                </label>

                {enabled && (
                  <div className="space-y-2 pl-6">
                    <div>
                      <p className="text-xs mb-1" style={mutedTextStyle}>
                        正解にする選択肢（複数可。反省ハンドなら実際のプレー以外を正解にできます）
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {d.choices.map((c) => {
                          const on = effectiveCorrect.includes(c.id);
                          return (
                            <button
                              key={c.id}
                              type="button"
                              aria-pressed={on}
                              onClick={() => {
                                const next = on ? effectiveCorrect.filter((id) => id !== c.id) : [...effectiveCorrect, c.id];
                                update(d.pointId, d.actualChoiceId, { correct: next.length > 0 ? next : effectiveCorrect });
                              }}
                              className="text-xs px-2.5 py-1 rounded-full border cursor-pointer"
                              style={
                                on
                                  ? { background: 'var(--color-poker-call)', borderColor: 'var(--color-poker-call)', color: '#fff' }
                                  : { borderColor: 'var(--color-border)', color: 'var(--color-text)', background: 'var(--color-surface)' }
                              }
                            >
                              {on ? '✓ ' : ''}
                              {c.label}
                              {c.id === d.actualChoiceId && ' (実際)'}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <input
                      value={cfg?.prompt ?? ''}
                      onChange={(e) => update(d.pointId, d.actualChoiceId, { prompt: e.target.value })}
                      placeholder={`問題文（任意）。空欄なら「${d.context}、${hero}(Hero)の番です。どうしますか？」`}
                      className="w-full text-sm rounded border px-2 py-1.5"
                      style={fieldStyle}
                    />
                    <textarea
                      value={cfg?.explanation ?? ''}
                      onChange={(e) => update(d.pointId, d.actualChoiceId, { explanation: e.target.value })}
                      rows={3}
                      placeholder="解説。なぜその選択肢が正解か（必要勝率、相手のレンジ、他の選択肢がダメな理由など）"
                      className="w-full text-sm rounded border px-2 py-1.5"
                      style={fieldStyle}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
