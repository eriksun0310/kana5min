// 每日提醒：用 expo-notifications 排「每天固定時間」的本機通知（spec 5.9）。
// 只有這一則通知，固定 identifier，改時間或關閉時先取消舊的再排。

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const REMINDER_ID = 'kana5min-daily-reminder';
const ANDROID_CHANNEL_ID = 'daily-reminder';

export const REMINDER_TITLE = '諧音五十音';
export const REMINDER_BODY = '今天的五十音練習還沒做喔，5 分鐘就好';

/** 'HH:MM' 轉成小時與分鐘；格式錯誤時回傳 null。 */
export function parseReminderTime(time: string): { hour: number; minute: number } | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

/** 設定頁的時間選項：07:00～22:00，每 30 分鐘一個。 */
export const REMINDER_TIME_OPTIONS: string[] = (() => {
  const list: string[] = [];
  for (let h = 7; h <= 22; h += 1) {
    list.push(`${String(h).padStart(2, '0')}:00`);
    if (h < 22) list.push(`${String(h).padStart(2, '0')}:30`);
  }
  return list;
})();

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

/** 取消每日提醒（沒排過也不會出錯）。 */
export async function cancelReminder(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(REMINDER_ID);
  } catch {
    // 沒有排程時略過
  }
}

/** 取消舊的、依新時間重排每日通知。時間格式錯誤時只取消。 */
export async function scheduleReminder(time: string): Promise<void> {
  ensureHandler();
  await cancelReminder();
  const parsed = parseReminderTime(time);
  if (!parsed) return;
  await ensureAndroidChannel();
  await Notifications.scheduleNotificationAsync({
    identifier: REMINDER_ID,
    content: { title: REMINDER_TITLE, body: REMINDER_BODY },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: parsed.hour,
      minute: parsed.minute,
      channelId: ANDROID_CHANNEL_ID,
    },
  });
}

/**
 * 開啟提醒：先確認／請求通知權限，通過才排程。
 * 回傳 false 表示權限被拒（呼叫端要讓開關退回關閉並提示使用者）。
 */
export async function enableReminder(time: string): Promise<boolean> {
  try {
    ensureHandler();
    let { granted } = await Notifications.getPermissionsAsync();
    if (!granted) {
      ({ granted } = await Notifications.requestPermissionsAsync());
    }
    if (!granted) return false;
    await scheduleReminder(time);
    return true;
  } catch {
    return false;
  }
}
