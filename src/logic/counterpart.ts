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
