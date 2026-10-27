import { seionOrder } from '../../data';
import { isKatakanaUnlocked } from '../../logic/confusion';
import { DAY_MS } from '../../logic/srs';
import { DEBUG_PRESETS, isDebugPreset, presetProgress } from '../presets';

const NOW = 1_700_000_000_000;

describe('presetProgress', () => {
  it('hiragana-done：平假名清音 46 個全部已學，規格指定的欄位值', () => {
    const list = presetProgress('hiragana-done', NOW);
    const ids = seionOrder('hiragana').map((k) => k.id);
    expect(list.map((p) => p.kanaId)).toEqual(ids);
    expect(ids).toHaveLength(46);
    for (const p of list) {
      expect(p.level).toBe(3);
      expect(p.correctStreak).toBe(3);
      expect(p.nextReviewAt).toBe(NOW + 7 * DAY_MS);
      expect(p.learnedAt).toBe(NOW);
      expect(p.wrongCount).toBe(0);
    }
    expect(isKatakanaUnlocked(list)).toBe(true);
  });

  it('hiragana-done 不含任何片假名', () => {
    expect(presetProgress('hiragana-done', NOW).every((p) => p.kanaId.startsWith('h-'))).toBe(true);
  });

  it('all-done：包含 hiragana-done 的全部，並涵蓋所有現有片假名清音', () => {
    const all = presetProgress('all-done', NOW);
    const hira = presetProgress('hiragana-done', NOW);
    expect(all.length).toBeGreaterThanOrEqual(hira.length);
    const ids = new Set(all.map((p) => p.kanaId));
    for (const p of hira) expect(ids.has(p.kanaId)).toBe(true);
    for (const k of seionOrder('katakana')) expect(ids.has(k.id)).toBe(true);
    expect(ids.size).toBe(all.length);
  });

  it('reset：空陣列', () => {
    expect(presetProgress('reset', NOW)).toEqual([]);
  });

  it('isDebugPreset 只接受三個名稱', () => {
    for (const n of DEBUG_PRESETS) expect(isDebugPreset(n)).toBe(true);
    expect(isDebugPreset('nope')).toBe(false);
    expect(isDebugPreset(undefined)).toBe(false);
    expect(isDebugPreset('')).toBe(false);
  });
});
