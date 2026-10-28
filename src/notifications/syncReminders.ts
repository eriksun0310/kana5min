// 從 store 讀目前狀態再重排提醒；App 啟動／回前景、練習完成、設定頁改動時呼叫（不會拋錯、不會阻擋）。

import { computeStreak } from '../logic/progressStats';
import { learnedIdSet } from '../logic/session';
import { isDue } from '../logic/srs';
import { progressList, useProgressStore } from '../store/progressStore';
import { useSettingsStore } from '../store/settingsStore';
import { ensureReminderPermission, syncReminders } from './reminder';

export async function syncRemindersFromStores(now: number = Date.now()): Promise<void> {
  try {
    const { reminder, practiceDates } = useSettingsStore.getState();
    const list = progressList(useProgressStore.getState().progress);
    await syncReminders({
      now,
      enabled: reminder.enabled,
      time: reminder.time,
      practiceDates,
      dueCount: list.filter((p) => isDue(p, now)).length,
      streak: computeStreak(practiceDates, now),
      learnedCount: learnedIdSet(list).size,
    });
  } catch {
    // 提醒排程失敗不影響 App
  }
}

/** 開啟提醒：請求權限，通過才寫入設定並重排；回傳 false 表示被拒（設定維持關閉）。 */
export async function turnOnReminder(): Promise<boolean> {
  const ok = await ensureReminderPermission();
  useSettingsStore.getState().setReminder({ enabled: ok });
  await syncRemindersFromStores();
  return ok;
}
