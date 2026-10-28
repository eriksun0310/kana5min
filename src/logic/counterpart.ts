// 詳情頁「對照」：同 kind、同 romaji 的另一種文字（あ ↔ ア）。

import { allKana, byId } from '../data';

/** 回傳平假名／片假名的對應字 id；找不到（資料缺漏）回傳 undefined。 */
export function counterpartId(kanaId: string): string | undefined {
  const k = byId(kanaId);
  if (!k) return undefined;
  const other = k.script === 'hiragana' ? 'katakana' : 'hiragana';
  const candidates = allKana.filter(
    (x) => x.script === other && x.kind === k.kind && x.romaji === k.romaji,
  );
  if (candidates.length === 1) return candidates[0].id;
  // ぢ／じ、づ／ず 同 romaji：用片假名的 hiraganaId 欄位精確對應
  if (k.script === 'katakana') return k.hiraganaId && byId(k.hiraganaId) ? k.hiraganaId : undefined;
  return allKana.find((x) => x.script === 'katakana' && x.hiraganaId === k.id)?.id;
}

/**
 * 詳情頁按「對照」該做什麼：
 * - 上一頁剛好就是對照的那個字（例如 き → キ 後又按對照）：回上一頁（pop），堆疊不會越疊越深；
 * - 其他情況：往前進一頁（push），這樣按返回會回到原本的字，而不是直接回五十音表。
 */
export function compareAction(previousKanaId: string | undefined, otherId: string): 'back' | 'push' {
  return previousKanaId === otherId ? 'back' : 'push';
}
