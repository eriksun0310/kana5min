// 看詞選拼音（wordread）：看一個外來語（片假名詞），從 4 個拼音選出正確的讀音，答完才顯示意思。
// 4 個選項只在「同一個音節」不一樣（兩兩距離都是 1），所以選項之間沒有「差異最大」的那個；
// 替換用的音節依外來語詞庫裡各音節出現的頻率抽，所以答案的音節不會比較常見或比較少見。
// 作答前不能播放這個詞的聲音（會直接洩漏答案）。docs/architecture.md 第 10 節。

import { allKana, loanwords, type Word } from '../data';
import type { Kana } from '../data/types';
import { readableLoanwords } from './loanword';
import { shuffle, type QuizDraft, type Rng } from './session';

export const WORDREAD_OPTION_COUNT = 4;
/** 一輪最多幾題看詞選拼音 */
export const MAX_WORDREAD_PER_ROUND = 2;

export interface Mora {
  /** 這個音節的片假名（含小字，例如 キャ、ファ、ッ、ー） */
  text: string;
  /** 可替換的假名 id（清音、濁音、半濁音、拗音）；ッ、ー 與小母音組合沒有 */
  kanaId?: string;
  kind?: Kana['kind'];
  /** 該音節的基本拼音（ッ、ー 為空字串，由組字規則處理） */
  romaji: string;
  geminate?: boolean;
  long?: boolean;
}

const KATA = new Map(allKana.filter((k) => k.script === 'katakana').map((k) => [k.char, k]));
const SMALL_YOUON = 'ャュョ';
const SMALL_VOWEL: Record<string, string> = { ァ: 'a', ィ: 'i', ゥ: 'u', ェ: 'e', ォ: 'o' };
const MACRON: Record<string, string> = { a: 'ā', i: 'ī', u: 'ū', e: 'ē', o: 'ō' };

/** 把片假名詞切成音節；遇到不認得的字元回傳 null。 */
export function splitMorae(text: string): Mora[] | null {
  const chars = [...text];
  const out: Mora[] = [];
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const next = chars[i + 1];
    if (ch === 'ッ') out.push({ text: ch, romaji: '', geminate: true });
    else if (ch === 'ー') out.push({ text: ch, romaji: '', long: true });
    else {
      const base = KATA.get(ch);
      if (!base) return null;
      const combo = next && SMALL_YOUON.includes(next) ? KATA.get(ch + next) : undefined;
      if (combo) {
        out.push({ text: ch + next, kanaId: combo.id, kind: combo.kind, romaji: combo.romaji });
        i++;
      } else if (next && SMALL_VOWEL[next]) {
        const consonant = base.romaji.slice(0, -1);
        out.push({ text: ch + next, romaji: consonant + SMALL_VOWEL[next] });
        i++;
      } else {
        out.push({ text: ch, kanaId: base.id, kind: base.kind, romaji: base.romaji });
      }
    }
  }
  return out;
}

/** 音節陣列組成拼音：ッ 讓下一個音節的子音重複，ー 把前一個母音加上長音符。 */
export function composeRomaji(morae: readonly Mora[]): string {
  let out = '';
  let pendingGeminate = false;
  for (const m of morae) {
    if (m.geminate) {
      pendingGeminate = true;
    } else if (m.long) {
      const last = out.slice(-1);
      out = out.slice(0, -1) + (MACRON[last] ?? last);
    } else {
      let r = m.romaji;
      if (pendingGeminate) r = (r.startsWith('ch') ? 't' : r[0]) + r;
      pendingGeminate = false;
      out += r;
    }
  }
  return out;
}

/** 詞庫裡各「可替換音節」出現的次數（key = 假名 id）。 */
const FREQ: Map<string, number> = (() => {
  const m = new Map<string, number>();
  for (const w of loanwords()) {
    for (const mo of splitMorae(w.text) ?? []) if (mo.kanaId) m.set(mo.kanaId, (m.get(mo.kanaId) ?? 0) + 1);
  }
  return m;
})();

export function moraFrequency(kanaId: string): number {
  return FREQ.get(kanaId) ?? 0;
}

/** 有哪些位置可以替換（有 kanaId 的音節）。 */
export function substitutablePositions(morae: readonly Mora[]): number[] {
  return morae.flatMap((m, i) => (m.kanaId ? [i] : []));
}

/** 依詞庫頻率加權、不重複地抽 count 個（同 kind、不含 exclude）。 */
function pickWeighted(pool: readonly Kana[], count: number, rng: Rng): Kana[] {
  const items = pool.map((k) => ({ k, w: 1 + moraFrequency(k.id) }));
  const out: Kana[] = [];
  while (out.length < count && items.length > 0) {
    const total = items.reduce((s, x) => s + x.w, 0);
    let r = rng() * total;
    let idx = items.length - 1;
    for (let i = 0; i < items.length; i++) {
      r -= items[i].w;
      if (r < 0) {
        idx = i;
        break;
      }
    }
    out.push(items[idx].k);
    items.splice(idx, 1);
  }
  return out;
}

