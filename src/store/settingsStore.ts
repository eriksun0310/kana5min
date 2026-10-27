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

  setTheme: (theme: Settings['theme']) => void;
  setDailyGoalMinutes: (m: Settings['dailyGoalMinutes']) => void;
  setRomajiAutoHide: (on: boolean) => void;
  setReminder: (reminder: Partial<Settings['reminder']>) => void;
  setAudioSpeed: (speed: Settings['audioSpeed']) => void;
  setOnboarded: (done: boolean) => void;
  setGraduateSeen: (seen: boolean) => void;
  setKataIntroSeen: (seen: boolean) => void;
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
};

export const SETTINGS_STORAGE_KEY = 'kana5min-settings';

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaultSettings,
      setTheme: (theme) => set({ theme }),
      setDailyGoalMinutes: (dailyGoalMinutes) => set({ dailyGoalMinutes }),
      setRomajiAutoHide: (romajiAutoHide) => set({ romajiAutoHide }),
      setReminder: (reminder) => set((s) => ({ reminder: { ...s.reminder, ...reminder } })),
      setAudioSpeed: (audioSpeed) => set({ audioSpeed }),
      setOnboarded: (onboarded) => set({ onboarded }),
      setGraduateSeen: (graduateSeen) => set({ graduateSeen }),
      setKataIntroSeen: (kataIntroSeen) => set({ kataIntroSeen }),
      markPracticed: (now) => set((s) => ({ practiceDates: addPracticeDate(s.practiceDates, now) })),
      resetSettings: () => set({ ...defaultSettings }),
    }),
    {
      name: SETTINGS_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
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
