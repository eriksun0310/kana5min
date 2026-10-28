// 記憶小提示：改由 puns.ts 提供（好笑記憶包，docs/architecture.md 第 12 節）。
// 保留函式名稱給既有呼叫端；是否已解鎖由 PunCard 與 logic/punUnlock 決定。

import { punFor } from './puns';

/** 取得假名的諧音梗（不管是否解鎖）；沒有則回傳 undefined。 */
export function hintFor(kanaId: string): string | undefined {
  return punFor(kanaId);
}
