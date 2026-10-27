import kanaJson from './kana.json';
import wordsJson from './words.json';
import type { Kana, KanaKind, Script, Word } from './types';

export * from './types';
export { hintFor } from './hints';

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
 * 易混淆字組的 id：組內所有 Kana id 排序後以 | 相連（わ／ね／れ 為同一組）。
 * 沒有易混淆字時回傳 undefined。
 */
export function confusionGroupId(kanaId: string): string | undefined {
  const k = kanaMap.get(kanaId);
  if (!k?.confusableWith?.length) return undefined;
  return [k.id, ...k.confusableWith].sort().join('|');
}
