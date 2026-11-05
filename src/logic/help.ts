// 幫助與聯絡頁：常見問題、聯絡方式、回報問題信件。純資料與純函式。

export const CONTACT_EMAIL = 'connect.ptalk@gmail.com';
export const THREADS_HANDLE = '@ptalk.design';
export const THREADS_URL = 'https://www.threads.com/@ptalk.design';

export interface FaqItem {
  key: string;
  q: string;
  a: string;
}

export const FAQ: readonly FaqItem[] = [
  { key: 'amount', q: '一天要學多少？', a: '建議每天學 3 個新字，之後靠複習記住。想多學也可以，首頁按「再學 3 個」就行，只是一次學太多容易忘。' },
  { key: 'order', q: '為什麼先學平假名？', a: '平假名是日文最基本的字，學完 46 個清音後，才會開始學片假名。' },
  { key: 'romaji', q: '拼音為什麼不見了？', a: '同一個字連續答對 3 次，就會把拼音藏起來，逼你用記憶認字。想一直看到拼音，可以到設定關掉自動淡出。' },
  { key: 'drop', q: '掉字歸類怎麼玩？', a: '字會從上面掉下來，把它拖進對的籃子。專門練長得很像的字，第一次玩會有圖解說明。' },
  { key: 'recall', q: '默寫怎麼判對錯？', a: '你寫完後，系統會拿你的筆畫跟標準寫法比對，不需要自己打分數。寫錯可以按「重寫」再試，也可以選「不會寫」直接看答案。' },
  { key: 'sound', q: '沒有聲音怎麼辦？', a: '先確認手機的音量，以及側邊的靜音鍵（App 在靜音時也會出聲）。還是沒有的話，請用「回報問題」告訴我們。' },
  { key: 'notify', q: '提醒通知沒收到？', a: '到手機的「設定 → 通知」確認這個 App 的通知有打開，再回到 App 的設定檢查提醒時間。' },
  { key: 'data', q: '進度會不會不見？', a: '進度只存在這支手機，沒有帳號。刪除 App 或換手機，進度不會自動帶走。' },
];

export interface ReportInfo {
  appVersion: string;
  os: string;
  osVersion: string | number;
}

/** 回報問題的信件網址：主旨固定，內文帶入 App 版本與系統版本（不含學習進度）。 */
export function reportMailto(info: ReportInfo): string {
  const subject = '五十音問題回報';
  const body = `\n\n（請在上方描述遇到的問題）\n\n---\nApp 版本：${info.appVersion}\n系統：${info.os} ${info.osVersion}`;
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** 一般聯絡（不帶裝置資訊）。 */
export function contactMailto(): string {
  return `mailto:${CONTACT_EMAIL}`;
}
