import { seionOrder } from '../../data';
import type { Progress } from '../../data/types';
import { resultCopy } from '../resultCopy';

const NOW = new Date(2026, 10, 2, 15, 0, 0).getTime();
const order = seionOrder('hiragana').map((k) => k.id);
const mk = (ids: string[], at = NOW - 3600_000): Progress[] =>
  ids.map((kanaId) => ({ kanaId, level: 1, nextReviewAt: NOW + 1000, correctStreak: 1, wrongCount: 0, learnedAt: at }));
const base = { groupId: null, newCount: 0, after: mk(order.slice(0, 3)), now: NOW };

describe('resultCopy', () => {
  it('學習（有新字）：今天完成了、有練剛學的字、連結是自動練習', () => {
    const c = resultCopy({ ...base, mode: 'daily', newCount: 3 });
    expect(c.title).toBe('今天完成了');
    expect(c.focus?.label).toBe('練剛學的字（あ い う）');
    expect(c.again).toEqual({ label: '做一份自動練習（10 題）', target: { mode: 'auto' } });
  });
  it('學習（只複習、沒學新字）：今天完成了、沒有練剛學的字', () => {
    const c = resultCopy({ ...base, mode: 'daily', newCount: 0 });
    expect(c.title).toBe('今天完成了');
    expect(c.focus).toBeNull();
  });
  it('學習但今天的學會時間不是今天：不出練剛學的字', () => {
    const c = resultCopy({ ...base, mode: 'daily', newCount: 3, after: mk(order.slice(0, 3), NOW - 40 * 3600_000) });
    expect(c.focus).toBeNull();
  });
  it('自動練習：練習完成、再做一份自動練習、沒有練剛學的字', () => {
    const c = resultCopy({ ...base, mode: 'auto' });
    expect(c).toEqual({ title: '練習完成', focus: null, again: { label: '再做一份自動練習', target: { mode: 'auto' } } });
  });
  it('易混淆字：連結寫出組名並回同一組', () => {
    const c = resultCopy({ ...base, mode: 'confuse', groupId: 'nume' });
    expect(c.title).toBe('練習完成');
    expect(c.again.label).toBe('再練一次這一組（ぬ・め）');
    expect(c.again.target).toEqual({ mode: 'confuse', group: 'nume' });
  });
  it('練剛學的字：再練一次這 N 個字，回 focus', () => {
    const c = resultCopy({ ...base, mode: 'focus' });
    expect(c.again).toEqual({ label: '再練一次這 3 個字', target: { mode: 'focus' } });
    expect(c.focus).toBeNull();
  });
  it('confuse 沒有組 id 時退回自動練習', () => {
    expect(resultCopy({ ...base, mode: 'confuse' }).again.target).toEqual({ mode: 'auto' });
  });
});
