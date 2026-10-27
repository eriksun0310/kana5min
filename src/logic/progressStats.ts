// 首頁統計、連續練習天數、結果頁文字與時間格式（docs/architecture.md 第 5 節）。

import { seionOrder, SEION_COUNT } from '../data';
import type { Progress, Script } from '../data/types';
import { DAY_MS, isDue, MINUTE_MS } from './srs';
import { NEW_PER_SESSION, learnedIdSet } from './session';

// ---------------------------------------------------------------- 首頁

export type DotState = 'learned' | 'next' | 'rest';

export interface HomeStats {
  /** 已學清音數 */
  learnedCount: number;
  /** 清音總數（46） */
  total: number;
  /** 現在到期的複習數 */
  dueCount: number;
  /** 今天會學的新字數（0–3） */
  newTodayCount: number;
  /** 下一個新字的 Kana id；全部學完時為 undefined */
  nextKanaId?: string;
  /** 46 格進度條：已學／下一個新字／其餘 */
  dots: DotState[];
}

export function computeHomeStats(
  allProgress: Progress[],
  now: number,
  script: Script = 'hiragana',
): HomeStats {
  const order = seionOrder(script);
  const learned = learnedIdSet(allProgress);
  let nextKanaId: string | undefined;
  const dots: DotState[] = order.map((k) => {
    if (learned.has(k.id)) return 'learned';
    if (nextKanaId === undefined) {
      nextKanaId = k.id;
      return 'next';
    }
    return 'rest';
  });
  const learnedCount = order.filter((k) => learned.has(k.id)).length;
  return {
    learnedCount,
    total: order.length || SEION_COUNT,
    dueCount: allProgress.filter((p) => isDue(p, now)).length,
    newTodayCount: Math.min(NEW_PER_SESSION, order.length - learnedCount),
    nextKanaId,
    dots,
  };
}

// ---------------------------------------------------------------- 連續練習天數

/** 以本地時區轉成 'YYYY-MM-DD'。 */
export function toDateKey(ms: number): string {
  const d = new Date(ms);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 12); // 取中午避免 DST 邊界
}

function previousDayKey(key: string): string {
  const d = parseDateKey(key);
  d.setDate(d.getDate() - 1);
  return toDateKey(d.getTime());
}

/** 記錄今天有練習：回傳排序且不重複的日期清單（只保留最近 400 天）。 */
export function addPracticeDate(dates: string[], now: number): string[] {
  const set = new Set(dates);
  set.add(toDateKey(now));
  return [...set].sort().slice(-400);
}

/**
 * 連續練習天數：從今天往回數；今天還沒練的話，從昨天開始算（昨天有練就還沒斷）。
 */
export function computeStreak(practiceDates: string[], now: number): number {
  const set = new Set(practiceDates);
  const today = toDateKey(now);
  let cursor = set.has(today) ? today : previousDayKey(today);
  let streak = 0;
  while (set.has(cursor)) {
    streak += 1;
    cursor = previousDayKey(cursor);
  }
  return streak;
}

// ---------------------------------------------------------------- 結果頁

/** 下次複習時間的顯示：10 分鐘後／明天／N 天後。 */
export function formatNextReview(nextReviewAt: number, now: number): string {
  const diff = Math.max(0, nextReviewAt - now);
  if (diff < 60 * MINUTE_MS) return `${Math.max(1, Math.round(diff / MINUTE_MS))} 分鐘後`;
  if (diff < DAY_MS) return `${Math.round(diff / (60 * MINUTE_MS))} 小時後`;
  const days = Math.round(diff / DAY_MS);
  return days <= 1 ? '明天' : `${days} 天後`;
}

/** 用時：不到 1 分鐘顯示「N 秒」，否則四捨五入成「N 分」。 */
export function formatElapsed(ms: number): string {
  const sec = Math.max(0, Math.round(ms / 1000));
  if (sec < 60) return `${sec} 秒`;
  return `${Math.round(sec / 60)} 分`;
}

export type ResultTone = 'normal' | 'wrong';

export interface ResultItem {
  kanaId: string;
  isNew: boolean;
  /** 新學會／答錯 N 次／記得很熟／記得 */
  label: string;
  /** wrong 時用答錯色文字 */
  tone: ResultTone;
  /** 10 分鐘後／明天／N 天後 */
  when: string;
}

/** 單個字在結果頁的狀態文字。 */
export function resultLabel(args: {
  isNew: boolean;
  wrongAnswers: number;
  levelAfter: number;
}): { label: string; tone: ResultTone } {
  if (args.wrongAnswers > 0) return { label: `答錯 ${args.wrongAnswers} 次`, tone: 'wrong' };
  if (args.isNew) return { label: '新學會', tone: 'normal' };
  return { label: args.levelAfter >= 3 ? '記得很熟' : '記得', tone: 'normal' };
}

export interface ResultSummary {
  correct: number;
  total: number;
  newCount: number;
  reviewCount: number;
  elapsedMs: number;
  items: ResultItem[];
}

/**
 * 組出結果頁資料。
 * answers = 這輪每個字的所有題目對錯；before/after = 提交前後的進度。
 * 新字 = before 裡沒有 learnedAt、after 有 learnedAt。
 * items 順序：新字在前，再來是複習字，各自依 answers 的 key 順序。
 */
export function buildResultSummary(args: {
  answers: Record<string, boolean[]>;
  before: Progress[];
  after: Progress[];
  startedAt: number;
  finishedAt: number;
}): ResultSummary {
  const { answers, before, after, startedAt, finishedAt } = args;
  const beforeLearned = learnedIdSet(before);
  const afterMap = new Map(after.map((p) => [p.kanaId, p]));

  let correct = 0;
  let total = 0;
  const newItems: ResultItem[] = [];
  const reviewItems: ResultItem[] = [];
  for (const [kanaId, list] of Object.entries(answers)) {
    correct += list.filter(Boolean).length;
    total += list.length;
    const p = afterMap.get(kanaId);
    if (!p) continue;
    const isNew = !beforeLearned.has(kanaId);
    const { label, tone } = resultLabel({
      isNew,
      wrongAnswers: list.filter((ok) => !ok).length,
      levelAfter: p.level,
    });
    const item: ResultItem = {
      kanaId,
      isNew,
      label,
      tone,
      when: formatNextReview(p.nextReviewAt, finishedAt),
    };
    (isNew ? newItems : reviewItems).push(item);
  }
  return {
    correct,
    total,
    newCount: newItems.length,
    reviewCount: reviewItems.length,
    elapsedMs: Math.max(0, finishedAt - startedAt),
    items: [...newItems, ...reviewItems],
  };
}
