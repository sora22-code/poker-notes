import { useEffect, useMemo, useState } from 'react';
import HandReplayer from '../poker/HandReplayer';
import { pointHeadline, resolvePoints, type ResolvedPoint } from '../../lib/quiz/engine';
import { forgetAnswers, loadProgress, onProgressChange, wrongItems, type QuizProgress } from '../../lib/quiz/progress';
import { buildSet, decodeSet, encodeSet, readSharedHash, shareUrl } from '../../lib/quiz/share';
import { answerKey, type HandQuiz, type QuizSetItem } from '../../lib/quiz/types';

interface Session {
  title: string;
  items: QuizSetItem[];
  /** Quizzes carried by a shared link; site and saved quizzes are looked up separately. */
  quizzes: Record<string, HandQuiz>;
  shared: boolean;
}

const btn = 'text-xs font-semibold px-3 py-1.5 rounded-full border cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed';
const btnStyle = { borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)' };
const primaryStyle = { background: 'var(--color-accent)', color: '#fff', borderColor: 'var(--color-accent)' };
const panel = { background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' };
const muted = { color: 'var(--color-text-muted)' };

function ShareBox({ title: defaultTitle, items, lookup }: { title: string; items: QuizSetItem[]; lookup: (id: string) => HandQuiz | undefined }) {
  const [title, setTitle] = useState(defaultTitle);
  const [url, setUrl] = useState('');
  const [copied, setCopied] = useState(false);

  const create = async () => {
    const link = shareUrl(await encodeSet(buildSet(title.trim() || defaultTitle, items, lookup)));
    setUrl(link);
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="rounded-lg border p-3 space-y-2" style={{ borderColor: 'var(--color-border)' }}>
      <p className="text-sm font-semibold">リンクで共有（{items.length}問）</p>
      <div className="flex flex-wrap gap-2">
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setUrl('');
          }}
          className="flex-1 min-w-40 text-sm rounded border px-2 py-1.5"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-muted)', color: 'var(--color-text)' }}
          aria-label="問題集のタイトル"
        />
        <button type="button" className={btn} style={primaryStyle} onClick={create} disabled={items.length === 0}>
          リンクを作ってコピー
        </button>
        {url && typeof navigator !== 'undefined' && 'share' in navigator && (
          <button type="button" className={btn} style={btnStyle} onClick={() => navigator.share({ title, url }).catch(() => {})}>
            共有…
          </button>
        )}
      </div>
      {url && (
        <>
          <input
            readOnly
            value={url}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full text-xs font-mono rounded border px-2 py-1.5"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-muted)', color: 'var(--color-text)' }}
          />
          <p className="text-xs" style={muted}>
            {copied ? 'コピーしました。' : ''}リンクに問題と解説がすべて入っているので、開いた人はログインなしでそのまま解けます。
          </p>
        </>
      )}
    </div>
  );
}

function Runner({ session, lookup, onExit }: { session: Session; lookup: (id: string) => HandQuiz | undefined; onExit: () => void }) {
  const [items, setItems] = useState(session.items);
  const [idx, setIdx] = useState(0);
  const [results, setResults] = useState<Record<number, boolean>>({});
  const done = idx >= items.length;
  const item = items[idx];
  const quiz = item ? lookup(item.quizId) : undefined;

  const retryWrong = () => {
    setItems(items.filter((_, i) => results[i] === false));
    setResults({});
    setIdx(0);
  };

  const correct = Object.values(results).filter(Boolean).length;
  const wrong = items.filter((_, i) => results[i] === false);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs" style={muted}>
            {session.shared ? '共有された問題集' : '問題集'}
          </p>
          <h2 className="text-lg font-extrabold">{session.title}</h2>
        </div>
        <button type="button" className={btn} style={btnStyle} onClick={onExit}>
          一覧に戻る
        </button>
      </div>

      {session.shared && idx === 0 && Object.keys(results).length === 0 && (
        <p className="text-xs rounded-lg p-2.5" style={{ background: 'var(--color-accent-soft)' }}>
          共有リンクから開いた問題集です。解いた結果はこのブラウザの「間違えた問題」に記録されます。
        </p>
      )}

      {!done && item && (
        <>
          <p className="text-sm font-semibold">
            問題 {idx + 1} / {items.length}
            {quiz && <span className="ml-2 text-xs font-normal" style={muted}>{quiz.title}</span>}
          </p>
          {quiz ? (
            <HandReplayer
              key={`${idx}-${answerKey(item.quizId, item.pointId)}`}
              quiz={quiz}
              mode="single"
              pointId={item.pointId}
              onAnswered={(_, ok) => setResults((r) => ({ ...r, [idx]: ok }))}
            />
          ) : (
            <p className="text-sm" style={muted}>
              この問題のデータが見つかりませんでした（元の記事が更新された可能性があります）。
            </p>
          )}
          <div className="flex justify-end gap-2">
            {quiz?.source && (
              <a href={`/articles/${quiz.source.slug}/`} className={btn} style={btnStyle}>
                元の記事を読む
              </a>
            )}
            <button
              type="button"
              className={btn}
              style={primaryStyle}
              disabled={quiz !== undefined && !(idx in results)}
              onClick={() => setIdx(idx + 1)}
            >
              {idx + 1 < items.length ? '次の問題へ' : '結果を見る'}
            </button>
          </div>
        </>
      )}

      {done && (
        <div className="rounded-xl border p-4 space-y-3" style={panel}>
          <p className="text-lg font-extrabold">
            {items.length}問中 {correct}問正解
          </p>
          <ul className="text-sm space-y-1">
            {items.map((it, i) => {
              const q = lookup(it.quizId);
              const p = q?.points.find((pt) => pt.id === it.pointId);
              return (
                <li key={i} className="flex gap-2">
                  <span style={{ color: results[i] ? 'var(--color-poker-call)' : 'var(--color-poker-raise)' }}>
                    {results[i] ? '◯' : '✕'}
                  </span>
                  <span>{q && p ? pointHeadline(q, p) : '不明な問題'}</span>
                </li>
              );
            })}
          </ul>
          <div className="flex flex-wrap gap-2">
            {wrong.length > 0 && (
              <button type="button" className={btn} style={primaryStyle} onClick={retryWrong}>
                間違えた{wrong.length}問をもう一度
              </button>
            )}
            <button type="button" className={btn} style={btnStyle} onClick={onExit}>
              一覧に戻る
            </button>
          </div>
          {wrong.length > 0 && <ShareBox title={`${session.title}（間違えた問題）`} items={wrong} lookup={lookup} />}
        </div>
      )}
    </div>
  );
}

