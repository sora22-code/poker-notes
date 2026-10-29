import { useEffect, useMemo, useRef, useState } from 'react';
import ReplayTable, { type SeatActionKind } from './ReplayTable';
import { STREET_LABEL, boardFor, computeHand, formatLabel, tableView } from '../../lib/poker/nlh';
import { buildSteps, requiredEquity, resolvePoints, stepIndexOf, type ResolvedPoint } from '../../lib/quiz/engine';
import { recordAnswer } from '../../lib/quiz/progress';
import type { HandQuiz } from '../../lib/quiz/types';
import type { Position } from '../../lib/poker/types';

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
const replayMuted = { color: 'var(--replay-text-muted)' };
const ctrlStyle = { borderColor: 'rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.08)', color: 'var(--replay-text)' };

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
  // Only scroll the answer buttons into view once the reader has started the hand, never on page load.
  const interacted = useRef(mode === 'single');
  const questionRef = useRef<HTMLDivElement>(null);

  const lastStep = steps.length - 1;
  const step = steps[Math.min(stepIdx, lastStep)];
  const question = pointAtStep.get(stepIdx);
  const blocking = Boolean(question && askMode && !(question.id in answers));

  useEffect(() => {
    const el = questionRef.current;
    if (!blocking || !interacted.current || !el) return;
    if (el.getBoundingClientRect().bottom > window.innerHeight) el.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [blocking, stepIdx]);

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
    // Keep every seat on the table so the layout doesn't jump between streets; folded players are dimmed.
    showFolded: true,
    showVillainCards: isLast && !result.endedByFold,
  });

  const answer = (choiceId: string) => {
    if (!question) return;
    const correct = question.correct.includes(choiceId);
    setAnswers((a) => ({ ...a, [question.id]: choiceId }));
    if (recordProgress) recordAnswer(quiz, question.id, choiceId, correct);
    onAnswered?.(question.id, correct);
  };

  // Each player's latest action on the current street, for the speech bubbles.
  const lastActions = new Map<Position, SeatActionKind>();
  for (const a of result.streets[step.street].actions.slice(0, step.index)) {
    lastActions.set(a.position, a.allIn && (a.kind === 'bet' || a.kind === 'raise') ? 'allin' : a.kind);
  }

  const go = (idx: number) => {
    setPlaying(false);
    setStepIdx(Math.max(0, Math.min(idx, lastStep)));
  };

  const restart = () => {
    interacted.current = true;
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

  const toAct = view?.players.find((p) => p.isActive)?.position;
  const tone = (id: string) =>
    id === 'fold'
      ? 'var(--replay-fold-btn)'
      : id === 'check'
        ? 'var(--replay-check-btn)'
        : id === 'call'
          ? 'var(--replay-call)'
          : id === 'allin'
            ? 'var(--replay-allin)'
            : 'var(--replay-raise)';

  return (
    <div className="not-prose my-6 space-y-3" style={{ color: 'var(--color-text)' }}>
      <div
        className="@container rounded-2xl p-3 sm:p-4 space-y-3 shadow-lg"
        style={{ background: 'linear-gradient(180deg, var(--replay-bg-1), var(--replay-bg-2))', color: 'var(--replay-text)' }}
      >
        {mode === 'full' && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-bold">
              ▶ ハンドを再生
              {points.length > 0 && (
                <span className="ml-2 text-xs font-semibold" style={{ color: 'var(--replay-active)' }}>
                  「この時どうする？」{points.length}問
                </span>
              )}
            </p>
            {points.length > 0 && (
              <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={replayMuted}>
                <input type="checkbox" checked={askMode} onChange={(e) => setAskMode(e.target.checked)} />
                問題として解く
              </label>
            )}
          </div>
        )}

        <div className="space-y-2">
          <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.14)' }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${((stepIdx + 1) / steps.length) * 100}%`,
                background: 'var(--replay-hero)',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
          <div className="flex flex-wrap items-center gap-1.5 min-h-7">
            <span className="text-xs font-extrabold mr-0.5" style={{ color: 'var(--replay-hero)' }}>
              {STREET_LABEL[step.street]}
            </span>
            <span
              key={stepIdx}
              className="poker-pop text-xs font-bold px-2.5 py-1 rounded-lg border"
              style={{ background: 'rgba(8,15,35,0.55)', borderColor: 'rgba(255,255,255,0.12)' }}
            >
              {step.label}
            </span>
            {toAct && !isLast && (
              <span
                className="text-xs font-bold px-2.5 py-1 rounded-lg border"
                style={{ borderColor: 'var(--replay-hero)', background: 'rgba(37,99,235,0.18)' }}
              >
                {toAct} アクション待ち
              </span>
            )}
          </div>
        </div>

        {view && (
          <ReplayTable
            street={view.street}
            pot={view.pot}
            board={view.board}
            players={view.players.map((p) => ({ ...p, lastAction: lastActions.get(p.position) }))}
            meta={formatLabel(quiz.hand.setup)}
            asking={blocking}
          />
        )}

        {question && askMode && (
          <div ref={questionRef} className="space-y-2.5">
            <p className="text-sm font-semibold leading-relaxed">{question.promptText}</p>
            <div className="flex flex-wrap gap-1.5 text-[11px] font-semibold">
              {[
                `ポット ${question.pot}bb`,
                question.toCall > 0 ? `コール額 ${Math.min(question.toCall, heroStack ?? question.toCall)}bb` : null,
                required !== null ? `コールに必要な勝率 ${required}%` : null,
                typeof heroStack === 'number' ? `残りスタック ${heroStack}bb` : null,
              ]
                .filter(Boolean)
                .map((t) => (
                  <span key={t} className="px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }}>
                    {t}
                  </span>
                ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              {question.choices.map((c) => {
                const isCorrect = question.correct.includes(c.id);
                const picked = chosen === c.id;
                const settled = chosen !== undefined;
                return (
                  <button
                    key={c.id}
                    type="button"
                    className="relative min-h-12 px-2 py-2 rounded-xl text-sm @md:text-base font-extrabold leading-tight cursor-pointer disabled:cursor-default"
                    style={{
                      background: tone(c.id),
                      color: '#ffffff',
                      boxShadow: settled && (isCorrect || picked)
                        ? `0 0 0 3px ${isCorrect ? '#4ade80' : '#f87171'}, inset 0 -3px 0 rgba(0,0,0,0.25)`
                        : 'inset 0 -3px 0 rgba(0,0,0,0.25)',
                      opacity: settled && !isCorrect && !picked ? 0.35 : 1,
                    }}
                    disabled={!ready || settled}
                    onClick={() => answer(c.id)}
                  >
                    {settled && isCorrect && <span className="mr-1">✓</span>}
                    {settled && picked && !isCorrect && <span className="mr-1">✗</span>}
                    {c.label}
                  </button>
                );
              })}
            </div>

            {chosen !== undefined && (
              <div className="poker-pop flex flex-wrap items-center justify-between gap-2">
                <p className="text-base font-extrabold" style={{ color: question.correct.includes(chosen) ? '#4ade80' : '#f87171' }}>
                  {question.correct.includes(chosen) ? '正解！' : '不正解'}
                  <span className="ml-2 text-sm font-semibold" style={{ color: 'var(--replay-text)' }}>
                    正解: {question.correct.map(label).join(' / ')}
                  </span>
                </p>
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

        <div className="flex flex-wrap items-center justify-center gap-1.5">
          <button type="button" className={btn} style={ctrlStyle} onClick={() => go(startStep)} disabled={!ready} aria-label="最初へ">
            ⏮
          </button>
          <button type="button" className={btn} style={ctrlStyle} onClick={() => go(stepIdx - 1)} disabled={!ready || stepIdx <= 0} aria-label="1つ戻る">
            ◀
          </button>
          <button
            type="button"
            className={btn}
            style={primaryStyle}
            disabled={!ready || blocking || isLast}
            onClick={() => {
              interacted.current = true;
              setPlaying((p) => !p);
            }}
          >
            {!ready ? '読み込み中…' : playing ? '⏸ 一時停止' : '▶ 再生'}
          </button>
          <button
            type="button"
            className={btn}
            style={ctrlStyle}
            onClick={() => {
              interacted.current = true;
              go(stepIdx + 1);
            }}
            disabled={!ready || blocking || isLast}
            aria-label="1つ進む"
          >
            ▶︎|
          </button>
          <span className="text-[11px] tabular-nums ml-1" style={replayMuted}>
            {stepIdx + 1} / {steps.length}
          </span>
        </div>
      </div>

      {question && askMode && chosen !== undefined && (
        <div
          className="poker-pop rounded-xl border p-3 space-y-2"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <p className="text-xs font-semibold" style={muted}>
            解説
          </p>
          {!question.correct.includes(question.actualChoiceId) && (
            <p className="text-xs" style={muted}>
              実際のプレー: {label(question.actualChoiceId)}（このハンドでの反省点）
            </p>
          )}
          {question.explanation.trim() ? <Paragraphs text={question.explanation} /> : <p className="text-sm" style={muted}>解説はありません。</p>}
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
