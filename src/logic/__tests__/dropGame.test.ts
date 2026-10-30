import { seionOrder } from '../../data';
import {
  DROP_PRESETS,
  MAX_PICK,
  MAX_WRONG_TO_PASS,
  ROUND_SIZE,
  availableStages,
  basketColumns,
  slotAtPoint,
  basketOrder,
  buildRound,
  canStart,
  faceOf,
  isPassed,
  learnedSyllables,
  presetForGroup,
  randomSelection,
  recommendedPresets,
  scoreEvents,
  stagesFor,
  toggleSelection,
} from '../dropGame';
import { seededRng } from './testUtils';

const ORDER = seionOrder('hiragana').map((k) => k.id);

describe('dropGame', () => {
  it('階段：片假名準備好有四個，沒解鎖只有平假名 → 拼音', () => {
    expect(stagesFor(true).map((s) => s.id)).toEqual(['kata-hira', 'hira-kata', 'kata-romaji', 'hira-romaji']);
    expect(stagesFor(false).map((s) => s.id)).toEqual(['hira-romaji']);
    expect(availableStages(['h-shi', 'h-tsu', 'h-so'], true)).toHaveLength(4);
    expect(availableStages(['h-shi', 'h-tsu', 'h-so'], false)).toHaveLength(1);
  });

  it('faceOf：同一個音的平假名、片假名、拼音', () => {
    expect(faceOf('h-tsu', 'hiragana')).toBe('つ');
    expect(faceOf('h-tsu', 'katakana')).toBe('ツ');
    expect(faceOf('h-tsu', 'romaji')).toBe('tsu');
  });

  it('learnedSyllables：片假名也換成平假名 id，不重複，依五十音表排序', () => {
    expect(learnedSyllables(['k-tsu', 'h-tsu', 'h-a'], ORDER)).toEqual(['h-a', 'h-tsu']);
    expect(learnedSyllables([], ORDER)).toEqual([]);
  });

  it('選字：切換選取、最多 6 個、3～6 個才能開始', () => {
    let sel: string[] = [];
    for (const id of ['h-a', 'h-i', 'h-u']) sel = toggleSelection(sel, id);
    expect(canStart(sel)).toBe(true);
    expect(canStart(sel.slice(0, 2))).toBe(false);
    sel = toggleSelection(sel, 'h-i');
    expect(sel).toEqual(['h-a', 'h-u']);
    let full: string[] = [];
    for (const id of ORDER.slice(0, 8)) full = toggleSelection(full, id);
    expect(full).toHaveLength(MAX_PICK);
    expect(canStart(full)).toBe(true);
  });

  it('隨機：從學過的抽，不夠 3 個回傳空', () => {
    expect(randomSelection(['h-a', 'h-i'], seededRng(1))).toEqual([]);
    const sel = randomSelection(ORDER.slice(0, 10), seededRng(1));
    expect(sel).toHaveLength(4);
    expect(new Set(sel).size).toBe(4);
  });

  it('出題順序：每個字次數平均、不連續同一個', () => {
    for (let seed = 1; seed <= 30; seed++) {
      for (const n of [3, 4, 5, 6]) {
        const bag = buildRound(n, seededRng(seed));
        expect(bag).toHaveLength(ROUND_SIZE);
        const counts = new Array(n).fill(0);
        for (const v of bag) counts[v] += 1;
        expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
        for (let i = 1; i < bag.length; i++) expect(bag[i]).not.toBe(bag[i - 1]);
      }
    }
  });

  it('籃子順序是 0..n-1 的排列', () => {
    expect([...basketOrder(5, seededRng(3))].sort()).toEqual([0, 1, 2, 3, 4]);
  });

  it('過關：最多錯 1 個', () => {
    expect(MAX_WRONG_TO_PASS).toBe(1);
    expect(isPassed(0)).toBe(true);
    expect(isPassed(1)).toBe(true);
    expect(isPassed(2)).toBe(false);
  });

  it('推薦：依答錯次數排序、沒學的音不放、不夠 3 個的組不出現', () => {
    const learned = new Set(['h-shi', 'h-tsu', 'h-so', 'h-n', 'h-nu', 'h-me', 'h-ru', 'h-ro']);
    const byDefault = recommendedPresets(learned, {});
    expect(byDefault[0].preset.id).toBe('shitsu-son');
    const byMisses = recommendedPresets(learned, { ruro: 5 });
    expect(byMisses[0].preset.id).toBe('ruro-nume');
    // wa ne re 沒學：nume-wanere 只剩 ぬ・め 兩個，不夠 3 個
    expect(byDefault.map((r) => r.preset.id)).not.toContain('nume-wanere');
    expect(recommendedPresets(new Set(['h-a']), {})).toEqual([]);
  });

  it('presetForGroup：對比頁的組對應到推薦字組', () => {
    const learned = new Set(DROP_PRESETS.flatMap((p) => p.syllables));
    expect(presetForGroup('shitsu', learned)?.selection).toEqual(['h-shi', 'h-tsu', 'h-so', 'h-n']);
    expect(presetForGroup('wanere', learned)?.preset.id).toBe('nume-wanere');
    expect(presetForGroup('ruro', new Set(['h-ru']))).toBeUndefined();
    expect(presetForGroup('nope', learned)).toBeUndefined();
  });

  it('計分：每個字各自對錯，歸錯的記「把 X 當成 Y」，掉到底只記錯', () => {
    const stage = stagesFor(true)[0]; // 片假名 → 平假名：掉下來的是片假名
    const { results, confusions } = scoreEvents(
      [
        { syllable: 'h-tsu', picked: 'h-tsu' },
        { syllable: 'h-shi', picked: 'h-tsu' },
        { syllable: 'h-so' },
      ],
      stage,
    );
    expect(results).toEqual([
      { kanaId: 'k-tsu', correct: true },
      { kanaId: 'k-shi', correct: false },
      { kanaId: 'k-so', correct: false },
    ]);
    expect(confusions).toEqual([{ truth: 'k-shi', picked: 'k-tsu' }]);
  });

  it('slotAtPoint：落在籃子內或上方 slop 內才算，其餘 -1', () => {
    const rects = [0, 100, 50, 80, 60, 100, 50, 80];
    expect(slotAtPoint(rects, 20, 120, 40)).toBe(0);
    expect(slotAtPoint(rects, 80, 70, 40)).toBe(1);
    expect(slotAtPoint(rects, 80, 40, 40)).toBe(-1);
    expect(slotAtPoint(rects, 55, 120, 40)).toBe(-1);
    expect(slotAtPoint([], 1, 1, 40)).toBe(-1);
  });

  it('basketColumns：6 個以內排版', () => {
    expect([3, 4, 5, 6].map(basketColumns)).toEqual([3, 4, 3, 3]);
  });
});