function PointRow({
  quiz,
  point,
  status,
  onPlay,
  onRemove,
  showSource,
}: {
  quiz: HandQuiz;
  point: ResolvedPoint;
  status?: 'correct' | 'wrong';
  onPlay: () => void;
  onRemove?: () => void;
  showSource?: boolean;
}) {
  return (
    <li className="rounded-lg border p-3 flex flex-wrap items-start justify-between gap-2" style={{ borderColor: 'var(--color-border)' }}>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">
          {pointHeadline(quiz, point)}
          {status && (
            <span
              className="ml-2 inline-block whitespace-nowrap text-[11px] px-1.5 py-0.5 rounded"
              style={{
                color: status === 'correct' ? 'var(--color-poker-call)' : 'var(--color-poker-raise)',
                background: 'var(--color-surface-muted)',
              }}
            >
              {status === 'correct' ? '正解済み' : '不正解'}
            </span>
          )}
        </p>
        <p className="text-xs mt-0.5" style={muted}>
          {point.promptText}
        </p>
        {showSource && quiz.source && (
          <a href={`/articles/${quiz.source.slug}/`} className="text-xs underline" style={{ color: 'var(--color-accent)' }}>
            {quiz.source.title}
          </a>
        )}
      </div>
      <div className="flex gap-1.5">
        <button type="button" className={btn} style={primaryStyle} onClick={onPlay}>
          解く
        </button>
        {onRemove && (
          <button type="button" className={btn} style={btnStyle} onClick={onRemove}>
            外す
          </button>
        )}
      </div>
    </li>
  );
}

