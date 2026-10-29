import { useEffect, useMemo, useState } from 'react';
import PokerTable from './PokerTable';
import { STREET_LABEL, boardFor, computeHand, tableView } from '../../lib/poker/nlh';
import { buildSteps, requiredEquity, resolvePoints, stepIndexOf, type ResolvedPoint } from '../../lib/quiz/engine';
import { recordAnswer } from '../../lib/quiz/progress';
import type { HandQuiz } from '../../lib/quiz/types';

export interface HandReplayerProps {
  quiz: HandQuiz;
  /** "full" plays the whole hand and asks every question; "single" starts at one question's street. */
  mode?: 'full' | 'single';
  pointId?: string;
  /** Off in editors/previews so authors testing their own quiz don't fill their review list. */
  recordProgress?: boolean;
  onAnswered?: (pointId: string, correct: boolean) => void;
}

const STEP_MS = 1100;

const btn = 'text-xs font-semibold px-3 py-1.5 rounded-full border cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed';
const btnStyle = { borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)' };
const primaryStyle = { background: 'var(--color-accent)', color: '#fff', borderColor: 'var(--color-accent)' };
const muted = { color: 'var(--color-text-muted)' };

function Paragraphs({ text }: { text: string }) {
  return (
    <>
      {text
        .trim()
        .split(/\n{2,}/)
        .map((p, i) => (
          <p key={i} className="text-sm leading-relaxed whitespace-pre-wrap">
            {p}
          </p>
        ))}
    </>
  );
}

