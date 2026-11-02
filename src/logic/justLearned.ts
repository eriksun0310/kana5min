// 「剛學的字」：首頁與練習頁的「練剛學的字」入口用。純函式。

import { seionOrder } from '../data';
import type { Progress } from '../data/types';
import { toDateKey } from './progressStats';
import { NEW_PER_SESSION } from './session';
import { isLearned } from './srs';

/** 一天新學超過這麼多個字，首頁顯示「學太快容易忘」的提醒（只是提醒，不擋任何按鈕）。 */
export const LEARN_FAST_THRESHOLD = 9;

/** 今天（本地時區）第一次學會的字，依學會時間由早到晚。 */
export function learnedToday(allProgress: readonly Progress[], now: number): Progress[] {
  const today = toDateKey(now);
  return allProgress
    .filter(isLearned)
    .filter((p) => toDateKey(p.learnedAt) === today)
    .sort((a, b) => a.learnedAt - b.learnedAt || a.kanaId.localeCompare(b.kanaId));
}

/**
 * 最近一輪剛學的字（最多 NEW_PER_SESSION 個）：只看今天學的，取最晚學會的幾個，
 * 回傳時依五十音順序排列（同一輪的學會時間順序取決於作答順序，不可靠）。今天還沒學新字時回傳空陣列。
 */
export function justLearnedIds(allProgress: readonly Progress[], now: number, limit: number = NEW_PER_SESSION): string[] {
  const today = learnedToday(allProgress, now);
  const rank = new Map([...seionOrder('hiragana'), ...seionOrder('katakana')].map((k, i) => [k.id, i]));
  const at = (id: string) => rank.get(id) ?? Number.MAX_SAFE_INTEGER;
  return today
    .slice(Math.max(0, today.length - limit))
    .map((p) => p.kanaId)
    .sort((a, b) => at(a) - at(b));
}

/** 今天是否學得太快（超過門檻）。 */
export function learnedTooFast(allProgress: readonly Progress[], now: number): boolean {
  return learnedToday(allProgress, now).length > LEARN_FAST_THRESHOLD;
}
