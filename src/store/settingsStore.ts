import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Settings } from '../data/types';
import { addPracticeDate } from '../logic/progressStats';

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
      markPracticed: (now) => set((s) => ({ practiceDates: addPracticeDate(s.practiceDates, now) })),
      resetSettings: () => set({ ...defaultSettings, punUnlocked: [] }),
    }),
    {
      name: SETTINGS_STORAGE_KEY,
      version: 2,
      storage: createJSONStorage(() => AsyncStorage),
      // v2 新增好笑記憶包欄位：舊資料補預設值（punPackPurchased 沿用已存的值）
      migrate: (persisted) => ({ ...defaultSettings, ...((persisted as object) ?? {}) }) as SettingsState,
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