export default function HandReplayer({ quiz, mode = 'full', pointId, recordProgress = true, onAnswered }: HandReplayerProps) {
  const result = useMemo(() => computeHand(quiz.hand), [quiz.hand]);
  const steps = useMemo(() => buildSteps(quiz.hand, result), [quiz.hand, result]);
  const points = useMemo(() => {
    const all = resolvePoints(quiz, result);
    return mode === 'single' ? all.filter((p) => p.id === pointId) : all;
  }, [quiz, result, mode, pointId]);
  const pointAtStep = useMemo(() => {
    const map = new Map<number, ResolvedPoint>();
    for (const p of points) map.set(stepIndexOf(steps, p.street, p.actionIndex), p);
    return map;
  }, [points, steps]);

  const startStep = mode === 'single' && points[0] ? Math.max(stepIndexOf(steps, points[0].street, 0), 0) : 0;
  const [stepIdx, setStepIdx] = useState(startStep);
  const [playing, setPlaying] = useState(mode === 'single');
  const [askMode, setAskMode] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  // The server-rendered buttons are inert until hydration; disable them so an early click isn't silently lost.
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  const lastStep = steps.length - 1;
  const step = steps[Math.min(stepIdx, lastStep)];
  const question = pointAtStep.get(stepIdx);
  const blocking = Boolean(question && askMode && !(question.id in answers));

  // Autoplay: stop at an unanswered question or the end; otherwise advance one frame per tick.
  useEffect(() => {
    if (!playing) return;
    if (blocking || stepIdx >= lastStep) {
      setPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => setStepIdx((i) => Math.min(i + 1, lastStep)), STEP_MS);
    return () => window.clearTimeout(timer);
  }, [playing, blocking, stepIdx, lastStep]);

  if (!step) return null;

  const isLast = stepIdx === lastStep;
  const view = tableView(quiz.hand, result, step.street, step.index, {
    showFolded: step.street === 'preflop',
    showVillainCards: isLast && !result.endedByFold,
  });

  const answer = (choiceId: string) => {
    if (!question) return;
    const correct = question.correct.includes(choiceId);
    setAnswers((a) => ({ ...a, [question.id]: choiceId }));
    if (recordProgress) recordAnswer(quiz, question.id, choiceId, correct);
    onAnswered?.(question.id, correct);
  };

  const go = (idx: number) => {
    setPlaying(false);
    setStepIdx(Math.max(0, Math.min(idx, lastStep)));
  };

  const restart = () => {
    setAnswers({});
    setStepIdx(startStep);
    setPlaying(true);
  };

  const answeredCount = points.filter((p) => p.id in answers).length;
  const correctCount = points.filter((p) => p.id in answers && p.correct.includes(answers[p.id])).length;
  const wrongPoints = points.filter((p) => p.id in answers && !p.correct.includes(answers[p.id]));

  // Action history up to the current frame, one line per street.
  const history = steps
    .slice(0, stepIdx + 1)
    .reduce<{ street: string; board: string[]; actions: string[] }[]>((acc, s) => {
      if (s.index === 0) acc.push({ street: s.street, board: boardFor(quiz.hand.boards, s.street), actions: [] });
      else acc[acc.length - 1]?.actions.push(s.label);
      return acc;
    }, []);

  const heroStack = question?.state.seats.find((s) => s.position === quiz.hand.setup.heroPosition)?.stack;
  const required = question ? requiredEquity(question.pot, question.toCall) : null;
  const chosen = question ? answers[question.id] : undefined;
  const label = (id: string) => question?.choices.find((c) => c.id === id)?.label ?? id;

  return (
    <div
      className="not-prose my-6 rounded-xl border p-3 sm:p-4 space-y-3"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
    >
      {mode === 'full' && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-bold">
            ▶ ハンドを再生
            {points.length > 0 && (
              <span className="ml-2 text-xs font-semibold" style={{ color: 'var(--color-accent)' }}>
                「この時どうする？」{points.length}問
              </span>
            )}
          </p>
          {points.length > 0 && (
            <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={muted}>
              <input type="checkbox" checked={askMode} onChange={(e) => setAskMode(e.target.checked)} />
              問題として解く
            </label>
          )}
        </div>
      )}

      {view && (
        <PokerTable street={view.street} pot={view.pot} board={view.board} players={view.players} />
      )}

      <div className="flex items-center justify-center min-h-8">
        <span
          key={stepIdx}
          className="poker-pop text-sm font-bold px-3 py-1 rounded-full"
          style={{ background: 'var(--color-accent-soft)', color: 'var(--color-accent)' }}
        >
          {step.label}
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <button type="button" className={btn} style={btnStyle} onClick={() => go(startStep)} disabled={!ready} aria-label="最初へ">
          ⏮
        </button>
        <button type="button" className={btn} style={btnStyle} onClick={() => go(stepIdx - 1)} disabled={!ready || stepIdx <= 0} aria-label="1つ戻る">
          ◀
        </button>
        <button
          type="button"
          className={btn}
          style={primaryStyle}
          disabled={!ready || blocking || isLast}
          onClick={() => setPlaying((p) => !p)}
        >
          {!ready ? '読み込み中…' : playing ? '⏸ 一時停止' : '▶ 再生'}
        </button>
        <button
          type="button"
          className={btn}
          style={btnStyle}
          onClick={() => go(stepIdx + 1)}
          disabled={!ready || blocking || isLast}
          aria-label="1つ進む"
        >
          ▶︎|
        </button>
        <span className="text-[11px] tabular-nums ml-1" style={muted}>
          {stepIdx + 1} / {steps.length}
        </span>
      </div>

      {question && askMode && (
        <div
          className="poker-pop rounded-lg border-2 p-3 space-y-2"
          style={{ borderColor: 'var(--poker-seat-active-ring)', background: 'var(--color-surface-muted)' }}
        >
          <p className="text-base font-extrabold">この時どうする？</p>
          <p className="text-sm">{question.promptText}</p>
          <p className="text-xs flex flex-wrap gap-x-3 gap-y-0.5" style={muted}>
            <span>ポット {question.pot}bb</span>
            {question.toCall > 0 && <span>コール額 {Math.min(question.toCall, heroStack ?? question.toCall)}bb</span>}
            {required !== null && <span>コールに必要な勝率 {required}%</span>}
            {typeof heroStack === 'number' && <span>Heroの残りスタック {heroStack}bb</span>}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {question.choices.map((c) => {
              const isCorrect = question.correct.includes(c.id);
              const picked = chosen === c.id;
              const style =
                chosen === undefined
                  ? btnStyle
                  : isCorrect
                    ? { ...btnStyle, borderColor: 'var(--color-poker-call)', boxShadow: 'inset 0 0 0 1px var(--color-poker-call)' }
                    : picked
                      ? { ...btnStyle, borderColor: 'var(--color-poker-raise)', boxShadow: 'inset 0 0 0 1px var(--color-poker-raise)' }
                      : { ...btnStyle, opacity: 0.5 };
              return (
                <button
                  key={c.id}
                  type="button"
                  className="text-sm font-semibold px-2 py-2 rounded-lg border cursor-pointer disabled:cursor-default"
                  style={style}
                  disabled={chosen !== undefined}
                  onClick={() => answer(c.id)}
                >
                  {c.label}
                </button>
              );
            })}
          </div>

          {chosen !== undefined && (
            <div className="poker-pop space-y-2 pt-1">
              <p
                className="text-sm font-extrabold"
                style={{ color: question.correct.includes(chosen) ? 'var(--color-poker-call)' : 'var(--color-poker-raise)' }}
              >
                {question.correct.includes(chosen) ? '正解！' : '不正解'}
                <span className="ml-2 font-semibold" style={{ color: 'var(--color-text)' }}>
                  正解: {question.correct.map(label).join(' / ')}
                </span>
              </p>
              {!question.correct.includes(question.actualChoiceId) && (
                <p className="text-xs" style={muted}>
                  実際のプレー: {label(question.actualChoiceId)}（このハンドでの反省点）
                </p>
              )}
              {question.explanation.trim() && <Paragraphs text={question.explanation} />}
              {!isLast && (
                <button
                  type="button"
                  className={btn}
                  style={primaryStyle}
                  onClick={() => {
                    setStepIdx((i) => Math.min(i + 1, lastStep));
                    setPlaying(true);
                  }}
                >
                  実際のプレーを見る ▶
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {question && !askMode && question.explanation.trim() && (
        <div className="rounded-lg border-l-4 p-3 space-y-1" style={{ borderColor: 'var(--color-accent)', background: 'var(--color-surface-muted)' }}>
          <p className="text-xs font-semibold" style={muted}>
            解説（正解: {question.correct.map(label).join(' / ')}）
          </p>
          <Paragraphs text={question.explanation} />
        </div>
      )}

      {history.length > 0 && (
        <div className="text-xs space-y-0.5 border-t pt-2" style={{ ...muted, borderColor: 'var(--color-border)' }}>
          {history.map((h) => (
            <p key={h.street}>
              <span className="font-semibold" style={{ color: 'var(--color-text)' }}>
                {STREET_LABEL[h.street as keyof typeof STREET_LABEL]}
                {h.board.length > 0 && ` (${h.board.join(' ')})`}
              </span>{' '}
              {h.actions.join(' → ') || '—'}
            </p>
          ))}
        </div>
      )}

      {mode === 'full' && askMode && points.length > 0 && answeredCount === points.length && (
        <div className="poker-pop rounded-lg p-3 space-y-2 text-sm" style={{ background: 'var(--color-accent-soft)' }}>
          <p className="font-extrabold">
            {points.length}問中 {correctCount}問正解
          </p>
          {wrongPoints.length > 0 && recordProgress && (
            <p>
              間違えた{wrongPoints.length}問は
              <a href="/quiz/" className="underline font-semibold mx-1" style={{ color: 'var(--color-accent)' }}>
                問題集
              </a>
              に保存されました。あとで解き直したり、リンクで人に共有したりできます。
            </p>
          )}
          <button type="button" className={btn} style={btnStyle} onClick={restart}>
            もう一度解く
          </button>
        </div>
      )}
    </div>
  );
}
