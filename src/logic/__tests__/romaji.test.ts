import { applyAnswer } from '../srs';
import { shouldShowRomaji } from '../romaji';
import { prog } from './testUtils';

const auto = { romajiAutoHide: true };
const always = { romajiAutoHide: false };

describe('shouldShowRomaji', () => {
  it('連續答對 0、1、2 次仍顯示，3 次起隱藏', () => {
    expect(shouldShowRomaji(prog('h-a', { correctStreak: 0 }), auto)).toBe(true);
    expect(shouldShowRomaji(prog('h-a', { correctStreak: 1 }), auto)).toBe(true);
    expect(shouldShowRomaji(prog('h-a', { correctStreak: 2 }), auto)).toBe(true);
    expect(shouldShowRomaji(prog('h-a', { correctStreak: 3 }), auto)).toBe(false);
    expect(shouldShowRomaji(prog('h-a', { correctStreak: 10 }), auto)).toBe(false);
  });

  it('答錯歸零後再顯示', () => {
    let p = prog('h-a', { correctStreak: 0 });
    for (let i = 0; i < 3; i++) p = applyAnswer(p, true);
    expect(shouldShowRomaji(p, auto)).toBe(false);
    p = applyAnswer(p, false);
    expect(p.correctStreak).toBe(0);
    expect(shouldShowRomaji(p, auto)).toBe(true);
  });

  it('設定關閉自動隱藏時一律顯示', () => {
    expect(shouldShowRomaji(prog('h-a', { correctStreak: 0 }), always)).toBe(true);
    expect(shouldShowRomaji(prog('h-a', { correctStreak: 99 }), always)).toBe(true);
  });

  it('沒有進度的字（還沒學）顯示', () => {
    expect(shouldShowRomaji(undefined, auto)).toBe(true);
    expect(shouldShowRomaji(undefined, always)).toBe(true);
  });
});
