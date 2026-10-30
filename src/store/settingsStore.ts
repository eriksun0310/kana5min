import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Settings } from '../data/types';
import { addPracticeDate } from '../logic/progressStats';
import { migrateTourFlags, noLearnTipsSeen, type LearnTipKey, type LearnTipsSeen } from '../logic/tour';

export interface SettingsState extends Settings {
  /** 是否已完成歡迎頁（選過每日目標） */
  onboarded: boolean;
  /** 有練習的日期（本地 YYYY-MM-DD），用來算連續天數 */
  practiceDates: string[];
  /** 畢業畫面是否看過（階段 4 使用） */
  graduateSeen: boolean;
  /** 片假名開始畫面（C2-18）是否看過；看過就不再自動顯示 */
  kataIntroSeen: boolean;
  /** 好笑記憶包：已用廣告解鎖的讀音（romaji，例如 'sa'），平假名與片假名共用 */
  punUnlocked: string[];
  /** 好笑記憶包：已看完的獎勵廣告數 */
  punAdsWatched: number;
  /** 看完 2 支廣告後的買斷提示是否已出現過 */
  punPromptAfterAdsShown: boolean;
  /** 片假名開始畫面的買斷連結是否已出現過 */
  punPromptKataShown: boolean;
  // ---- 新手教學 ----
  /** 首次導覽（3 頁）是否看過或略過 */
  tourSeen: boolean;
  /** 學新字第一次的提示氣泡是否看過（看與聽、筆順、描寫各一則） */
  learnTipsSeen: LearnTipsSeen;
  // ---- /新手教學 ----
  // --- 提醒優化（reminder session）---
  /** 結果頁的「每天提醒你練習嗎？」是否已問過（不論選什麼都只問一次） */
  reminderAsked: boolean;
  // --- 提醒優化 結束 ---
  /** 掉字歸類的操作方式：拖曳到籃子（預設）或直接點籃子 */
  dropControl: 'drag' | 'tap';
  /** 掉字歸類的怎麼玩教學是否看過（只在第一次自動出現） */
  dropTutorialSeen: boolean;

  setTheme: (theme: Settings['theme']) => void;
  setDailyGoalMinutes: (m: Settings['dailyGoalMinutes']) => void;
  setRomajiAutoHide: (on: boolean) => void;
  setReminder: (reminder: Partial<Settings['reminder']>) => void;
  setAudioSpeed: (speed: Settings['audioSpeed']) => void;
  setOnboarded: (done: boolean) => void;
  setGraduateSeen: (seen: boolean) => void;
  setKataIntroSeen: (seen: boolean) => void;
  setPunPackPurchased: (purchased: boolean) => void;
  /** 加入一批已解鎖的讀音（不重複） */
  unlockPuns: (sounds: readonly string[]) => void;
  /** 看完一支獎勵廣告：punAdsWatched + 1，回傳新的數字 */
  addPunAdWatched: () => number;
  setPunPromptAfterAdsShown: (shown: boolean) => void;
  setPunPromptKataShown: (shown: boolean) => void;
  // ---- 新手教學 ----
  setTourSeen: (seen: boolean) => void;
  setLearnTipSeen: (key: LearnTipKey, seen?: boolean) => void;
  /** 設定「重看教學」：導覽與三則提示都重來 */
  resetTutorial: () => void;
  // ---- /新手教學 ----
  setReminderAsked: (asked: boolean) => void;
  setDropControl: (control: 'drag' | 'tap') => void;
  setDropTutorialSeen: (seen: boolean) => void;
  /** 記錄今天有練習 */
  markPracticed: (now: number) => void;
  /** 回到預設值（除錯用） */
  resetSettings: () => void;
}

