// SRS 間隔重複（spec 5.3、docs/architecture.md 第 5 節）。
// 全部是純函式；時間一律用 epoch 毫秒並由呼叫端傳入 now。

import type { Progress } from '../data/types';

export const MINUTE_MS = 60 * 1000;
export const DAY_MS = 24 * 60 * MINUTE_MS;

export const MAX_LEVEL = 5;

/** 各等級的下次複習間隔：0→10 分、1→1 天、2→3 天、3→7 天、4→14 天、5→30 天 */
export const INTERVALS_MS: readonly number[] = [
  10 * MINUTE_MS,
  1 * DAY_MS,
  3 * DAY_MS,
  7 * DAY_MS,
  14 * DAY_MS,
  30 * DAY_MS,
];

export function intervalFor(level: number): number {
  const l = Math.min(Math.max(Math.trunc(level), 0), MAX_LEVEL);
  return INTERVALS_MS[l];
}

/** 尚未學過的初始進度（learnedAt 為 undefined，不會出現在複習清單）。 */
export function newProgress(kanaId: string): Progress {
  return { kanaId, level: 0, nextReviewAt: 0, correctStreak: 0, wrongCount: 0 };
}

export function isLearned(p: Progress | undefined): p is Progress & { learnedAt: number } {
  return p?.learnedAt != null;
}

/** 已學且到期（nextReviewAt <= now）才算到期複習。 */
export function isDue(p: Progress | undefined, now: number): boolean {
  return isLearned(p) && p.nextReviewAt <= now;
}

/** 單題作答：答對 streak+1；答錯 streak 歸零且 wrongCount+1。不動等級。 */
export function applyAnswer(p: Progress, correct: boolean): Progress {
  return correct
    ? { ...p, correctStreak: p.correctStreak + 1 }
    : { ...p, correctStreak: 0, wrongCount: p.wrongCount + 1 };
}

/**
 * 一輪結束後更新一個字的進度。
 * answers = 這輪該字每一題的對錯（依作答順序）。
 * - 每題先套用 applyAnswer（streak、wrongCount）
 * - 全對：level = min(level + 1, 5)；有錯：level = 0
 * - nextReviewAt = now + 該等級的間隔；learnedAt 第一次作答時設定
 * answers 為空時不改動（回傳原進度或空白進度）。
 */
export function applyRoundResult(
  prev: Progress | undefined,
  kanaId: string,
  answers: boolean[],
  now: number,
): Progress {
  const base = prev ?? newProgress(kanaId);
  if (answers.length === 0) return base;
  const afterAnswers = answers.reduce<Progress>((p, ok) => applyAnswer(p, ok), base);
  const allCorrect = answers.every(Boolean);
  const level = allCorrect ? Math.min(base.level + 1, MAX_LEVEL) : 0;
  return {
    ...afterAnswers,
    level,
    nextReviewAt: now + intervalFor(level),
    learnedAt: base.learnedAt ?? now,
  };
}