export default function QuizHub({ siteQuizzes }: { siteQuizzes: HandQuiz[] }) {
  const [progress, setProgress] = useState<QuizProgress>(loadProgress);
  const [tab, setTab] = useState<'wrong' | 'all'>('wrong');
  const [session, setSession] = useState<Session | null>(null);
  const [shareError, setShareError] = useState(false);

  useEffect(() => onProgressChange(() => setProgress(loadProgress())), []);

  useEffect(() => {
    const encoded = readSharedHash();
    if (!encoded) return;
    decodeSet(encoded).then((set) => {
      if (!set || set.items.length === 0) {
        setShareError(true);
        return;
      }
      setSession({
        title: set.title || '共有された問題集',
        items: set.items,
        quizzes: Object.fromEntries(set.quizzes.map((q) => [q.id, q])),
        shared: true,
      });
    });
  }, []);

  const siteById = useMemo(() => new Map(siteQuizzes.map((q) => [q.id, q])), [siteQuizzes]);
  // Prefer the site's current version of a quiz so fixes to an article reach saved and shared questions.
  const lookup = (id: string) => siteById.get(id) ?? session?.quizzes[id] ?? progress.quizzes[id];

  const resolved = useMemo(() => {
    const cache = new Map<string, Map<string, ResolvedPoint>>();
    return (quiz: HandQuiz) => {
      if (!cache.has(quiz.id)) cache.set(quiz.id, new Map(resolvePoints(quiz).map((p) => [p.id, p])));
      return cache.get(quiz.id)!;
    };
  }, [siteQuizzes, progress]);

  const wrong = wrongItems(progress).flatMap((w) => {
    const quiz = lookup(w.quizId);
    const point = quiz ? resolved(quiz).get(w.pointId) : undefined;
    return quiz && point ? [{ ...w, quiz, point }] : [];
  });

  const status = (quizId: string, pointId: string) => {
    const r = progress.answers[answerKey(quizId, pointId)];
    return r ? (r.lastCorrect ? 'correct' : 'wrong') : undefined;
  };

  const allItems = siteQuizzes.flatMap((q) => [...resolved(q).values()].map((p) => ({ quizId: q.id, pointId: p.id })));
  const unanswered = allItems.filter((i) => !progress.answers[answerKey(i.quizId, i.pointId)]);

  const play = (title: string, items: QuizSetItem[]) => {
    setSession({ title, items, quizzes: {}, shared: false });
    window.scrollTo({ top: 0 });
  };

  const exit = () => {
    setSession(null);
    if (window.location.hash) history.replaceState(null, '', window.location.pathname);
  };

  if (session) return <Runner session={session} lookup={lookup} onExit={exit} />;

  return (
    <div className="space-y-4">
      {shareError && (
        <p className="text-sm rounded-lg border-l-4 p-3" style={{ borderColor: 'var(--color-poker-raise)', background: 'var(--color-surface)' }}>
          共有リンクを読み込めませんでした。リンクが途中で切れていないか確認してください。
        </p>
      )}

      <div className="flex gap-1.5" role="tablist">
        {(
          [
            ['wrong', `間違えた問題 (${wrong.length})`],
            ['all', `すべての問題 (${allItems.length})`],
          ] as const
        ).map(([key, text]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            className={btn}
            style={tab === key ? primaryStyle : btnStyle}
            onClick={() => setTab(key)}
          >
            {text}
          </button>
        ))}
      </div>

      {tab === 'wrong' && (
        <div className="space-y-3">
          {wrong.length === 0 ? (
            <div className="rounded-xl border p-4 text-sm space-y-2" style={panel}>
              <p>間違えた問題はまだありません。</p>
              <p style={muted}>
                記事の「ハンドを再生」で「この時どうする？」に答えると、間違えた問題がここに溜まります。正解するまで何度でも解き直せて、正解すると一覧から外れます。
              </p>
              {allItems.length > 0 && (
                <button type="button" className={btn} style={primaryStyle} onClick={() => setTab('all')}>
                  問題を解いてみる
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={btn}
                  style={primaryStyle}
                  onClick={() => play('間違えた問題の解き直し', wrong.map(({ quizId, pointId }) => ({ quizId, pointId })))}
                >
                  まとめて解き直す（{wrong.length}問）
                </button>
              </div>
              <ul className="space-y-2">
                {wrong.map((w) => (
                  <PointRow
                    key={answerKey(w.quizId, w.pointId)}
                    quiz={w.quiz}
                    point={w.point}
                    showSource
                    onPlay={() => play(pointHeadline(w.quiz, w.point), [{ quizId: w.quizId, pointId: w.pointId }])}
                    onRemove={() => forgetAnswers([{ quizId: w.quizId, pointId: w.pointId }])}
                  />
                ))}
              </ul>
              <ShareBox
                title="間違えた問題集"
                items={wrong.map(({ quizId, pointId }) => ({ quizId, pointId }))}
                lookup={lookup}
              />
            </>
          )}
        </div>
      )}

      {tab === 'all' && (
        <div className="space-y-4">
          {unanswered.length > 0 && (
            <button type="button" className={btn} style={primaryStyle} onClick={() => play('未回答の問題', unanswered)}>
              未回答の問題を解く（{unanswered.length}問）
            </button>
          )}
          {siteQuizzes.length === 0 && <p className="text-sm" style={muted}>まだ問題がありません。</p>}
          {siteQuizzes.map((quiz) => {
            const points = [...resolved(quiz).values()];
            if (points.length === 0) return null;
            return (
              <section key={quiz.id} className="rounded-xl border p-4 space-y-2" style={panel}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <a
                    href={quiz.source ? `/articles/${quiz.source.slug}/` : undefined}
                    className="font-bold text-sm hover:underline"
                  >
                    {quiz.title}
                  </a>
                  <button
                    type="button"
                    className={btn}
                    style={btnStyle}
                    onClick={() => play(quiz.title, points.map((p) => ({ quizId: quiz.id, pointId: p.id })))}
                  >
                    この記事の{points.length}問を解く
                  </button>
                </div>
                <ul className="space-y-2">
                  {points.map((p) => (
                    <PointRow
                      key={p.id}
                      quiz={quiz}
                      point={p}
                      status={status(quiz.id, p.id)}
                      onPlay={() => play(quiz.title, [{ quizId: quiz.id, pointId: p.id }])}
                    />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
