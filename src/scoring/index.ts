// 計分介面：掉字遊戲與各題型引擎都從這裡記錄「每個假名各自的對錯」與「把 X 當成 Y」。
// 與 SRS（複習排程）分開：這裡只累計次數，寫入 sqlite 的 kana_stat、confusion_pair 兩張表。
// 純呼叫 progressStore；repository 尚未載入時只更新記憶體。
import { useProgressStore } from '../store/progressStore';

/** 記錄某個假名的一次對錯（kanaId 例如 'h-ku'）。寫入失敗不會丟錯。 */
export function recordKanaResult(kanaId: string, correct: boolean, now: number = Date.now()): Promise<void> {
  return useProgressStore
    .getState()
    .recordKanaResult(kanaId, correct, now)
    .catch(() => {});
}

/** 記錄「把 truth 當成 picked」一次（truth、picked 都是 Kana id；相同或空字串不記）。寫入失敗不會丟錯。 */
export function recordConfusion(truth: string, picked: string, now: number = Date.now()): Promise<void> {
  return useProgressStore
    .getState()
    .recordConfusion(truth, picked, now)
    .catch(() => {});
}

/** 某個假名被當成其他字的次數，由多到少。 */
export function confusedWith(truth: string): { pickedId: string; count: number }[] {
  return useProgressStore
    .getState()
    .confusionPairs.filter((c) => c.truthId === truth)
    .map((c) => ({ pickedId: c.pickedId, count: c.count }))
    .sort((a, b) => b.count - a.count);
}
