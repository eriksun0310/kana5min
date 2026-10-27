import { applyAnswer, applyRoundResult, DAY_MS, INTERVALS_MS, intervalFor, isDue, MINUTE_MS, newProgress } from '../srs';
import { prog } from './testUtils';

const NOW = 1_800_000_000_000;

describe('SRS 間隔表', () => {
  it('各等級間隔：10 分、1 天、3 天、7 天、14 天、30 天', () => {
    expect(INTERVALS_MS).toEqual([
      10 * MINUTE_MS,
      1 * DAY_MS,
      3 * DAY_MS,
      7 * DAY_MS,
      14 * DAY_MS,
      30 * DAY_MS,
    ]);
    [0, 1, 2, 3, 4, 5].forEach((lv, i) => expect(intervalFor(lv)).toBe(INTERVALS_MS[i]));
  });

  it('超出範圍的等級會夾在 0～5', () => {
    expect(intervalFor(-3)).toBe(10 * MINUTE_MS);
    expect(intervalFor(99)).toBe(30 * DAY_MS);
  });
});

describe('applyRoundResult', () => {
  it('新字全對：0 升到 1，1 天後複習，設定 learnedAt', () => {
    const p = applyRoundResult(undefined, 'h-a', [true, true], NOW);
    expect(p.level).toBe(1);
    expect(p.nextReviewAt).toBe(NOW + DAY_MS);
    expect(p.learnedAt).toBe(NOW);
    expect(p.correctStreak).toBe(2);
    expect(p.wrongCount).toBe(0);
  });

  it('逐級升上去，每一級的 nextReviewAt 都對應間隔表', () => {
    let p = newProgress('h-a');
    const expected = [1 * DAY_MS, 3 * DAY_MS, 7 * DAY_MS, 14 * DAY_MS, 30 * DAY_MS];
    expected.forEach((ms, i) => {
      p = applyRoundResult(p, 'h-a', [true], NOW);
      expect(p.level).toBe(i + 1);
      expect(p.nextReviewAt).toBe(NOW + ms);
    });
  });

  it('最高 5 級，再答對仍是 5 級、30 天', () => {
    const p = applyRoundResult(prog('h-a', { level: 5 }), 'h-a', [true], NOW);
    expect(p.level).toBe(5);
    expect(p.nextReviewAt).toBe(NOW + 30 * DAY_MS);
  });

  it('答錯回到 0 級，10 分鐘後到期', () => {
    const before = prog('h-a', { level: 4, correctStreak: 5 });
    const p = applyRoundResult(before, 'h-a', [true, false], NOW);
    expect(p.level).toBe(0);
    expect(p.nextReviewAt).toBe(NOW + 10 * MINUTE_MS);
    expect(p.correctStreak).toBe(0);
    expect(p.wrongCount).toBe(1);
    expect(isDue(p, NOW + 9 * MINUTE_MS)).toBe(false);
    expect(isDue(p, NOW + 10 * MINUTE_MS)).toBe(true);
  });

  it('同一輪先錯後對：streak 從答錯後重算，但等級仍回 0', () => {
    const p = applyRoundResult(prog('h-a', { level: 2, correctStreak: 4 }), 'h-a', [false, true], NOW);
    expect(p.level).toBe(0);
    expect(p.correctStreak).toBe(1);
    expect(p.wrongCount).toBe(1);
  });

  it('不改動 learnedAt（第一次學的時間保留）', () => {
    const p = applyRoundResult(prog('h-a', { learnedAt: 123 }), 'h-a', [true], NOW);
    expect(p.learnedAt).toBe(123);
  });

  it('沒有作答紀錄時不改動', () => {
    const base = prog('h-a', { level: 3 });
    expect(applyRoundResult(base, 'h-a', [], NOW)).toBe(base);
    expect(applyRoundResult(undefined, 'h-a', [], NOW).learnedAt).toBeUndefined();
  });

  it('不會修改傳入的物件', () => {
    const before = prog('h-a', { level: 1 });
    const copy = { ...before };
    applyRoundResult(before, 'h-a', [false], NOW);
    expect(before).toEqual(copy);
  });
});

describe('applyAnswer', () => {
  it('答對 streak+1；答錯 streak 歸零、wrongCount+1，等級不變', () => {
    const a = applyAnswer(prog('h-a', { level: 3, correctStreak: 2 }), true);
    expect(a.correctStreak).toBe(3);
    expect(a.level).toBe(3);
    const b = applyAnswer(a, false);
    expect(b.correctStreak).toBe(0);
    expect(b.wrongCount).toBe(1);
    expect(b.level).toBe(3);
  });
});

describe('isDue', () => {
  it('已學且 nextReviewAt <= now 才到期', () => {
    expect(isDue(prog('h-a', { nextReviewAt: NOW }), NOW)).toBe(true);
    expect(isDue(prog('h-a', { nextReviewAt: NOW + 1 }), NOW)).toBe(false);
  });
  it('沒學過（沒有 learnedAt）或沒有進度都不算到期', () => {
    expect(isDue(prog('h-a', { learnedAt: undefined, nextReviewAt: 0 }), NOW)).toBe(false);
    expect(isDue(undefined, NOW)).toBe(false);
  });
});
