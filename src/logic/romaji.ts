// 羅馬拼音逐步淡出（spec 5.4）。

import type { Progress, Settings } from '../data/types';

/** 連續答對幾次後隱藏羅馬拼音 */
export const ROMAJI_HIDE_STREAK = 3;

/**
 * 學習與測驗畫面是否顯示該字的羅馬拼音。
 * - 設定關閉「自動隱藏」：一律顯示
 * - 開啟：correctStreak >= 3 才隱藏；沒有進度（沒學過）視為 0
 * 五十音表與詳情頁不走這個函式，一律顯示。
 */
export function shouldShowRomaji(
  progress: Pick<Progress, 'correctStreak'> | undefined,
  settings: Pick<Settings, 'romajiAutoHide'>,
): boolean {
  if (!settings.romajiAutoHide) return true;
  return (progress?.correctStreak ?? 0) < ROMAJI_HIDE_STREAK;
}
