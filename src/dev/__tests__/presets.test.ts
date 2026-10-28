import { seionOrder } from '../../data';
import { isKatakanaUnlocked } from '../../logic/confusion';
import { readableLoanwords } from '../../logic/loanword';
import { currentScript } from '../../logic/session';
import { DAY_MS } from '../../logic/srs';
import { isGraduated } from '../../logic/graduate';
import {
  DEBUG_PRESETS,
  DEBUG_PUN_PRESETS,
  isDebugPreset,
  isDebugPunPreset,
  presetGraduateSeen,
  presetKataIntroSeen,
  presetProgress,
  punPresetSettings,
} from '../presets';

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

  it('all-done：平假名 46 + 片假名清音 46 = 92 個，片假名清音全部在內', () => {
    const ids = presetProgress('all-done', NOW).map((p) => p.kanaId);
    expect(ids).toHaveLength(92);
    expect(ids.filter((id) => id.startsWith('k-'))).toHaveLength(46);
  });

  it('hiragana-started：平假名 あ～こ 10 個已學，下一個新字是さ，片假名尚未解鎖', () => {
    const list = presetProgress('hiragana-started', NOW);
    expect(list.map((p) => p.kanaId)).toEqual(
      ['a', 'i', 'u', 'e', 'o', 'ka', 'ki', 'ku', 'ke', 'ko'].map((c) => `h-${c}`),
    );
    expect(isKatakanaUnlocked(list)).toBe(false);
    expect(currentScript(list)).toBe('hiragana');
  });

  it('hiragana-almost：平假名清音除了 ん 以外 45 個已學，片假名尚未解鎖', () => {
    const list = presetProgress('hiragana-almost', NOW);
    expect(list).toHaveLength(45);
    expect(list.map((p) => p.kanaId)).not.toContain('h-n');
    expect(list.every((p) => p.kanaId.startsWith('h-'))).toBe(true);
    expect(isKatakanaUnlocked(list)).toBe(false);
    expect(currentScript(list)).toBe('hiragana');
  });

  it('katakana-started：平假名全部 + 片假名 ア～コ 10 個，階段為片假名，且有可讀外來語', () => {
    const list = presetProgress('katakana-started', NOW);
    const kata = list.filter((p) => p.kanaId.startsWith('k-')).map((p) => p.kanaId);
    expect(kata).toEqual(
      ['a', 'i', 'u', 'e', 'o', 'ka', 'ki', 'ku', 'ke', 'ko'].map((c) => `k-${c}`),
    );
    expect(list.filter((p) => p.kanaId.startsWith('h-'))).toHaveLength(46);
    expect(isKatakanaUnlocked(list)).toBe(true);
    expect(currentScript(list)).toBe('katakana');
    expect(readableLoanwords(kata).length).toBeGreaterThan(0);
    for (const p of list) expect(p.nextReviewAt).toBe(NOW + 7 * DAY_MS); // 不會有到期複習
  });

  it('presetKataIntroSeen：hiragana-done／almost／reset 為 false（讓 C2-18 重新出現），片假名階段為 true', () => {
    expect(presetKataIntroSeen('hiragana-done')).toBe(false);
    expect(presetKataIntroSeen('hiragana-almost')).toBe(false);
    expect(presetKataIntroSeen('reset')).toBe(false);
    expect(presetKataIntroSeen('katakana-started')).toBe(true);
    expect(presetKataIntroSeen('all-done')).toBe(true);
  });

  it('presetGraduateSeen：所有預設都是 false；只有 all-done 的進度算畢業', () => {
    for (const n of DEBUG_PRESETS) {
      expect(presetGraduateSeen(n)).toBe(false);
      expect(isGraduated(presetProgress(n, NOW))).toBe(n === 'all-done');
    }
  });

  it('好笑記憶包預設：pun-reset 清空解鎖與旗標，pun-purchased 只設購買', () => {
    expect(DEBUG_PUN_PRESETS).toEqual(['pun-reset', 'pun-purchased']);
    expect(punPresetSettings('pun-reset')).toEqual({
      punPackPurchased: false,
      punUnlocked: [],
      punAdsWatched: 0,
      punPromptAfterAdsShown: false,
      punPromptKataShown: false,
    });
    expect(punPresetSettings('pun-purchased')).toEqual({ punPackPurchased: true });
    expect(isDebugPunPreset('pun-reset')).toBe(true);
    expect(isDebugPunPreset('reset')).toBe(false);
  });

  it('isDebugPreset 接受五個進度預設與兩個好笑記憶包預設', () => {
    for (const n of DEBUG_PUN_PRESETS) expect(isDebugPreset(n)).toBe(true);
    for (const n of DEBUG_PRESETS) expect(isDebugPreset(n)).toBe(true);
    expect(isDebugPreset('nope')).toBe(false);
    expect(isDebugPreset(undefined)).toBe(false);
    expect(isDebugPreset('')).toBe(false);
  });
});
