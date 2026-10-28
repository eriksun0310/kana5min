import { useProgressStore } from '../store/progressStore';
import { useSettingsStore } from '../store/settingsStore';
import {
  isDebugPunPreset,
  presetGraduateSeen,
  presetKataIntroSeen,
  presetProgress,
  punPresetSettings,
  type AnyDebugPreset,
} from './presets';

/**
 * 把預設套用到進度（取代全部進度與易混淆紀錄），並設定 kataIntroSeen 與 graduateSeen。
 * 不動其他設定（例如 onboarded）。pun-reset／pun-purchased 只改好笑記憶包設定。
 */
export async function applyDebugPreset(preset: AnyDebugPreset, now = Date.now()): Promise<void> {
  // 好笑記憶包預設只改設定，不動進度
  if (isDebugPunPreset(preset)) {
    useSettingsStore.setState(punPresetSettings(preset));
    return;
  }
  await useProgressStore.getState().replaceAll(presetProgress(preset, now));
  const settings = useSettingsStore.getState();
  settings.setKataIntroSeen(presetKataIntroSeen(preset));
  settings.setGraduateSeen(presetGraduateSeen(preset));
}
