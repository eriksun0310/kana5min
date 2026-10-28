import kanaJson from './kana.json';
import wordsJson from './words.json';
import type { Kana, KanaKind, Script, Word } from './types';

export * from './types';
export { hintFor } from './hints';
export * from './puns';

export const allKana: Kana[] = kanaJson as Kana[];
export const allWords: Word[] = wordsJson as Word[];

const kanaMap = new Map(allKana.map((k) => [k.id, k]));
const wordMap = new Map(allWords.map((w) => [w.id, w]));

/** 清音的行順序（ん 歸在 wa 行） */
export const ROW_ORDER = ['a', 'ka', 'sa', 'ta', 'na', 'ha', 'ma', 'ya', 'ra', 'wa'] as const;

export const ROW_LABEL: Record<string, string> = {
  a: 'あ行',
  ka: 'か行',
  sa: 'さ行',
  ta: 'た行',
  na: 'な行',
  ha: 'は行',
  ma: 'ま行',
  ya: 'や行',
  ra: 'ら行',
  wa: 'わ行',
};

/** 片假名的行標籤（ア行、カ行…） */
export const ROW_LABEL_KATAKANA: Record<string, string> = {
  a: 'ア行',
  ka: 'カ行',
  sa: 'サ行',
  ta: 'タ行',
  na: 'ナ行',
  ha: 'ハ行',
  ma: 'マ行',
  ya: 'ヤ行',
  ra: 'ラ行',
  wa: 'ワ行',
};

/** 行標籤：平假名「あ行」、片假名「ア行」。 */
export function rowLabel(row: string, script: Script = 'hiragana'): string {
  return (script === 'katakana' ? ROW_LABEL_KATAKANA : ROW_LABEL)[row] ?? row;
}

/** 文字的中文名稱（介面文字用）：平假名／片假名 */
export function scriptLabel(script: Script): string {
  return script === 'katakana' ? '片假名' : '平假名';
}

/** 清音總數 */
export const SEION_COUNT = 46;

export function byId(id: string): Kana | undefined {
  return kanaMap.get(id);
}

/** 與 byId 相同，但找不到時丟錯，用在 id 一定存在的地方。 */
export function mustById(id: string): Kana {
  const k = kanaMap.get(id);
  if (!k) throw new Error(`Unknown kana id: ${id}`);
  return k;
}

export function wordById(id: string): Word | undefined {
  return wordMap.get(id);
}

export function exampleWordOf(kana: Kana): Word | undefined {
  return kana.exampleWordId ? wordMap.get(kana.exampleWordId) : undefined;
}

export function kanaOfKind(kind: KanaKind, script: Script = 'hiragana'): Kana[] {
  return allKana.filter((k) => k.script === script && k.kind === kind);
}

/** 學習順序：清音依五十音順序（json 內的順序即學習順序）。 */
export function seionOrder(script: Script = 'hiragana'): Kana[] {
  return kanaOfKind('seion', script);
}

export function byRow(row: string, script: Script = 'hiragana'): Kana[] {
  return seionOrder(script).filter((k) => k.row === row);
}

/** 某個假名所在的行（僅清音有意義）。 */
export function rowOf(kanaId: string): string | undefined {
  const k = kanaMap.get(kanaId);
  return k?.kind === 'seion' ? k.row : undefined;
}

/**
 * 五十音表清音分頁的 5 欄排版（55 格）：以 kana id 或 null（空格）表示。
 * 照 design/C2-03：や行、わ行、ん 的空格保留。
 */
export function seionGrid(script: Script = 'hiragana'): (string | null)[] {
  if (script === 'katakana') {
    // 片假名的排版與平假名完全相同（id 只差前綴）
    return seionGrid('hiragana').map((id) => (id === null ? null : `k-${id.slice(2)}`));
  }
  const chars =
    'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもや・ゆ・よらりるれろわ・・・をん・・・・';
  const byChar = new Map(seionOrder(script).map((k) => [k.char, k]));
  return [...chars].map((c) => (c === '・' ? null : (byChar.get(c)?.id ?? null)));
}

/**
 * 由已學清音組成的單字（供「一行學完」畫面使用）。
 * 單字的每個字元都必須在 learnedChars 內。
 */
export function wordsReadableWith(learnedChars: Iterable<string>): Word[] {
  const set = new Set(learnedChars);
  return allWords.filter((w) => [...w.text].every((c) => set.has(c)));
}

/** 從「學完前」到「學完後」新增能讀的單字。 */
export function newlyReadableWords(
  learnedBefore: Iterable<string>,
  learnedAfter: Iterable<string>,
): Word[] {
  const before = new Set(wordsReadableWith(learnedBefore).map((w) => w.id));
  return wordsReadableWith(learnedAfter).filter((w) => !before.has(w.id));
}

/**
 * 詳情頁「容易搞混」用的 kana 層級分組 id（階段 1 遺留）。
 * 練習用的易混淆字組（答錯紀錄、練習入口）請用 data/confusables.ts 的 group id 與
 * logic/confusion.ts 的 groupsForWrongAnswer。
 */
export function confusionGroupId(kanaId: string): string | undefined {
  const k = kanaMap.get(kanaId);
  if (!k?.confusableWith?.length) return undefined;
  return [k.id, ...k.confusableWith].sort().join('|');
}

/** 片假名對應的平假名（同讀音）；平假名或沒有對應時回傳 undefined。 */
export function hiraganaOf(kana: Kana): Kana | undefined {
  return kana.hiraganaId ? kanaMap.get(kana.hiraganaId) : undefined;
}

/** 外來語詞庫：片假名詞，不含只當例字用的詞（exampleOnly）。 */
export function loanwords(): Word[] {
  return allWords.filter((w) => w.script === 'katakana' && !w.exampleOnly);
}