export interface WordReadQuestion {
  word: Word;
  /** 4 個拼音（已洗牌），只在 diffIndex 那個音節不一樣 */
  options: string[];
  correctIndex: number;
  diffIndex: number;
}

/** 這個詞能不能出題：能切成音節、組出的拼音等於 word.romaji、至少有一個可替換音節。 */
export function wordReadable(word: Word): boolean {
  const m = splitMorae(word.text);
  return !!m && composeRomaji(m) === word.romaji && substitutablePositions(m).length > 0;
}

export function buildWordReadQuestion(word: Word, rng: Rng): WordReadQuestion | undefined {
  const morae = splitMorae(word.text);
  if (!morae || composeRomaji(morae) !== word.romaji) return undefined;
  const positions = substitutablePositions(morae);
  if (positions.length === 0) return undefined;
  const diffIndex = positions[Math.floor(rng() * positions.length)];
  const original = morae[diffIndex];
  // 拼音相同的字（ジ／ヂ、ズ／ヅ）只留一個，選項才不會重複
  const seenRomaji = new Set([original.romaji]);
  const pool = allKana.filter((k) => {
    if (k.script !== 'katakana' || k.kind !== original.kind || seenRomaji.has(k.romaji)) return false;
    seenRomaji.add(k.romaji);
    return true;
  });
  const subs = pickWeighted(pool, WORDREAD_OPTION_COUNT - 1, rng);
  if (subs.length < WORDREAD_OPTION_COUNT - 1) return undefined;
  const variants = subs.map((k) =>
    composeRomaji(morae.map((m, i) => (i === diffIndex ? { ...m, kanaId: k.id, romaji: k.romaji } : m))),
  );
  const options = shuffle([word.romaji, ...variants], rng);
  return { word, options, correctIndex: options.indexOf(word.romaji), diffIndex };
}

export function wordReadToDraft(q: WordReadQuestion): QuizDraft {
  return {
    kanaId: '',
    type: 'wordread',
    options: q.options,
    answerId: q.word.romaji,
    wordId: q.word.id,
    diffIndex: q.diffIndex,
  };
}

/** 目前已學的片假名能讀、也能出看詞選拼音的詞。 */
export function wordReadPool(learnedIds: Iterable<string>): Word[] {
  const katakanaIds = [...learnedIds].filter((id) => id.startsWith('k-'));
  return readableLoanwords(katakanaIds).filter(wordReadable);
}

/**
 * 抽剛好 n 題看詞選拼音（不夠詞就少）。prefer = 優先考的假名（今天的新字）：含這些字的詞排在前面。
 * 沒有可讀詞或 n <= 0 時回傳空陣列，且不消耗 rng。
 */
export function pickWordReadDraftsExact(
  learnedIds: Iterable<string>,
  rng: Rng,
  n: number,
  prefer: Iterable<string> = [],
): QuizDraft[] {
  const readable = wordReadPool(learnedIds);
  if (readable.length === 0 || n <= 0) return [];
  const preferChars = new Set(
    [...prefer]
      .filter((id) => id.startsWith('k-'))
      .map((id) => allKana.find((k) => k.id === id)?.char)
      .filter((c): c is string => c !== undefined),
  );
  const hasPreferred = (w: Word) => [...w.text].some((c) => preferChars.has(c));
  const ordered = [
    ...shuffle(readable.filter(hasPreferred), rng),
    ...shuffle(readable.filter((w) => !hasPreferred(w)), rng),
  ];
  const drafts: QuizDraft[] = [];
  for (const w of ordered) {
    if (drafts.length >= n) break;
    const q = buildWordReadQuestion(w, rng);
    if (q) drafts.push(wordReadToDraft(q));
  }
  return drafts;
}

/** 為每日練習抽 1～2 題看詞選拼音；沒有可讀詞時回傳空陣列，且不消耗 rng。 */
export function pickWordReadDrafts(
  learnedIds: Iterable<string>,
  rng: Rng,
  prefer: Iterable<string> = [],
  max: number = MAX_WORDREAD_PER_ROUND,
): QuizDraft[] {
  const ids = [...learnedIds];
  if (wordReadPool(ids).length === 0 || max <= 0) return [];
  return pickWordReadDraftsExact(ids, rng, Math.min(max, 1 + (rng() < 0.5 ? 1 : 0)), prefer);
}

/** 作答後的回饋文案：答完才顯示意思。 */
export function wordReadFeedback(word: Word, correct: boolean): string {
  const tail = word.note ? `，${word.note}` : '。';
  return correct
    ? `答對了！${word.text} 讀作 ${word.romaji}，意思是${word.meaning}${tail}`
    : `${word.text} 讀作 ${word.romaji}，意思是${word.meaning}${tail}`;
}
