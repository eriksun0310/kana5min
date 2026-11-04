// 好笑記憶包的解鎖規則（docs/architecture.md 第 12 節）。純函式。
// 解鎖的單位是「key」：清音是讀音（romaji），濁音／半濁音／拗音是平假名 id（h-ga），平假名與片假名共用。
// 濁音、半濁音、拗音的句子只能買斷解鎖（不進看廣告的批次）。

import { seionOrder } from '../data';
import { isFreeSound, isSeionKey, punOfSound, soundOf } from '../data/puns';

export interface PunAccess {
  /** 是否已買斷 */
  purchased: boolean;
  /** 已用廣告解鎖的讀音 */
  unlocked: readonly string[];
}

/** 一次看廣告解鎖的讀音數量上限（點到的字 + 往後 2 個）。 */
export const BATCH_SIZE = 3;

/** 買斷提示：看完第幾支廣告時各提示一次（只跳這兩次，之後只留被動入口）。 */
export const PROMPT_AT_ADS: readonly number[] = [2, 6];

/** 讀音是否已解鎖：買斷、免費讀音、或已用廣告解鎖。 */
export function isPunUnlocked(sound: string, access: PunAccess): boolean {
  if (access.purchased) return true;
  return isSeionKey(sound) && (isFreeSound(sound) || access.unlocked.includes(sound));
}

/** 清音順序的讀音清單（有諧音、非免費才會被解鎖流程用到）。 */
function seionSounds(): string[] {
  const out: string[] = [];
  for (const k of seionOrder('hiragana')) {
    const s = soundOf(k.id);
    if (s) out.push(s);
  }
  return out;
}

/**
 * 看一支廣告會解鎖的讀音（最多 3 個）：
 * 點到的讀音，加上照清音順序在它之後、有諧音、尚未解鎖、非免費的 2 個；
 * 之後不足就從它之前的同條件讀音補。
 * 點到的讀音本身沒有諧音、是免費讀音或已解鎖時，它不算在內（只回傳補上的 2 個）。
 */
export function nextUnlockBatch(sound: string, unlocked: readonly string[]): string[] {
  if (!isSeionKey(sound)) return []; // 濁音、拗音只能買斷
  const order = seionSounds();
  const locked = (s: string) => !isFreeSound(s) && !unlocked.includes(s) && punOfSound(s) !== undefined;
  const batch: string[] = [];
  const selfCounts = locked(sound);
  if (selfCounts) batch.push(sound);

  const at = order.indexOf(sound);
  const after = order.filter((s, i) => i > at && s !== sound && locked(s));
  const before = order.filter((s, i) => i < at && s !== sound && locked(s));
  const extra = [...after, ...before].slice(0, BATCH_SIZE - 1);
  return [...batch, ...extra];
}

/** 剛看完第 2 支、第 6 支廣告時提示買斷。計數只會 +1，所以每個時間點只會碰到一次。 */
export function shouldPromptPurchase(adsWatched: number): boolean {
  return PROMPT_AT_ADS.includes(adsWatched);
}

export type PunCardState = 'none' | 'unlocked' | 'locked';

/** 諧音卡片的狀態：沒有諧音不顯示；已解鎖（含買斷）顯示句子；其餘為「看廣告／買斷」的鎖定卡。 */
export function punCardState(sound: string | undefined, access: PunAccess): PunCardState {
  if (!sound || !punOfSound(sound)) return 'none';
  return isPunUnlocked(sound, access) ? 'unlocked' : 'locked';
}

/**
 * 是否可以看獎勵廣告解鎖：已買斷、已解鎖、沒有可解鎖的字時一律不行
 * （廣告入口不出現，也不會呼叫 showRewardedAd）。
 */
export function canWatchRewardedAd(sound: string, access: PunAccess): boolean {
  if (!isSeionKey(sound)) return false;
  if (access.purchased || isPunUnlocked(sound, access)) return false;
  return nextUnlockBatch(sound, access.unlocked).length > 0;
}