export const defaultSettings: Settings & {
  onboarded: boolean;
  practiceDates: string[];
  graduateSeen: boolean;
  kataIntroSeen: boolean;
  punUnlocked: string[];
  punAdsWatched: number;
  punPromptAfterAdsShown: boolean;
  punPromptKataShown: boolean;
  tourSeen: boolean;
  learnTipsSeen: LearnTipsSeen;
  reminderAsked: boolean;
  dropControl: 'drag' | 'tap';
  dropTutorialSeen: boolean;
} = {
  theme: 'system',
  dailyGoalMinutes: 5,
  romajiAutoHide: true,
  reminder: { enabled: false, time: '20:00' },
  audioSpeed: 'normal',
  punPackPurchased: false,
  onboarded: false,
  practiceDates: [],
  graduateSeen: false,
  kataIntroSeen: false,
  punUnlocked: [],
  punAdsWatched: 0,
  punPromptAfterAdsShown: false,
  punPromptKataShown: false,
  tourSeen: false,
  learnTipsSeen: noLearnTipsSeen(),
  reminderAsked: false,
  dropControl: 'drag',
  dropTutorialSeen: false,
};

export const SETTINGS_STORAGE_KEY = 'kana5min-settings';

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...defaultSettings,
      setTheme: (theme) => set({ theme }),
      setDailyGoalMinutes: (dailyGoalMinutes) => set({ dailyGoalMinutes }),
      setRomajiAutoHide: (romajiAutoHide) => set({ romajiAutoHide }),
      setReminder: (reminder) => set((s) => ({ reminder: { ...s.reminder, ...reminder } })),
      setAudioSpeed: (audioSpeed) => set({ audioSpeed }),
      setOnboarded: (onboarded) => set({ onboarded }),
      setGraduateSeen: (graduateSeen) => set({ graduateSeen }),
      setKataIntroSeen: (kataIntroSeen) => set({ kataIntroSeen }),
      setPunPackPurchased: (punPackPurchased) => set({ punPackPurchased }),
      unlockPuns: (sounds) =>
        set((s) => ({ punUnlocked: [...new Set([...s.punUnlocked, ...sounds])] })),
      addPunAdWatched: () => {
        const next = get().punAdsWatched + 1;
        set({ punAdsWatched: next });
        return next;
      },
      setPunPromptAfterAdsShown: (punPromptAfterAdsShown) => set({ punPromptAfterAdsShown }),
      setPunPromptKataShown: (punPromptKataShown) => set({ punPromptKataShown }),
      setTourSeen: (tourSeen) => set({ tourSeen }),
      setLearnTipSeen: (key, seen = true) =>
        set((s) => ({ learnTipsSeen: { ...s.learnTipsSeen, [key]: seen } })),
      resetTutorial: () => set({ tourSeen: false, learnTipsSeen: noLearnTipsSeen() }),
      setReminderAsked: (reminderAsked) => set({ reminderAsked }),
      setDropControl: (dropControl) => set({ dropControl }),
      setDropTutorialSeen: (dropTutorialSeen) => set({ dropTutorialSeen }),
      markPracticed: (now) => set((s) => ({ practiceDates: addPracticeDate(s.practiceDates, now) })),
      resetSettings: () =>
        set({ ...defaultSettings, punUnlocked: [], learnTipsSeen: noLearnTipsSeen() }),
    }),
    {
      name: SETTINGS_STORAGE_KEY,
      version: 3,
      storage: createJSONStorage(() => AsyncStorage),
      // v2 新增好笑記憶包欄位：舊資料補預設值（punPackPurchased 沿用已存的值）
      // v3 新增新手教學旗標：老使用者（已完成歡迎頁）視為都看過，見 migrateTourFlags
      migrate: (persisted) =>
        ({ ...defaultSettings, ...((persisted as object) ?? {}), ...migrateTourFlags(persisted) }) as SettingsState,
    },
  ),
);

/** 等 AsyncStorage 的設定讀回來（啟動時避免先閃預設值）。 */
export function waitForSettingsHydration(): Promise<void> {
  if (useSettingsStore.persist.hasHydrated()) return Promise.resolve();
  return new Promise((resolve) => {
    const unsub = useSettingsStore.persist.onFinishHydration(() => {
      unsub();
      resolve();
    });
  });
}
