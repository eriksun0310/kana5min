import { canSkipTrace, nextFailCount, SKIP_AFTER_FAILS } from '../traceAttempts';

describe('描寫失敗計數', () => {
  it('失敗累計，通過歸零', () => {
    expect(nextFailCount(0, false)).toBe(1);
    expect(nextFailCount(2, false)).toBe(3);
    expect(nextFailCount(2, true)).toBe(0);
  });
  it('失敗 3 次才可以跳過', () => {
    expect(SKIP_AFTER_FAILS).toBe(3);
    expect([0, 1, 2].map(canSkipTrace)).toEqual([false, false, false]);
    expect(canSkipTrace(3)).toBe(true);
    expect(canSkipTrace(5)).toBe(true);
  });
});
