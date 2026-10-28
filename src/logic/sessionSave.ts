// 進行中的一輪的存檔格式與判斷（純函式；AsyncStorage 讀寫在 src/store/sessionSaveStorage.ts）。
// 存檔與 SRS（sqlite）分開：存檔只是「這一輪做到哪」，SRS 仍只在提交時寫入。

import type { QuizQuestion } from './session';
import { toDateKey } from './progressStats';

export const SESSION_SAVE_VERSION = 1;

export interface SavedSession {
  version: number;
  /** 存檔當天（本地 YYYY-MM-DD）；日期變了就作廢 */
  day: string;
  savedAt: number;
  mode: 'daily' | 'auto' | 'confuse';
  groupId: string | null;
  phase: 'learn' | 'quiz';
  newKanaIds: string[];
  reviewKanaIds: string[];
  learnedIds: string[];
  newIndex: number;
  questions: QuizQuestion[];
  /** 下一題（尚未作答）的位置；等於題數代表題目都答完了、只差提交 */
  qIndex: number;
  answers: Record<string, boolean[]>;
  loanwordAnswers: boolean[];
  startedAt: number;
  usedMs: number;
  limitMs: number;
}

export function serializeSession(saved: SavedSession): string {
  return JSON.stringify(saved);
}

/**
 * 解析存檔；格式不對、版本不符、或不是今天（本地日期）的存檔一律回傳 null。
 */
export function parseSavedSession(raw: string | null, now: number): SavedSession | null {
  if (!raw) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isSavedSession(data)) return null;
  return data.day === toDateKey(now) ? data : null;
}

function isSavedSession(d: unknown): d is SavedSession {
  if (!d || typeof d !== 'object') return false;
  const s = d as Partial<SavedSession>;
  return (
    s.version === SESSION_SAVE_VERSION &&
    typeof s.day === 'string' &&
    (s.mode === 'daily' || s.mode === 'auto' || s.mode === 'confuse') &&
    (s.phase === 'learn' || s.phase === 'quiz') &&
    Array.isArray(s.newKanaIds) &&
    Array.isArray(s.reviewKanaIds) &&
    Array.isArray(s.learnedIds) &&
    Array.isArray(s.questions) &&
    typeof s.newIndex === 'number' &&
    typeof s.qIndex === 'number' &&
    !!s.answers &&
    typeof s.answers === 'object' &&
    Array.isArray(s.loanwordAnswers) &&
    typeof s.usedMs === 'number' &&
    typeof s.limitMs === 'number'
  );
}

/** 有沒有值得存的進度（什麼都沒做就離開不留存檔）。 */
export function hasSessionProgress(s: {
  mode: 'daily' | 'auto' | 'confuse';
  phase: 'learn' | 'quiz';
  newKanaIds: readonly string[];
  newIndex: number;
  answers: Record<string, boolean[]>;
  loanwordAnswers: boolean[];
}): boolean {
  const answered =
    Object.values(s.answers).reduce((n, list) => n + list.length, 0) + s.loanwordAnswers.length;
  if (answered > 0) return true;
  // 新字已經學完、進了測驗也算進度（還沒測驗的新字不算學會，但學習流程值得留著）
  return s.mode === 'daily' && (s.newIndex > 0 || (s.phase === 'quiz' && s.newKanaIds.length > 0));
}

/**
 * 時間到之後：把 from 之後還沒作答的「新字題」排到前面（穩定排序）。
 * 新字一定要測驗完才算學會，時間只限制後面的複習題。
 * 回傳新的題目陣列與是否有新字題。
 */
export function newQuestionsFirst(
  questions: readonly QuizQuestion[],
  from: number,
  newKanaIds: ReadonlySet<string>,
): { questions: QuizQuestion[]; hasNew: boolean } {
  const head = questions.slice(0, from);
  const rest = questions.slice(from);
  const fresh = rest.filter((q) => newKanaIds.has(q.kanaId));
  const others = rest.filter((q) => !newKanaIds.has(q.kanaId));
  return { questions: [...head, ...fresh, ...others], hasNew: fresh.length > 0 };
}
