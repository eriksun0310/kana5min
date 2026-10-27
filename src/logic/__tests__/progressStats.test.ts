import { seionOrder } from '../../data';
import {
  addPracticeDate,
  buildResultSummary,
  computeHomeStats,
  computeStreak,
  formatElapsed,
  formatNextReview,
  resultLabel,
  toDateKey,
} from '../progressStats';
import { DAY_MS, MINUTE_MS } from '../srs';
import { prog } from './testUtils';

const order = seionOrder().map((k) => k.id);
// 以本地時間建立，避免時區影響日期判斷
const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).getTime();
const NOW = at(2026, 10, 27);

describe('computeHomeStats', () => {
  it('沒有進度：已學 0、待複習 0、今天新字 3，下一個新字是あ，第一格是 next', () => {
    const s = computeHomeStats([], NOW);
    expect(s.learnedCount).toBe(0);
    expect(s.total).toBe(46);
    expect(s.dueCount).toBe(0);
    expect(s.newTodayCount).toBe(3);
    expect(s.nextKanaId).toBe('h-a');
    expect(s.dots).toHaveLength(46);
    expect(s.dots[0]).toBe('next');
    expect(s.dots.slice(1).every((d) => d === 'rest')).toBe(true);
  });

  it('已學 7 個、5 個到期：進度條前 7 格 learned、第 8 格 next', () => {
    const all = order.slice(0, 7).map((id, i) => prog(id, { nextReviewAt: i < 5 ? NOW - 1 : NOW + DAY_MS }));
    const s = computeHomeStats(all, NOW);
    expect(s.learnedCount).toBe(7);
    expect(s.dueCount).toBe(5);
    expect(s.newTodayCount).toBe(3);
    expect(s.nextKanaId).toBe(order[7]);
    expect(s.dots.slice(0, 7).every((d) => d === 'learned')).toBe(true);
    expect(s.dots[7]).toBe('next');
    expect(s.dots[8]).toBe('rest');
  });

  it('剩 2 個新字：今天新字 2；全部學完：0，沒有 next', () => {
    const learn = (n: number) => order.slice(0, n).map((id) => prog(id, { nextReviewAt: NOW + DAY_MS }));
    expect(computeHomeStats(learn(44), NOW).newTodayCount).toBe(2);
    const done = computeHomeStats(learn(46), NOW);
    expect(done.newTodayCount).toBe(0);
    expect(done.nextKanaId).toBeUndefined();
    expect(done.dots.every((d) => d === 'learned')).toBe(true);
  });

  it('沒有 learnedAt 的進度不計入已學與待複習', () => {
    const s = computeHomeStats([prog('h-a', { learnedAt: undefined, nextReviewAt: 0 })], NOW);
    expect(s.learnedCount).toBe(0);
    expect(s.dueCount).toBe(0);
  });
});

describe('連續練習天數', () => {
  const key = (d: number) => toDateKey(at(2026, 10, d));

  it('今天有練：連續往回數', () => {
    expect(computeStreak([key(25), key(26), key(27)], NOW)).toBe(3);
  });

  it('今天還沒練但昨天有練：連續天數延續', () => {
    expect(computeStreak([key(25), key(26)], NOW)).toBe(2);
  });

  it('昨天沒練（只有前天）：歸零', () => {
    expect(computeStreak([key(24), key(25)], NOW)).toBe(0);
  });

  it('中間斷掉只算最近一段', () => {
    expect(computeStreak([key(20), key(21), key(25), key(26), key(27)], NOW)).toBe(3);
  });

  it('沒有紀錄回傳 0；重複與亂序不影響', () => {
    expect(computeStreak([], NOW)).toBe(0);
    expect(computeStreak([key(27), key(26), key(27), key(26)], NOW)).toBe(2);
  });

  it('跨月（10/31、11/1）', () => {
    const now = at(2026, 11, 1);
    expect(computeStreak([toDateKey(at(2026, 10, 30)), toDateKey(at(2026, 10, 31)), toDateKey(now)], now)).toBe(3);
  });

  it('addPracticeDate：加入今天、去重、排序', () => {
    const dates = addPracticeDate([key(26), key(27)], NOW);
    expect(dates).toEqual([key(26), key(27)]);
    expect(addPracticeDate([key(20)], NOW)).toEqual([key(20), key(27)]);
  });

  it('toDateKey 格式為 YYYY-MM-DD 且補零', () => {
    expect(toDateKey(at(2026, 3, 5))).toBe('2026-03-05');
  });
});

