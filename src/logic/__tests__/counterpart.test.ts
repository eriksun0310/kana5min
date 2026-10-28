import { counterpartId } from '../counterpart';

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
