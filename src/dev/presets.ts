// 開發用進度預設（docs/architecture.md 第 10 節）。純函式，只產生資料；
// 套用與深連結處理在 applyPreset.ts／DebugPreset.tsx。整個 src/dev/ 只能在 __DEV__ 下引用。

import { seionOrder } from '../data';
import type { Progress, Script } from '../data/types';
import { DAY_MS } from '../logic/srs';

export type DebugPresetName =
  | 'hiragana-started'
  | 'hiragana-almost'
  | 'hiragana-done'
  | 'katakana-started'
  | 'all-done'
  | 'reset';

export const DEBUG_PRESETS: readonly DebugPresetName[] = [
  'hiragana-started',
  'hiragana-almost',
  'hiragana-done',
  'katakana-started',
  'all-done',
  'reset',
];

/** 好笑記憶包預設：只改設定，不動學習進度（docs/architecture.md 第 12 節）。 */
export type DebugPunPresetName = 'pun-reset' | 'pun-purchased';

export const DEBUG_PUN_PRESETS: readonly DebugPunPresetName[] = ['pun-reset', 'pun-purchased'];

export function isDebugPunPreset(value: unknown): value is DebugPunPresetName {
  return typeof value === 'string' && (DEBUG_PUN_PRESETS as readonly string[]).includes(value);
}

/** 深連結與除錯選單接受的所有預設名稱 */
export type AnyDebugPreset = DebugPresetName | DebugPunPresetName;

export function isDebugPreset(value: unknown): value is AnyDebugPreset {
  return (
    typeof value === 'string' &&
    ((DEBUG_PRESETS as readonly string[]).includes(value) || isDebugPunPreset(value))
  );
}

/**
 * 好笑記憶包預設要寫進設定的值：
 * - pun-reset：清空已解鎖讀音、看廣告次數與兩個提示旗標，未購買
 * - pun-purchased：只把 punPackPurchased 設為 true
 */
export function punPresetSettings(preset: DebugPunPresetName): {
  punPackPurchased: boolean;
} & Partial<{
  punUnlocked: string[];
  punAdsWatched: number;
  punPromptAfterAdsShown: boolean;
  punPromptKataShown: boolean;
}> {
  if (preset === 'pun-purchased') return { punPackPurchased: true };
  return {
    punPackPurchased: false,
    punUnlocked: [],
    punAdsWatched: 0,
    punPromptAfterAdsShown: false,
    punPromptKataShown: false,
  };
}

/** 平假名階段預設已學的字：あ～こ（あ行與か行，共 10 個），下一個新字是さ（好笑記憶包要付費解鎖的第一行）。 */
const HIRAGANA_STARTED_COUNT = 10;

/** 片假名階段預設已學的字：ア～コ（あ行與か行，共 10 個）。 */
const KATAKANA_STARTED_COUNT = 10;

/** 該文字的清音（可指定只取前面的字或排除某些字）設為已學：level 3、一週後複習、連續答對 3 次。 */
function learnedSeion(
  script: Script,
  now: number,
  filter: (kanaId: string, index: number) => boolean = () => true,
): Progress[] {
  return seionOrder(script)
    .filter((k, i) => filter(k.id, i))
    .map((k) => ({
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
 * - hiragana-started：平假名已學 あ～こ 10 個（下一個新字是さ），片假名尚未解鎖
 * - hiragana-almost：平假名清音除了 ん 以外全部已學（片假名尚未解鎖）
 * - hiragana-done：平假名清音全部已學，片假名全部未學（片假名剛解鎖）
 * - katakana-started：平假名全部已學，片假名已學 ア～コ 10 個
 * - all-done：平假名與片假名清音都已學
 * - reset：清空
 */
export function presetProgress(preset: DebugPresetName, now: number): Progress[] {
  switch (preset) {
    case 'hiragana-started':
      return learnedSeion('hiragana', now, (_id, i) => i < HIRAGANA_STARTED_COUNT);
    case 'hiragana-almost':
      return learnedSeion('hiragana', now, (id) => id !== 'h-n');
    case 'hiragana-done':
      return learnedSeion('hiragana', now);
    case 'katakana-started':
      return [
        ...learnedSeion('hiragana', now),
        ...learnedSeion('katakana', now, (_id, i) => i < KATAKANA_STARTED_COUNT),
      ];
    case 'all-done':
      return [...learnedSeion('hiragana', now), ...learnedSeion('katakana', now)];
    case 'reset':
      return [];
  }
}

/**
 * 預設要連帶設定的設定值：kataIntroSeen 在 settingsStore（不在進度裡）。
 * 只有 hiragana-done 要讓 C2-18 重新出現；已經在片假名階段的預設一律視為看過。
 */
export function presetKataIntroSeen(preset: DebugPresetName): boolean {
  return preset === 'katakana-started' || preset === 'all-done';
}

/**
 * 預設要連帶設定的畢業畫面旗標：一律設為「沒看過」，
 * 這樣 all-done 之後回首頁可以看到畢業畫面（Maestro 用），reset 之後也會回到初始狀態。
 */
export function presetGraduateSeen(_preset: DebugPresetName): boolean {
  return false;
}

/** 把全部進度改成「已到期」（nextReviewAt 在一天前）：debug 深連結 due=1，用來測試複習題很多的情況。 */
export function makeAllDue(items: Progress[], now: number): Progress[] {
  return items.map((p) => ({ ...p, nextReviewAt: now - DAY_MS }));
}
