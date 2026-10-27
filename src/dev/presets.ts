// 開發用進度預設（docs/architecture.md 第 10 節）。純函式，只產生資料；
// 套用與深連結處理在 applyPreset.ts／DebugPreset.tsx。整個 src/dev/ 只能在 __DEV__ 下引用。

import { seionOrder } from '../data';
import type { Progress, Script } from '../data/types';
import { DAY_MS } from '../logic/srs';

export type DebugPresetName = 'hiragana-done' | 'all-done' | 'reset';

export const DEBUG_PRESETS: readonly DebugPresetName[] = ['hiragana-done', 'all-done', 'reset'];

export function isDebugPreset(value: unknown): value is DebugPresetName {
  return typeof value === 'string' && (DEBUG_PRESETS as readonly string[]).includes(value);
}

/** 該文字的清音全部設為已學：level 3、一週後複習、連續答對 3 次。 */
function learnedSeion(script: Script, now: number): Progress[] {
  return seionOrder(script).map((k) => ({
    kanaId: k.id,
    level: 3,
    nextReviewAt: now + 7 * DAY_MS,
    correctStreak: 3,
    wrongCount: 0,
    learnedAt: now,
  }));
}

/**
 * 預設對應的完整進度（套用時會取代全部現有進度與易混淆紀錄）。
 * - hiragana-done：平假名清音全部已學，片假名全部未學
 * - all-done：平假名與片假名清音都已學（片假名資料尚未加入前只有平假名）
 * - reset：清空
 */
export function presetProgress(preset: DebugPresetName, now: number): Progress[] {
  switch (preset) {
    case 'hiragana-done':
      return learnedSeion('hiragana', now);
    case 'all-done':
      return [...learnedSeion('hiragana', now), ...learnedSeion('katakana', now)];
    case 'reset':
      return [];
  }
}
