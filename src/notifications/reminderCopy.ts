// 提醒文案（spec 5.9）：本機通知的內容在排程當下就固定，所以只有最近的那一則用即時資料。
// 優先順序：待複習 > 連續天數 > 通用。語氣輕鬆，不責備。

export const REMINDER_TITLE = '諧音五十音';
export const GENERIC_BODY = '今天的五十音練習還沒做喔，5 分鐘就好';
export const RECALL_3_BODY = '好久不見，你的五十音還記得嗎？回來 3 分鐘就好';
const RECALL_7_GENERIC_BODY = '回來看看，今天只要 3 分鐘';

export interface ReminderCopyInput {
  /** 待複習的字數 */
  dueCount: number;
  /** 連續練習天數 */
  streak: number;
}

export function buildReminderCopy({ dueCount, streak }: ReminderCopyInput): { title: string; body: string } {
  let body = GENERIC_BODY;
  if (dueCount > 0) body = `有 ${dueCount} 個字快忘了，回來複習 3 分鐘`;
  else if (streak >= 2) body = `連續 ${streak} 天了，今天別中斷`;
  return { title: REMINDER_TITLE, body };
}

/** 7 天沒回來的召回文案；已學字數為 0 時用通用句。 */
export function buildRecall7Copy(learnedCount: number): { title: string; body: string } {
  return {
    title: REMINDER_TITLE,
    body: learnedCount > 0 ? `你已經學了 ${learnedCount} 個字，只差一點點，回來繼續吧` : RECALL_7_GENERIC_BODY,
  };
}
