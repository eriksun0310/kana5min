import { byId } from '../../data';
import { DEV_PLACEHOLDER_WORDS, SPOT_ERROR_IN_PRACTICE } from '../../data/spotErrorWords';
import {
  SPOT_WORDS_PER_QUESTION,
  approvedSpotWords,
  buildDevSpotQuestions,
  buildSpotErrorQuestion,
  isSpotEligible,
  replaceablePositions,
  scoreSpotError,
  spotErrorAvailable,
  spotPoolReady,
} from '../spotError';
import { seededRng } from './testUtils';

describe('抓錯字：詞與詞池', () => {
  it('replaceablePositions：只算易混淆字組的成員；至少 2 個才合格', () => {
    expect(replaceablePositions('われる')).toEqual([0, 1, 2]);
    expect(replaceablePositions('あい')).toEqual([]);
    expect(isSpotEligible({ text: 'わかる' })).toBe(true);
    expect(isSpotEligible({ text: 'いぬ' })).toBe(false);
    expect(replaceablePositions('シャツ')).toEqual([0, 2]);
  });

  it('核可前的正式詞池只有本來就有的詞，每種文字不到 3 個，所以不會放進練習', () => {
    const pool = approvedSpotWords();
    expect(pool.map((w) => w.id).sort()).toEqual(['w-shatsu', 'w-shoppingu', 'w-wakaru']);
    expect(spotPoolReady(pool, 'hiragana')).toBe(false);
    expect(spotPoolReady(pool, 'katakana')).toBe(false);
    expect(SPOT_ERROR_IN_PRACTICE).toBe(false);
    expect(spotErrorAvailable(pool)).toBe(false);
  });

  it('開發用佔位詞不是真的詞，也沒有放進 words.json', () => {
    expect(DEV_PLACEHOLDER_WORDS.every((w) => w.id.startsWith('dev-spot-'))).toBe(true);
    expect(DEV_PLACEHOLDER_WORDS.every((w) => isSpotEligible(w))).toBe(true);
    expect(approvedSpotWords().some((w) => w.id.startsWith('dev-spot-'))).toBe(false);
  });
});

describe('buildSpotErrorQuestion', () => {
  const pool = DEV_PLACEHOLDER_WORDS;

  it('3 個詞，恰好一個字被換成同組的另一個字，其餘字不變', () => {
    for (let seed = 1; seed <= 200; seed++) {
      for (const script of ['hiragana', 'katakana'] as const) {
        const q = buildSpotErrorQuestion(pool, script, seededRng(seed))!;
        expect(q.type).toBe('spoterr');
        const spot = q.spot!;
        expect(spot.words).toHaveLength(SPOT_WORDS_PER_QUESTION);
        let diffs = 0;
        spot.words.forEach((w, wi) => {
          const orig = [...pool.find((p) => p.id === w.wordId)!.text];
          w.shown.forEach((c, ci) => {
            if (c !== orig[ci]) {
              diffs++;
              expect(wi).toBe(spot.wordIndex);
              expect(ci).toBe(spot.charIndex);
              expect(c).toBe(byId(spot.replacementId)!.char);
              expect(orig[ci]).toBe(byId(spot.originalId)!.char);
            }
          });
        });
        expect(diffs).toBe(1);
        expect(spot.replacementId).not.toBe(spot.originalId);
        expect(q.kanaId).toBe(spot.originalId);
        expect(byId(spot.replacementId)!.script).toBe(script);
      }
    }
  });

  it('詞不夠 3 個時回傳 undefined', () => {
    expect(buildSpotErrorQuestion(pool.slice(0, 2), 'hiragana', seededRng(1))).toBeUndefined();
    expect(buildSpotErrorQuestion(approvedSpotWords(), 'hiragana', seededRng(1))).toBeUndefined();
  });

  it('作弊測試：被換的位置在所有「易混淆字」裡均勻；亂點一個易混淆字的答對率 ≈ 1／個數', () => {
    const N = 4000;
    const rng = seededRng(5);
    let ok = 0;
    let expected = 0;
    let firstWord = 0;
    for (let i = 0; i < N; i++) {
      const q = buildSpotErrorQuestion(pool, 'hiragana', seededRng(i + 1))!;
      const spot = q.spot!;
      const cands = spot.words.flatMap((w, wi) =>
        replaceablePositions(pool.find((p) => p.id === w.wordId)!.text).map((ci) => ({ wi, ci })),
      );
      expected += 1 / cands.length;
      const pick = cands[Math.floor(rng() * cands.length)];
      if (pick.wi === spot.wordIndex && pick.ci === spot.charIndex) ok++;
      if (spot.wordIndex === 0) firstWord++;
    }
    expect(Math.abs(ok - expected) / N).toBeLessThan(0.03);
    // 第一個詞被換的機率 ≈ 1/3（詞的順序洗過）
    expect(Math.abs(firstWord / N - 1 / 3)).toBeLessThan(0.04);
  });

  it('avoid 的字盡量避開；佔位題 buildDevSpotQuestions 一次給 4 題', () => {
    const q = buildSpotErrorQuestion(pool, 'hiragana', seededRng(3), new Set(['h-nu', 'h-me', 'h-ru', 'h-ro', 'h-wa', 'h-ne']))!;
    expect(q.kanaId).toBe('h-re');
    expect(buildDevSpotQuestions(pool, seededRng(1))).toHaveLength(4);
  });
});

describe('scoreSpotError', () => {
  const spot = { wordIndex: 1, charIndex: 2, originalId: 'h-nu', replacementId: 'h-me' };
  it('選對：被換的字記對；選錯：記錯並記「把原本的字當成換上去的字」', () => {
    expect(scoreSpotError(spot, { wordIndex: 1, charIndex: 2 })).toEqual({ correct: true, perKana: { 'h-nu': true }, confusions: [] });
    expect(scoreSpotError(spot, { wordIndex: 0, charIndex: 2 })).toEqual({
      correct: false,
      perKana: { 'h-nu': false },
      confusions: [{ truth: 'h-nu', picked: 'h-me' }],
    });
  });
});
