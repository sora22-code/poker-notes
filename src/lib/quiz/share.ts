import { isHandQuiz, type HandQuiz, type QuizSetItem } from './types';

/** Everything needed to play a problem set, so a link works for anyone without a server. */
export interface SharedSet {
  v: 1;
  title: string;
  quizzes: HandQuiz[];
  items: QuizSetItem[];
}

export const SHARE_HASH_KEY = 'set';

/** Keeps only the questions in `items`, so the link carries no unrelated hands or explanations. */
export function buildSet(title: string, items: QuizSetItem[], lookup: (quizId: string) => HandQuiz | undefined): SharedSet {
  const needed = new Map<string, Set<string>>();
  for (const item of items) {
    if (!needed.has(item.quizId)) needed.set(item.quizId, new Set());
    needed.get(item.quizId)!.add(item.pointId);
  }
  const quizzes: HandQuiz[] = [];
  for (const [quizId, pointIds] of needed) {
    const quiz = lookup(quizId);
    if (quiz) quizzes.push({ ...quiz, points: quiz.points.filter((p) => pointIds.has(p.id)) });
  }
  const available = new Set(quizzes.flatMap((q) => q.points.map((p) => `${q.id}::${p.id}`)));
  return { v: 1, title, quizzes, items: items.filter((i) => available.has(`${i.quizId}::${i.pointId}`)) };
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array {
  const base64 = text.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Blob([bytes as BlobPart]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

/** "z" + deflated JSON when the browser can compress (links ~4x shorter), "j" + plain JSON otherwise. */
export async function encodeSet(set: SharedSet): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(set));
  if (typeof CompressionStream !== 'undefined') {
    return `z${toBase64Url(await pipe(json, new CompressionStream('deflate-raw')))}`;
  }
  return `j${toBase64Url(json)}`;
}

export async function decodeSet(encoded: string): Promise<SharedSet | null> {
  try {
    const bytes = fromBase64Url(encoded.slice(1));
    const json =
      encoded[0] === 'z' ? await pipe(bytes, new DecompressionStream('deflate-raw')) : encoded[0] === 'j' ? bytes : null;
    if (!json) return null;
    const parsed = JSON.parse(new TextDecoder().decode(json)) as SharedSet;
    if (parsed.v !== 1 || !Array.isArray(parsed.items) || !parsed.quizzes.every(isHandQuiz)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function shareUrl(encoded: string): string {
  return `${window.location.origin}/quiz/#${SHARE_HASH_KEY}=${encoded}`;
}

export function readSharedHash(): string | null {
  const match = window.location.hash.match(new RegExp(`^#${SHARE_HASH_KEY}=(.+)$`));
  return match ? match[1] : null;
}
