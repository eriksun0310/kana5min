import { compareAction, counterpartId } from '../counterpart';

describe('counterpartId', () => {
  it('清音、濁音、拗音來回對應', () => {
    expect(counterpartId('h-a')).toBe('k-a');
    expect(counterpartId('k-a')).toBe('h-a');
    expect(counterpartId('h-ga')).toBe('k-ga');
    expect(counterpartId('h-kya')).toBe('k-kya');
    expect(counterpartId('k-kya')).toBe('h-kya');
  });
  it('ぢ／づ 與 じ／ず 不混淆', () => {
    expect(counterpartId('h-di')).toBe('k-di');
    expect(counterpartId('k-di')).toBe('h-di');
    expect(counterpartId('h-du')).toBe('k-du');
    expect(counterpartId('k-du')).toBe('h-du');
    expect(counterpartId('h-ji')).toBe('k-ji');
    expect(counterpartId('k-zu')).toBe('h-zu');
  });
  it('每個字都能來回對應，不存在的 id 回傳 undefined', () => {
    const { allKana } = require('../../data');
    for (const k of allKana) {
      const o = counterpartId(k.id);
      expect(o).toBeDefined();
      expect(counterpartId(o!)).toBe(k.id);
    }
    expect(counterpartId('zzz')).toBeUndefined();
  });
});

describe('compareAction（詳情頁按對照）', () => {
  it('上一頁就是對照的字：回上一頁，不再疊頁', () => {
    expect(compareAction('k-ki', 'k-ki')).toBe('back');
  });

  it('上一頁是五十音表（沒有字）或別的字：往前進一頁，返回會回到原本的字', () => {
    expect(compareAction(undefined, 'k-ki')).toBe('push');
    expect(compareAction('h-ku', 'k-ki')).toBe('push');
  });
});
