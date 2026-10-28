import {
  elapsedMinutes,
  elapsedMs,
  extendMs,
  extendTimer,
  isTimeUp,
  limitMsFor,
  pauseTimer,
  resumeTimer,
  timeConfig,
  type TimerState,
} from '../practiceTimer';
import { MINUTE_MS } from '../srs';

const base: TimerState = { usedMs: 0, runningSince: null, limitMs: 3 * MINUTE_MS };

describe('practiceTimer', () => {
  afterEach(() => {
    timeConfig.scale = 1;
  });

  it('暫停中不計時；resume 後開始計，pause 後累積並停止', () => {
    expect(elapsedMs(base, 1_000_000)).toBe(0);
    const running = resumeTimer(base, 1000);
    expect(elapsedMs(running, 1000 + 60_000)).toBe(60_000);
    const paused = pauseTimer(running, 1000 + 60_000);
    expect(paused).toEqual({ usedMs: 60_000, runningSince: null, limitMs: base.limitMs });
    // 暫停期間不累積
    expect(elapsedMs(paused, 10_000_000)).toBe(60_000);
    // 再繼續：接著算
    const again = resumeTimer(paused, 5_000_000);
    expect(elapsedMs(again, 5_000_000 + 30_000)).toBe(90_000);
  });

  it('重複 resume／pause 是無害的', () => {
    const running = resumeTimer(base, 100);
    expect(resumeTimer(running, 999)).toBe(running);
    expect(pauseTimer(base, 100)).toBe(base);
  });

  it('時間到判定：達到上限才算；limitMs 為 0 代表不限時', () => {
    const t = resumeTimer(base, 0);
    expect(isTimeUp(t, 3 * MINUTE_MS - 1)).toBe(false);
    expect(isTimeUp(t, 3 * MINUTE_MS)).toBe(true);
    expect(isTimeUp(resumeTimer({ ...base, limitMs: 0 }, 0), 99 * MINUTE_MS)).toBe(false);
  });

  it('再練 5 分鐘：新上限 = 已練習時間 + 5 分鐘，可以再次觸發', () => {
    const t = resumeTimer(base, 0);
    const now = 3 * MINUTE_MS + 20_000;
    expect(isTimeUp(t, now)).toBe(true);
    const ext = extendTimer(t, now);
    expect(ext.limitMs).toBe(now + 5 * MINUTE_MS);
    expect(isTimeUp(ext, now + 5 * MINUTE_MS - 1)).toBe(false);
    expect(isTimeUp(ext, now + 5 * MINUTE_MS)).toBe(true);
  });

  it('timeConfig.scale 縮短每日目標與延長時間（開發測試用）', () => {
    timeConfig.scale = 0.001;
    expect(limitMsFor(10)).toBe(600);
    expect(extendMs()).toBe(300);
    timeConfig.scale = 1;
    expect(limitMsFor(10)).toBe(10 * MINUTE_MS);
  });

  it('提示用的分鐘數至少 1', () => {
    expect(elapsedMinutes(5_000)).toBe(1);
    expect(elapsedMinutes(10 * MINUTE_MS + 10_000)).toBe(10);
  });
});
