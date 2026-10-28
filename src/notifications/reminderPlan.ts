// 提醒「要排哪幾天」的純函式（不碰 expo-notifications，方便測試）。

import { toDateKey } from '../logic/progressStats';
import { parseReminderTime } from './reminderTime';

export const REMINDER_ID_PREFIX = 'kana5min-reminder-';
export const RECALL_ID_PREFIX = 'kana5min-recall-';
/** 舊版「每天固定」的單一通知 id（升級後要清掉） */
export const LEGACY_REMINDER_ID = 'kana5min-daily-reminder';
export const REMINDER_DAYS = 7;
export const RECALL_AFTER_DAYS = [3, 7] as const;

function at(base: Date, addDays: number, hour: number, minute: number): Date {
  return new Date(base.getFullYear(), base.getMonth(), base.getDate() + addDays, hour, minute, 0, 0);
}

export interface ReminderSlot {
  /** 通知 identifier */
  id: string;
  /** 觸發時間 */
  date: Date;
}

/**
 * 每日提醒：從今天起往後找 `days` 個要提醒的日子。
 * 今天已練習、或現在已經超過（或等於）提醒時間，就不排今天。
 * `excludeKeys`（YYYY-MM-DD）的日子也跳過，用來讓位給召回通知。
 */
export function planDailyReminders(args: {
  now: number;
  time: string;
  practiceDates: string[];
  days?: number;
  excludeKeys?: string[];
}): ReminderSlot[] {
  const parsed = parseReminderTime(args.time);
  if (!parsed) return [];
  const days = args.days ?? REMINDER_DAYS;
  const nowDate = new Date(args.now);
  const exclude = new Set(args.excludeKeys ?? []);
  const slots: ReminderSlot[] = [];
  for (let i = 0; slots.length < days && i < days + 8; i += 1) {
    const date = at(nowDate, i, parsed.hour, parsed.minute);
    if (date.getTime() <= args.now) continue;
    const key = toDateKey(date.getTime());
    if (i === 0 && args.practiceDates.includes(key)) continue;
    if (exclude.has(key)) continue;
    slots.push({ id: `${REMINDER_ID_PREFIX}${key.replace(/-/g, '')}`, date });
  }
  return slots;
}

/** 召回：3 天後與 7 天後各一則，時間用提醒時間。 */
export function planRecalls(args: { now: number; time: string }): ReminderSlot[] {
  const parsed = parseReminderTime(args.time);
  if (!parsed) return [];
  const nowDate = new Date(args.now);
  return RECALL_AFTER_DAYS.map((d) => ({
    id: `${RECALL_ID_PREFIX}${d}`,
    date: at(nowDate, d, parsed.hour, parsed.minute),
  }));
}

/** 該不該在結果頁問「每天提醒你練習嗎？」：只問一次、提醒已開就不問。 */
export function shouldAskReminder(args: { reminderAsked: boolean; enabled: boolean }): boolean {
  return !args.reminderAsked && !args.enabled;
}
