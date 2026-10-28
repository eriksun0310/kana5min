import { FREE_SOUNDS, PUNS } from '../../data/puns';
import {
  isPunUnlocked,
  nextUnlockBatch,
  shouldPromptPurchase,
} from '../punUnlock';

const NONE = { purchased: false, unlocked: [] as string[] };

describe('isPunUnlocked', () => {
  it('免費讀音（あ行、か行）一律解鎖', () => {
    for (const s of FREE_SOUNDS) expect(isPunUnlocked(s, NONE)).toBe(true);
  });

  it('さ行起預設鎖住，加進 unlocked 或買斷才解鎖', () => {
    expect(isPunUnlocked('sa', NONE)).toBe(false);
    expect(isPunUnlocked('sa', { purchased: false, unlocked: ['sa'] })).toBe(true);
    expect(isPunUnlocked('sa', { purchased: true, unlocked: [] })).toBe(true);
    expect(isPunUnlocked('wo', { purchased: true, unlocked: [] })).toBe(true);
    expect(isPunUnlocked('shi', { purchased: false, unlocked: ['sa'] })).toBe(false);
  });
});

describe('nextUnlockBatch', () => {
  it('點到さ：さ + 往後 2 個（し、す）', () => {
    expect(nextUnlockBatch('sa', [])).toEqual(['sa', 'shi', 'su']);
  });

  it('跳過已解鎖的字，往後補', () => {
    expect(nextUnlockBatch('sa', ['shi'])).toEqual(['sa', 'su', 'se']);
  });

  it('跳過沒有諧音的字（つ 沒有句子）', () => {
    // た行：た ち つ(無) て と
    expect(nextUnlockBatch('chi', [])).toEqual(['chi', 'te', 'to']);
    expect(nextUnlockBatch('ta', [])).toEqual(['ta', 'chi', 'te']);
  });

  it('跨行：そ之後接た行', () => {
    expect(nextUnlockBatch('so', [])).toEqual(['so', 'ta', 'chi']);
  });

  it('後面不足時從前面補', () => {
    expect(nextUnlockBatch('n', [])).toEqual(['n', 'sa', 'shi']);
    expect(nextUnlockBatch('wo', ['n'])).toEqual(['wo', 'sa', 'shi']);
  });

  it('後面不足、前面也有已解鎖的字：只補還沒解鎖的', () => {
    const all = Object.keys(PUNS).filter((s) => !FREE_SOUNDS.includes(s));
    const unlockedExceptTail = all.filter((s) => !['wa', 'wo', 'n'].includes(s));
    expect(nextUnlockBatch('n', unlockedExceptTail)).toEqual(['n', 'wa', 'wo']);
  });

  it('點到的字已解鎖或免費時不算在內，只回傳補上的字', () => {
    expect(nextUnlockBatch('sa', ['sa'])).toEqual(['shi', 'su']);
    expect(nextUnlockBatch('ku', [])).toEqual(['sa', 'shi']);
  });

  it('點到沒有諧音的字（け、つ、ひ）不算在內', () => {
    expect(nextUnlockBatch('tsu', [])).toEqual(['te', 'to']);
  });

  it('剩餘不足 3 個時回傳剩下的', () => {
    const all = Object.keys(PUNS).filter((s) => !FREE_SOUNDS.includes(s));
    expect(nextUnlockBatch('n', all.filter((s) => s !== 'n'))).toEqual(['n']);
    expect(nextUnlockBatch('n', all)).toEqual([]);
  });

  it('不超過 3 個，且全部有諧音、非免費、未解鎖', () => {
    for (const s of Object.keys(PUNS)) {
      const batch = nextUnlockBatch(s, []);
      expect(batch.length).toBeLessThanOrEqual(3);
      for (const b of batch) {
        expect(FREE_SOUNDS).not.toContain(b);
        expect(PUNS[b]).toBeTruthy();
      }
    }
  });
});

describe('shouldPromptPurchase', () => {
  it('看完第 2 支廣告且還沒提示過才提示', () => {
    expect(shouldPromptPurchase(0, false)).toBe(false);
    expect(shouldPromptPurchase(1, false)).toBe(false);
    expect(shouldPromptPurchase(2, false)).toBe(true);
    expect(shouldPromptPurchase(5, false)).toBe(true);
    expect(shouldPromptPurchase(2, true)).toBe(false);
    expect(shouldPromptPurchase(9, true)).toBe(false);
  });
});
