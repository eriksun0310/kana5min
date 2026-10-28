// 描寫失敗計數與「先跳過」出現時機（純函式，app/learn/trace.tsx 使用）。
// 同一次描寫（同一個字、同一輪）連續被判失敗 3 次後可以先跳過；按「重寫」不重置（累計）。

/** 累計失敗幾次後出現「先跳過」 */
export const SKIP_AFTER_FAILS = 3;

/** 按「完成」之後的新失敗次數；通過時歸零。 */
export function nextFailCount(current: number, passed: boolean): number {
  return passed ? 0 : current + 1;
}

export function canSkipTrace(failCount: number): boolean {
  return failCount >= SKIP_AFTER_FAILS;
}
