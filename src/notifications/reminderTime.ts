// 提醒時間格式與設定頁的時間選項。

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
