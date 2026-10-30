// 抓錯字（spoterr）：一串詞（3 個）裡有一個字被換成易混淆字，點出被換的那個字。
// 每個詞至少含 2 個易混淆字；被換的位置在「所有易混淆字」裡均勻抽，所以不能靠位置或次數猜。
// 詞庫與核可狀態見 src/data/spotErrorWords.ts、words-spot-error.md。docs/architecture.md 第 15 節。

import { allWords, byId } from '../data';
import { confusableGroups } from '../data/confusables';
import { SPOT_ERROR_IN_PRACTICE } from '../data/spotErrorWords';
import type { Script, Word } from '../data/types';
import { shuffle, type QuizDraft, type Rng } from './session';

export const SPOT_WORDS_PER_QUESTION = 3;

/** 易混淆字：字元 → { kanaId, 同組的其他字 id }（只含同一種文字、查得到資料的成員）。 */
const CONFUSABLE: Map<string, { id: string; mates: string[] }> = (() => {
  const m = new Map<string, { id: string; mates: string[] }>();
  for (const g of confusableGroups) {
    const members = g.members.filter((id) => byId(id) !== undefined);
    for (const id of members) m.set(byId(id)!.char, { id, mates: members.filter((x) => x !== id) });
  }
  return m;
})();

/** 詞裡可以被換的位置（字元是某個易混淆字組的成員）。 */
export function replaceablePositions(text: string): number[] {
  return [...text].flatMap((c, i) => (CONFUSABLE.has(c) ? [i] : []));
}

/** 至少 2 個易混淆字的詞才能出題。 */
export function isSpotEligible(word: Pick<Word, 'text'>): boolean {
  return replaceablePositions(word.text).length >= 2;
}

/**
 * 正式版的詞池：words.json 裡含 2 個以上易混淆字的詞（非例字）。
 * 新詞要等使用者核可後才加進 words.json，所以目前只有本來就有的わかる、シャツ、ショッピング。
 */
export function approvedSpotWords(): Word[] {
  return allWords.filter((w) => !w.exampleOnly && isSpotEligible(w));
}

/** 抓錯字出題的詞池要有幾個以上才會放進練習。 */
export function spotPoolReady(pool: readonly Word[], script: Script): boolean {
  return pool.filter((w) => w.script === script && isSpotEligible(w)).length >= SPOT_WORDS_PER_QUESTION;
}

/** 是否把抓錯字放進自動練習：旗標開啟、且有某種文字的詞夠多。 */
export function spotErrorAvailable(pool: readonly Word[] = approvedSpotWords()): boolean {
  return SPOT_ERROR_IN_PRACTICE && (spotPoolReady(pool, 'hiragana') || spotPoolReady(pool, 'katakana'));
}

export function buildSpotErrorQuestion(
  pool: readonly Word[],
  script: Script,
  rng: Rng,
  avoid: ReadonlySet<string> = new Set(),
): QuizDraft | undefined {
  const eligible = pool.filter((w) => w.script === script && isSpotEligible(w));
  if (eligible.length < SPOT_WORDS_PER_QUESTION) return undefined;
  const words = shuffle(eligible, rng).slice(0, SPOT_WORDS_PER_QUESTION);
  // 所有「可被換的位置」均勻抽一個；盡量避開 avoid 的字
  const spots = words.flatMap((w, wi) => replaceablePositions(w.text).map((ci) => ({ wi, ci })));
  const fresh = spots.filter((s) => !avoid.has(CONFUSABLE.get([...words[s.wi].text][s.ci])!.id));
  const pickFrom = fresh.length > 0 ? fresh : spots;
  const spot = pickFrom[Math.floor(rng() * pickFrom.length)];
  const original = CONFUSABLE.get([...words[spot.wi].text][spot.ci])!;
  const replacementId = original.mates[Math.floor(rng() * original.mates.length)];
  const replacementChar = byId(replacementId)!.char;
  return {
    kanaId: original.id,
    type: 'spoterr',
    options: [],
    answerId: original.id,
    spot: {
      words: words.map((w, wi) => ({
        wordId: w.id,
        shown: [...w.text].map((c, ci) => (wi === spot.wi && ci === spot.ci ? replacementChar : c)),
      })),
      wordIndex: spot.wi,
      charIndex: spot.ci,
      originalId: original.id,
      replacementId,
    },
  };
}

/** 作答後的計分：選對 → 被換的那個字對；選錯 → 那個字記錯，並記「把原本的字當成換上去的字」（沒發現換了）。 */
export function scoreSpotError(
  spot: { wordIndex: number; charIndex: number; originalId: string; replacementId: string },
  picked: { wordIndex: number; charIndex: number },
): { correct: boolean; perKana: Record<string, boolean>; confusions: { truth: string; picked: string }[] } {
  const correct = picked.wordIndex === spot.wordIndex && picked.charIndex === spot.charIndex;
  return {
    correct,
    perKana: { [spot.originalId]: correct },
    confusions: correct ? [] : [{ truth: spot.originalId, picked: spot.replacementId }],
  };
}

/** 開發版佔位題：每種文字各 1 題（共 2 題）。 */
export function buildDevSpotQuestions(pool: readonly Word[], rng: Rng, count = 4): QuizDraft[] {
  const out: QuizDraft[] = [];
  const scripts: Script[] = ['hiragana', 'katakana'];
  for (let i = 0; out.length < count && i < count * 4; i++) {
    const d = buildSpotErrorQuestion(pool, scripts[i % 2], rng);
    if (d) out.push(d);
  }
  return out;
}
