import { useProgressStore } from '../store/progressStore';
import { useSettingsStore } from '../store/settingsStore';
import { presetKataIntroSeen, presetProgress, type DebugPresetName } from './presets';

/**
 * 把預設套用到進度（取代全部進度與易混淆紀錄），並設定 kataIntroSeen。
 * 不動其他設定（例如 onboarded）。
 */
export async function applyDebugPreset(preset: DebugPresetName, now = Date.now()): Promise<void> {
  await useProgressStore.getState().replaceAll(presetProgress(preset, now));
  useSettingsStore.getState().setKataIntroSeen(presetKataIntroSeen(preset));
}
