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
      JSON.stringify({ state: { dailyGoalMinutes: 10, onboarded: true, theme: 'light' }, version: 1 }),
    );
    await useSettingsStore.persist.rehydrate();
    const s = useSettingsStore.getState();
    expect(s.dailyGoalMinutes).toBe(10);
    expect(s.onboarded).toBe(true);
    expect(s.theme).toBe('light');
    expect(typeof s.setTheme).toBe('function'); // action 沒有被覆蓋掉
  });
});
