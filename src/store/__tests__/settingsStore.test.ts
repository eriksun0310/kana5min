import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { SETTINGS_STORAGE_KEY, useSettingsStore, waitForSettingsHydration } from '../settingsStore';

describe('settingsStore（設定保存）', () => {
  beforeEach(() => {
    useSettingsStore.getState().resetSettings();
  });

  it('預設值', async () => {
    await waitForSettingsHydration();
    const s = useSettingsStore.getState();
    expect(s.theme).toBe('system');
    expect(s.dailyGoalMinutes).toBe(5);
    expect(s.romajiAutoHide).toBe(true);
    expect(s.reminder).toEqual({ enabled: false, time: '20:00' });
    expect(s.audioSpeed).toBe('normal');
    expect(s.onboarded).toBe(false);
    expect(s.practiceDates).toEqual([]);
    expect(s.kataIntroSeen).toBe(false);
    expect(s.punPackPurchased).toBe(false);
    expect(s.punUnlocked).toEqual([]);
    expect(s.punAdsWatched).toBe(0);
    expect(s.punPromptAfterAdsShown).toBe(false);
    expect(s.punPromptKataShown).toBe(false);
    expect(s.tourSeen).toBe(false);
    expect(s.learnTipsSeen).toEqual({ intro: false, stroke: false, trace: false });
    expect(s.reminderAsked).toBe(false);
  });

  it('好笑記憶包：解鎖不重複、看廣告計數、旗標寫進 AsyncStorage，resetSettings 清空', async () => {
    const st = useSettingsStore.getState();
    st.unlockPuns(['sa', 'shi', 'su']);
    st.unlockPuns(['su', 'se']);
    expect(useSettingsStore.getState().punUnlocked).toEqual(['sa', 'shi', 'su', 'se']);
    expect(useSettingsStore.getState().addPunAdWatched()).toBe(1);
    expect(useSettingsStore.getState().addPunAdWatched()).toBe(2);
    useSettingsStore.getState().setPunPromptAfterAdsShown(true);
    useSettingsStore.getState().setPunPromptKataShown(true);
    useSettingsStore.getState().setPunPackPurchased(true);
    const saved = JSON.parse((await AsyncStorage.getItem(SETTINGS_STORAGE_KEY)) as string).state;
    expect(saved.punUnlocked).toEqual(['sa', 'shi', 'su', 'se']);
    expect(saved.punAdsWatched).toBe(2);
    expect(saved.punPromptAfterAdsShown).toBe(true);
    expect(saved.punPromptKataShown).toBe(true);
    expect(saved.punPackPurchased).toBe(true);
    useSettingsStore.getState().resetSettings();
    const r = useSettingsStore.getState();
    expect(r.punUnlocked).toEqual([]);
    expect(r.punAdsWatched).toBe(0);
    expect(r.punPackPurchased).toBe(false);
  });

  it('舊版（version 1）資料 rehydrate 時補上好笑記憶包欄位的預設值，沿用已存的購買狀態', async () => {
    await AsyncStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({ state: { theme: 'dark', onboarded: true, punPackPurchased: true }, version: 1 }),
    );
    await useSettingsStore.persist.rehydrate();
    const s = useSettingsStore.getState();
    expect(s.theme).toBe('dark');
    expect(s.punPackPurchased).toBe(true);
    expect(s.punUnlocked).toEqual([]);
    expect(s.punAdsWatched).toBe(0);
    expect(s.punPromptAfterAdsShown).toBe(false);
    expect(s.punPromptKataShown).toBe(false);
    expect(typeof s.unlockPuns).toBe('function');
  });

  it('kataIntroSeen 設定後寫進 AsyncStorage，resetSettings 會設回 false', async () => {
    useSettingsStore.getState().setKataIntroSeen(true);
    const raw = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
    expect(JSON.parse(raw as string).state.kataIntroSeen).toBe(true);
    useSettingsStore.getState().resetSettings();
    expect(useSettingsStore.getState().kataIntroSeen).toBe(false);
  });

  it('graduateSeen 預設 false，設定後寫進 AsyncStorage，resetSettings 會設回 false', async () => {
    expect(useSettingsStore.getState().graduateSeen).toBe(false);
    useSettingsStore.getState().setGraduateSeen(true);
    const raw = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
    expect(JSON.parse(raw as string).state.graduateSeen).toBe(true);
    useSettingsStore.getState().resetSettings();
    expect(useSettingsStore.getState().graduateSeen).toBe(false);
  });

  it('修改後寫進 AsyncStorage', async () => {
    const s = useSettingsStore.getState();
    s.setDailyGoalMinutes(10);
    s.setTheme('dark');
    s.setOnboarded(true);
    s.setReminder({ enabled: true });
    s.markPracticed(new Date(2026, 9, 27, 12).getTime());
    const raw = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
    expect(raw).not.toBeNull();
    const saved = JSON.parse(raw as string).state;
    expect(saved.dailyGoalMinutes).toBe(10);
    expect(saved.theme).toBe('dark');
    expect(saved.onboarded).toBe(true);
    expect(saved.reminder).toEqual({ enabled: true, time: '20:00' });
    expect(saved.practiceDates).toEqual(['2026-10-27']);
  });

  it('rehydrate 會從 AsyncStorage 取回已存的值', async () => {
    await AsyncStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({ state: { dailyGoalMinutes: 10, onboarded: true, theme: 'light' }, version: 2 }),
    );
    await useSettingsStore.persist.rehydrate();
    const s = useSettingsStore.getState();
    expect(s.dailyGoalMinutes).toBe(10);
    expect(s.onboarded).toBe(true);
    expect(s.theme).toBe('light');
    expect(typeof s.setTheme).toBe('function'); // action 沒有被覆蓋掉
  });

  it('新手教學旗標：設定後寫進 AsyncStorage，resetTutorial 與 resetSettings 還原', async () => {
    const st = useSettingsStore.getState();
    st.setTourSeen(true);
    st.setLearnTipSeen('intro');
    st.setLearnTipSeen('trace');
    const saved = JSON.parse((await AsyncStorage.getItem(SETTINGS_STORAGE_KEY)) as string).state;
    expect(saved.tourSeen).toBe(true);
    expect(saved.learnTipsSeen).toEqual({ intro: true, stroke: false, trace: true });
    useSettingsStore.getState().resetTutorial();
    expect(useSettingsStore.getState().tourSeen).toBe(false);
    expect(useSettingsStore.getState().learnTipsSeen).toEqual({ intro: false, stroke: false, trace: false });
    useSettingsStore.getState().setLearnTipSeen('stroke');
    useSettingsStore.getState().resetSettings();
    expect(useSettingsStore.getState().learnTipsSeen.stroke).toBe(false);
  });

  it('舊版（version 2）已完成歡迎頁的資料 rehydrate 後：導覽與提示都視為看過', async () => {
    await AsyncStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({ state: { onboarded: true, dailyGoalMinutes: 10 }, version: 2 }),
    );
    await useSettingsStore.persist.rehydrate();
    const s = useSettingsStore.getState();
    expect(s.dailyGoalMinutes).toBe(10);
    expect(s.tourSeen).toBe(true);
    expect(s.learnTipsSeen).toEqual({ intro: true, stroke: true, trace: true });
  });
});
