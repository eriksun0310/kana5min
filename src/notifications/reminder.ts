// 每日提醒與召回（spec 5.9）：用 expo-notifications 排「單次」本機通知。
// 每次 App 啟動／回前景、練習完成、設定改變時，先取消所有舊的再重排：
// 未來 7 天的每日提醒（今天練過就不排今天）＋ 3、7 天沒回來的召回。

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { toDateKey } from '../logic/progressStats';
import { buildRecall7Copy, buildReminderCopy, RECALL_3_BODY, REMINDER_TITLE } from './reminderCopy';
import {
  LEGACY_REMINDER_ID,
  planDailyReminders,
  planRecalls,
  RECALL_ID_PREFIX,
  REMINDER_ID_PREFIX,
} from './reminderPlan';

export { REMINDER_TIME_OPTIONS, parseReminderTime } from './reminderTime';

const ANDROID_CHANNEL_ID = 'daily-reminder';

let handlerReady = false;

function ensureHandler() {
  if (handlerReady) return;
  handlerReady = true;
  // App 在前景時也顯示提醒橫幅
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: '每日提醒',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

/** 取消所有提醒與召回（含舊版每天固定的那一則；沒排過也不會出錯）。 */
export async function cancelReminder(): Promise<void> {
  try {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    const ids = all
      .map((n) => n.identifier)
      .filter(
        (id) =>
          id === LEGACY_REMINDER_ID || id.startsWith(REMINDER_ID_PREFIX) || id.startsWith(RECALL_ID_PREFIX),
      );
    await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
  } catch {
    // 取得或取消失敗時略過
  }
}

export interface ReminderSyncInput {
  now: number;
  enabled: boolean;
  /** 'HH:MM' */
  time: string;
  practiceDates: string[];
  /** 待複習字數（只用在最近的一則） */
  dueCount: number;
  /** 連續天數（只用在最近的一則） */
  streak: number;
  /** 已學字數（7 天召回用） */
  learnedCount: number;
}

/**
 * 取消舊的、依目前狀態重排。沒開提醒就只取消；沒有通知權限也只取消（這裡絕不請求權限）。
 */
export async function syncReminders(input: ReminderSyncInput): Promise<void> {
  ensureHandler();
  await cancelReminder();
  if (!input.enabled) return;
  try {
    const { granted } = await Notifications.getPermissionsAsync();
    if (!granted) return;
    await ensureAndroidChannel();
    const recalls = planRecalls({ now: input.now, time: input.time });
    const daily = planDailyReminders({
      now: input.now,
      time: input.time,
      practiceDates: input.practiceDates,
      excludeKeys: recalls.map((r) => toDateKey(r.date.getTime())),
    });
    const schedule = (id: string, date: Date, content: { title: string; body: string }) =>
      Notifications.scheduleNotificationAsync({
        identifier: id,
        content,
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: ANDROID_CHANNEL_ID },
      });
    // 只有最近的一則用即時資料，其餘用通用文案
    const generic = buildReminderCopy({ dueCount: 0, streak: 0 });
    const live = buildReminderCopy({ dueCount: input.dueCount, streak: input.streak });
    for (const [i, slot] of daily.entries()) await schedule(slot.id, slot.date, i === 0 ? live : generic);
    for (const slot of recalls) {
      const content =
        slot.id === `${RECALL_ID_PREFIX}3`
          ? { title: REMINDER_TITLE, body: RECALL_3_BODY }
          : buildRecall7Copy(input.learnedCount);
      await schedule(slot.id, slot.date, content);
    }
  } catch {
    // 排程失敗不影響 App
  }
}

/**
 * 確認／請求通知權限。回傳 false 表示被拒（呼叫端要讓開關維持關閉並提示使用者）。
 * 只負責權限；排程由 syncReminders 處理。
 */
export async function ensureReminderPermission(): Promise<boolean> {
  try {
    ensureHandler();
    let { granted } = await Notifications.getPermissionsAsync();
    if (!granted) {
      ({ granted } = await Notifications.requestPermissionsAsync());
    }
    return granted;
  } catch {
    return false;
  }
}
