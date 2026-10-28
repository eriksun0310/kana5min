// 新手教學的純邏輯：旗標預設、舊資料遷移、啟動時要進哪個畫面、首頁「？」說明內容。

export type LearnTipKey = 'intro' | 'stroke' | 'trace';

export interface LearnTipsSeen {
  intro: boolean;
  stroke: boolean;
  trace: boolean;
}

export const LEARN_TIP_KEYS: readonly LearnTipKey[] = ['intro', 'stroke', 'trace'];

/** 新使用者：三則學新字提示都還沒看過 */
export function noLearnTipsSeen(): LearnTipsSeen {
  return { intro: false, stroke: false, trace: false };
}

/** 全部看過（老使用者、開發用深連結預設） */
export function allLearnTipsSeen(): LearnTipsSeen {
  return { intro: true, stroke: true, trace: true };
}

export interface TourFlags {
  tourSeen: boolean;
  learnTipsSeen: LearnTipsSeen;
}

/**
 * 載入已存的設定時補上教學旗標：
 * 沒有這兩個欄位的舊資料，已完成歡迎頁（onboarded）的老使用者視為都看過（不再拉去看導覽，
 * 可到設定「重看教學」）；還沒完成歡迎頁的維持預設（從導覽開始）。
 * 已有欄位時沿用已存的值，缺的鍵補成預設。
 */
export function migrateTourFlags(persisted: unknown): TourFlags {
  const p = (persisted && typeof persisted === 'object' ? persisted : {}) as {
    onboarded?: unknown;
    tourSeen?: unknown;
    learnTipsSeen?: unknown;
  };
  const legacy = p.onboarded === true;
  const fallbackTips = legacy ? allLearnTipsSeen() : noLearnTipsSeen();
  const tourSeen = typeof p.tourSeen === 'boolean' ? p.tourSeen : legacy;
  const saved = p.learnTipsSeen && typeof p.learnTipsSeen === 'object' ? (p.learnTipsSeen as Record<string, unknown>) : null;
  const learnTipsSeen = { ...fallbackTips };
  if (saved) {
    for (const k of LEARN_TIP_KEYS) {
      if (typeof saved[k] === 'boolean') learnTipsSeen[k] = saved[k] as boolean;
    }
  }
  return { tourSeen, learnTipsSeen };
}

export type EntryRoute = 'tour' | 'welcome' | 'home';

/** 啟動時要進哪裡：沒完成歡迎頁且沒看過導覽 → 導覽；沒完成歡迎頁 → 歡迎頁；否則首頁。 */
export function entryRoute(s: { onboarded: boolean; tourSeen: boolean }): EntryRoute {
  if (s.onboarded) return 'home';
  return s.tourSeen ? 'welcome' : 'tour';
}

export interface HomeHelpItem {
  key: 'learned' | 'due' | 'new' | 'rows' | 'start';
  title: string;
  body: string;
}

/** 首頁「？」說明面板的內容（每項一句話）；goalMinutes 是每日目標分鐘數。 */
export function homeHelpItems(goalMinutes: number): HomeHelpItem[] {
  return [
    { key: 'learned', title: '已學', body: '你學過的字有幾個，總共 46 個清音。' },
    { key: 'due', title: '待複習', body: '快忘記、該複習的字，按開始會先考你。' },
    { key: 'new', title: '今天新字', body: '今天要學的新字，最多 3 個。' },
    { key: 'rows', title: '各行進度', body: 'あ行到わ行，紅色越滿越熟。' },
    {
      key: 'start',
      title: `開始今天的 ${goalMinutes} 分鐘`,
      body: '時間到會問你要不要再練；中途離開，回來可以接續。',
    },
  ];
}

export interface TourPage {
  key: 'daily' | 'pun' | 'review';
  title: string;
  desc: string;
}

export const TOUR_PAGES: readonly TourPage[] = [
  { key: 'daily', title: '每天只學 3 個字', desc: '看、聽、寫，最後小測驗。5 分鐘就夠，不用硬撐。' },
  { key: 'pun', title: 'く＝哭', desc: '看到字，想到梗，就記住了。' },
  { key: 'review', title: '答錯的字，我會再叫你', desc: '在你快忘記的時候出現，複習剛剛好。' },
];
