// 畢業判斷與畢業畫面的統計（docs/architecture.md 第 11 節）。純函式，不依賴 React Native。

import type { Progress, Script } from '../data/types';
import { seionOrder } from '../data';
import { isSeionLearned, learnedIdSet } from './session';

/** 平假名與片假名清音（各 46 個）都已學 → 畢業。 */
export function isGraduated(progress: readonly Progress[]): boolean {
  return isSeionLearned(progress, 'hiragana') && isSeionLearned(progress, 'katakana');
}

/** 該文字已學的清音數（畢業畫面的統計；濁音、拗音不算）。 */
export function learnedSeionCount(progress: readonly Progress[], script: Script): number {
  const learned = learnedIdSet([...progress]);
  return seionOrder(script).filter((k) => learned.has(k.id)).length;
}

/** 練習天數 = practiceDates 裡不同日期的數量（重複的日期只算一天）。 */
export function practiceDayCount(practiceDates: readonly string[]): number {
  return new Set(practiceDates).size;
}
