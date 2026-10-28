// 好笑記憶包的解鎖規則（docs/architecture.md 第 12 節）。純函式。
// 解鎖的單位是「讀音」（清音的 romaji），平假名與片假名共用。

import { seionOrder } from '../data';
import { isFreeSound, punOfSound, soundOf } from '../data/puns';

export interface PunAccess {
  /** 是否已買斷 */
  purchased: boolean;
  /** 已用廣告解鎖的讀音 */
  unlocked: readonly string[];
}

/** 一次看廣告解鎖的讀音數量上限（點到的字 + 往後 2 個）。 */
export const BATCH_SIZE = 3;

/** 買斷提示：看完幾支廣告後提示一次。 */
export const PROMPT_AFTER_ADS = 2;

/** 讀音是否已解鎖：買斷、免費讀音、或已用廣告解鎖。 */
export function isPunUnlocked(sound: string, access: PunAccess): boolean {
  return access.purchased || isFreeSound(sound) || access.unlocked.includes(sound);
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

/** 看完第 2 支廣告後提示一次買斷：adsWatched ≥ 2 且還沒提示過。 */
export function shouldPromptPurchase(adsWatched: number, alreadyPrompted: boolean): boolean {
  return adsWatched >= PROMPT_AFTER_ADS && !alreadyPrompted;
}