describe('formatNextReview', () => {
  it('SRS 各等級的顯示', () => {
    expect(formatNextReview(NOW + 10 * MINUTE_MS, NOW)).toBe('10 分鐘後');
    expect(formatNextReview(NOW + 1 * DAY_MS, NOW)).toBe('明天');
    expect(formatNextReview(NOW + 3 * DAY_MS, NOW)).toBe('3 天後');
    expect(formatNextReview(NOW + 7 * DAY_MS, NOW)).toBe('7 天後');
    expect(formatNextReview(NOW + 14 * DAY_MS, NOW)).toBe('14 天後');
    expect(formatNextReview(NOW + 30 * DAY_MS, NOW)).toBe('30 天後');
  });

  it('已經過期顯示 1 分鐘後（不顯示負數）', () => {
    expect(formatNextReview(NOW - 5000, NOW)).toBe('1 分鐘後');
  });
});

describe('formatElapsed', () => {
  it('不到 1 分鐘顯示秒，否則顯示分', () => {
    expect(formatElapsed(45_000)).toBe('45 秒');
    expect(formatElapsed(4 * MINUTE_MS)).toBe('4 分');
    expect(formatElapsed(4 * MINUTE_MS + 40_000)).toBe('5 分');
  });
});

describe('resultLabel', () => {
  it('新字全對：新學會', () => {
    expect(resultLabel({ isNew: true, wrongAnswers: 0, levelAfter: 1 })).toEqual({ label: '新學會', tone: 'normal' });
  });
  it('有錯：答錯 N 次（錯誤色）', () => {
    expect(resultLabel({ isNew: true, wrongAnswers: 1, levelAfter: 0 })).toEqual({ label: '答錯 1 次', tone: 'wrong' });
    expect(resultLabel({ isNew: false, wrongAnswers: 2, levelAfter: 0 })).toEqual({ label: '答錯 2 次', tone: 'wrong' });
  });
  it('複習字：level >= 3 記得很熟，否則記得', () => {
    expect(resultLabel({ isNew: false, wrongAnswers: 0, levelAfter: 3 }).label).toBe('記得很熟');
    expect(resultLabel({ isNew: false, wrongAnswers: 0, levelAfter: 5 }).label).toBe('記得很熟');
    expect(resultLabel({ isNew: false, wrongAnswers: 0, levelAfter: 2 }).label).toBe('記得');
  });
});

describe('buildResultSummary', () => {
  it('組出答對數、新字數、用時與每個字的狀態', () => {
    const before = [
      prog('h-ka', { level: 2, nextReviewAt: NOW - 1 }),
      prog('h-ki', { level: 1, nextReviewAt: NOW - 1 }),
    ];
    const after = [
      prog('h-ka', { level: 3, nextReviewAt: NOW + 7 * DAY_MS }),
      prog('h-ki', { level: 0, nextReviewAt: NOW + 10 * MINUTE_MS }),
      prog('h-ku', { level: 1, nextReviewAt: NOW + DAY_MS }),
      prog('h-ke', { level: 0, nextReviewAt: NOW + 10 * MINUTE_MS }),
    ];
    const summary = buildResultSummary({
      answers: {
        'h-ka': [true],
        'h-ki': [false],
        'h-ku': [true, true],
        'h-ke': [true, false],
      },
      before,
      after,
      startedAt: NOW - 4 * MINUTE_MS,
      finishedAt: NOW,
    });
    expect(summary.correct).toBe(4);
    expect(summary.total).toBe(6);
    expect(summary.newCount).toBe(2);
    expect(summary.reviewCount).toBe(2);
    expect(summary.elapsedMs).toBe(4 * MINUTE_MS);
    expect(summary.items.map((i) => [i.kanaId, i.label, i.tone, i.when])).toEqual([
      ['h-ku', '新學會', 'normal', '明天'],
      ['h-ke', '答錯 1 次', 'wrong', '10 分鐘後'],
      ['h-ka', '記得很熟', 'normal', '7 天後'],
      ['h-ki', '答錯 1 次', 'wrong', '10 分鐘後'],
    ]);
  });
});
