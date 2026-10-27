// 讀外來語題型的純函式（docs/architecture.md 第 10 節）。
// 「可讀」：詞裡每個字元都必須是已學的片假名清音、其清音已學的濁音／半濁音、
// 對應大字已學的小字（ャュョッァィゥェォ），或長音符 ー（一律可讀）。
import { allKana, loanwords, type Word } from '../data';
import { shuffle, type QuizDraft, type QuizQuestion, type Rng } from './session';

/** 濁音／半濁音 → 清音（兩個字串逐字對應：濁音 20 個 + 半濁音 5 個） */
const VOICED = 'ガギグゲゴザジズゼゾダヂヅデドバビブベボパピプペポ';
const VOICED_SEION = 'カキクケコサシスセソタチツテトハヒフヘホハヒフヘホ';
const VOICED_BASE: Record<string, string> = Object.fromEntries(
  [...VOICED].map((c, i) => [c, [...VOICED_SEION][i]]),
);

/** 小字 → 對應大字 */
const SMALL_BASE: Record<string, string> = {
  ャ: 'ヤ',
  ュ: 'ユ',
  ョ: 'ヨ',
  ッ: 'ツ',
  ァ: 'ア',
  ィ: 'イ',
  ゥ: 'ウ',
  ェ: 'エ',
  ォ: 'オ',
};

const LONG_MARK = 'ー';

/** 片假名清音 char → id */
const SEION_ID_BY_CHAR = new Map(
  allKana.filter((k) => k.script === 'katakana' && k.kind === 'seion').map((k) => [k.char, k.id]),
);

/** 某個字元要「已學」的清音字元；ー 回傳 null 表示一律可讀，不認得的字元回傳 undefined。 */
function requiredSeion(ch: string): string | null | undefined {
  if (ch === LONG_MARK) return null;
  if (SEION_ID_BY_CHAR.has(ch)) return ch;
  return VOICED_BASE[ch] ?? SMALL_BASE[ch];
}

/** 是否每個字元都可讀。空字串視為不可讀。 */
export function isReadableLoanword(text: string, learnedKatakanaIds: Iterable<string>): boolean {
  const learned = learnedKatakanaIds instanceof Set ? learnedKatakanaIds : new Set(learnedKatakanaIds);
  const chars = [...text];
  if (chars.length === 0) return false;
  return chars.every((ch) => {
    const need = requiredSeion(ch);
    if (need === null) return true;
    if (need === undefined) return false;
    const id = SEION_ID_BY_CHAR.get(need);
    return id !== undefined && learned.has(id);
  });
}

/** 使用者目前能讀的外來語（不含只當例字用的詞）。 */
export function readableLoanwords(learnedIds: Iterable<string>): Word[] {
  const learned = new Set(learnedIds);
  return loanwords().filter((w) => isReadableLoanword(w.text, learned));
}

export interface LoanwordQuestion {
  type: 'loanword';
  word: Word;
  /** 4 個中文意思，已洗牌，不重複 */
  options: string[];
  /** options 內正解的位置 */
  correctIndex: number;
}

export const LOANWORD_OPTION_COUNT = 4;

/**
 * 組出一題讀外來語：4 個中文意思選項（含正解），干擾項取 pool 內其他詞的意思。
 * 意思相同的詞不會同時出現。pool 的干擾項不夠時，改從整個外來語詞庫補。
 */
export function buildLoanwordQuestion(word: Word, pool: readonly Word[], rng: Rng): LoanwordQuestion {
  const taken = new Set([word.meaning]);
  const distractors: string[] = [];
  const pick = (candidates: readonly Word[], limit: number) => {
    for (const w of shuffle(candidates, rng)) {
      if (distractors.length >= limit) return;
      if (w.id === word.id || taken.has(w.meaning)) continue;
      taken.add(w.meaning);
      distractors.push(w.meaning);
    }
  };
  const need = LOANWORD_OPTION_COUNT - 1;
  pick(pool, need);
  if (distractors.length < need) pick(loanwords(), need);
  const options = shuffle([word.meaning, ...distractors], rng);
  return { type: 'loanword', word, options, correctIndex: options.indexOf(word.meaning) };
}

/** 一題讀外來語轉成測驗題（kanaId 為空字串；options 是中文意思，answerId 是正確的意思）。 */
export function loanwordQuestionToDraft(q: LoanwordQuestion): QuizDraft {
  return {
    kanaId: '',
    type: 'loanword',
    options: q.options,
    answerId: q.word.meaning,
    wordId: q.word.id,
  };
}

/** 一輪練習最多加入幾題讀外來語 */
export const MAX_LOANWORD_PER_ROUND = 2;

/**
 * 為一輪練習抽 1～2 題讀外來語（只抽目前可讀的詞，不含 exampleOnly）。
 * - learnedIds：目前已學的 Kana id（含今天剛學的新字；非片假名的 id 會被忽略）
 * - prefer：優先考的假名（今天的新字）：含這些字的詞排在前面
 * 沒有可讀詞時回傳空陣列，而且不消耗 rng，不影響既有出題的隨機序列。
 */
export function pickLoanwordDrafts(
  learnedIds: Iterable<string>,
  rng: Rng,
  prefer: Iterable<string> = [],
): QuizDraft[] {
  const katakanaIds = [...learnedIds].filter((id) => id.startsWith('k-'));
  const readable = readableLoanwords(katakanaIds);
  if (readable.length === 0) return [];

  const count = Math.min(readable.length, 1 + (rng() < 0.5 ? 1 : 0));
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
  return ordered
    .slice(0, count)
    .map((w) => loanwordQuestionToDraft(buildLoanwordQuestion(w, readable, rng)));
}

/** 把讀外來語題插到測驗題之間的隨機位置，並重新編號 id（q-0、q-1…）。 */
export function mixLoanwordDrafts(
  questions: readonly Omit<QuizQuestion, 'id'>[],
  drafts: readonly QuizDraft[],
  rng: Rng,
): QuizQuestion[] {
  const out = [...questions];
  for (const d of drafts) out.splice(Math.floor(rng() * (out.length + 1)), 0, d);
  return out.map((q, i) => ({ ...q, id: `q-${i}` }));
}

/** 「，」接 note；沒有 note 就用句號收尾。 */
function feedbackTail(word: Word): string {
  return word.note ? `，${word.note}` : '。';
}

/** 作答後的回饋文案（C2-20）：有 note 才接 note。 */
export function loanwordFeedback(word: Word, correct: boolean): string {
  return correct
    ? `答對了！${word.text} 讀作 ${word.romaji}${feedbackTail(word)}`
    : `${word.text} 是${word.meaning}，讀作 ${word.romaji}${feedbackTail(word)}`;
}
