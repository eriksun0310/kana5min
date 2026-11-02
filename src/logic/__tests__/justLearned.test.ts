import type { Progress } from '../../data/types';
import { justLearnedIds, learnedToday, learnedTooFast, LEARN_FAST_THRESHOLD } from '../justLearned';
import { buildFocusPractice } from '../confusion';
import { seionOrder } from '../../data';
import { contactMailto, FAQ, reportMailto } from '../help';

const NOW = new Date(2026, 10, 2, 15, 0, 0).getTime();
const HOUR = 3600_000;
function p(kanaId: string, learnedAt?: number): Progress {
  return { kanaId, level: 1, nextReviewAt: NOW + 1000, correctStreak: 1, wrongCount: 0, learnedAt };
}
const order = seionOrder('hiragana').map((k) => k.id);

describe('justLearnedIds', () => {
  it('今天沒學新字 → 空', () => {
    expect(justLearnedIds([p('h-a', NOW - 30 * HOUR)], NOW)).toEqual([]);
    expect(justLearnedIds([], NOW)).toEqual([]);
  });
  it('只取今天、最晚學會的 3 個，依學會順序', () => {
    const list = [p(order[0], NOW - 30 * HOUR), p(order[1], NOW - 5 * HOUR), p(order[2], NOW - 4 * HOUR), p(order[3], NOW - 3 * HOUR), p(order[4], NOW - 2 * HOUR)];
    expect(justLearnedIds(list, NOW)).toEqual([order[2], order[3], order[4]]);
  });
  it('同一輪的學會時間順序亂掉時，仍依五十音順序回傳', () => {
    const list = [p(order[5], NOW - 3 * HOUR), p(order[3], NOW - 2 * HOUR), p(order[4], NOW - HOUR)];
    expect(justLearnedIds(list, NOW)).toEqual([order[3], order[4], order[5]]);
  });
  it('一輪只學 2 個也行', () => {
    expect(justLearnedIds([p(order[0], NOW - HOUR), p(order[1], NOW - HOUR)], NOW)).toHaveLength(2);
  });
  it('沒有 learnedAt 的不算', () => {
    expect(learnedToday([p(order[0])], NOW)).toEqual([]);
  });
  it('學太快門檻：超過 9 個才提醒', () => {
    const mk = (n: number) => order.slice(0, n).map((id) => p(id, NOW - HOUR));
    expect(learnedTooFast(mk(LEARN_FAST_THRESHOLD), NOW)).toBe(false);
    expect(learnedTooFast(mk(LEARN_FAST_THRESHOLD + 1), NOW)).toBe(true);
  });
});

describe('buildFocusPractice', () => {
  const learned = order.slice(0, 12).map((id) => p(id, NOW - HOUR));
  it('只出指定的字，每個字看字選音、聽音選字各 1 題，題數固定，同字不相鄰', () => {
    for (let i = 0; i < 100; i++) {
      const focus = order.slice(9, 12);
      const qs = buildFocusPractice(focus, learned);
      for (const q of qs) expect(focus).toContain(q.kanaId);
      for (const id of focus) {
        expect(qs.filter((q) => q.kanaId === id && q.type === 'see')).toHaveLength(1);
        expect(qs.filter((q) => q.kanaId === id && q.type === 'hear')).toHaveLength(1);
        expect(qs.filter((q) => q.kanaId === id && q.type === 'recall').length).toBeLessThanOrEqual(1);
      }
      for (const q of qs.filter((x) => x.type !== 'recall')) {
        expect(q.options).toContain(q.answerId);
        expect(new Set(q.options).size).toBe(q.options.length);
      }
      for (let j = 1; j < qs.length; j++) expect(qs[j].kanaId === qs[j - 1].kanaId).toBe(false);
    }
  });
  it('空清單 / 查無字不出錯', () => {
    expect(buildFocusPractice([], learned)).toEqual([]);
    expect(buildFocusPractice(['nope'], learned)).toEqual([]);
  });
});

describe('幫助與聯絡', () => {
  it('回報信件：主旨與內文帶版本與系統，不含學習進度', () => {
    const url = reportMailto({ appVersion: '1.0.0', os: 'iOS', osVersion: '26.0' });
    expect(url.startsWith('mailto:connect.ptalk@gmail.com?')).toBe(true);
    const decoded = decodeURIComponent(url);
    expect(decoded).toContain('五十音問題回報');
    expect(decoded).toContain('App 版本：1.0.0');
    expect(decoded).toContain('iOS 26.0');
    expect(decoded).not.toMatch(/學到|已學/);
    expect(contactMailto()).toBe('mailto:connect.ptalk@gmail.com');
  });
  it('常見問題 key 不重複、內容不空', () => {
    expect(new Set(FAQ.map((f) => f.key)).size).toBe(FAQ.length);
    expect(FAQ.every((f) => f.q && f.a)).toBe(true);
  });
});
