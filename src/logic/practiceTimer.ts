// 每日練習的計時（純函式，時間一律由呼叫端傳入 now）。
// 只計在練習畫面的時間：畫面取得焦點時 resume，離開／切到背景時 pause；
// 時間到不打斷作答，由畫面在答完一題後詢問是否繼續（docs/architecture.md 第 13 節）。

import { MINUTE_MS } from './srs';

/** 時間到之後選「再練」時加的分鐘數（固定 5 分鐘，不是原本的每日目標） */
export const EXTEND_MINUTES = 5;

/**
 * 時間縮放：1 = 真實時間。只有開發版的除錯深連結（debug?timescale=…）會改它，
 * 讓 Maestro 不必真的等好幾分鐘；正式版永遠是 1。
 */
export const timeConfig = { scale: 1 };

/** 每日目標（分鐘）換成毫秒上限 */
export function limitMsFor(minutes: number): number {
  return Math.round(minutes * MINUTE_MS * timeConfig.scale);
}

export function extendMs(): number {
  return Math.round(EXTEND_MINUTES * MINUTE_MS * timeConfig.scale);
}

export interface TimerState {
  /** 已累積的練習時間（不含目前這一段） */
  usedMs: number;
  /** 目前這一段開始計時的時間；暫停中為 null */
  runningSince: number | null;
  /** 時間上限（毫秒）；0 = 不限時 */
  limitMs: number;
}

export function elapsedMs(t: TimerState, now: number): number {
  return t.usedMs + (t.runningSince === null ? 0 : Math.max(0, now - t.runningSince));
}

export function isTimeUp(t: TimerState, now: number): boolean {
  return t.limitMs > 0 && elapsedMs(t, now) >= t.limitMs;
}

export function resumeTimer(t: TimerState, now: number): TimerState {
  return t.runningSince === null ? { ...t, runningSince: now } : t;
}

export function pauseTimer(t: TimerState, now: number): TimerState {
  if (t.runningSince === null) return t;
  return { ...t, usedMs: elapsedMs(t, now), runningSince: null };
}

/** 「再練 5 分鐘」：新的上限 = 目前已練習的時間 + 5 分鐘。 */
export function extendTimer(t: TimerState, now: number): TimerState {
  return { ...t, limitMs: elapsedMs(t, now) + extendMs() };
}

/** 提示文字用的分鐘數：至少 1。 */
export function elapsedMinutes(ms: number): number {
  return Math.max(1, Math.round(ms / MINUTE_MS));
}
