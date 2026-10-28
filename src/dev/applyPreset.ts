import { useProgressStore } from '../store/progressStore';
import { useSettingsStore } from '../store/settingsStore';
import {
  isDebugPunPreset,
  makeAllDue,
  presetGraduateSeen,
  presetKataIntroSeen,
  presetProgress,
  punPresetSettings,
  type AnyDebugPreset,
} from './presets';

/**
 * 把預設套用到進度（取代全部進度與易混淆紀錄），並設定 kataIntroSeen 與 graduateSeen。
 * options.due：全部進度改成已到期。不動其他設定（例如 onboarded）。pun-reset／pun-purchased 只改好笑記憶包設定。
 */
export async function applyDebugPreset(
  preset: AnyDebugPreset,
  now = Date.now(),
  options: { due?: boolean } = {},
): Promise<void> {
  // 好笑記憶包預設只改設定，不動進度
  if (isDebugPunPreset(preset)) {
    useSettingsStore.setState(punPresetSettings(preset));
    return;
  }
  const items = presetProgress(preset, now);
  const settings = useSettingsStore.getState();
  // 旗標先設再換進度：首頁一看到進度變了就會檢查是否要推出片假名開始／畢業畫面
  settings.setKataIntroSeen(presetKataIntroSeen(preset));
  // due=1 是測試複習用：不要再推出畢業畫面
  settings.setGraduateSeen(options.due ? true : presetGraduateSeen(preset));
  await useProgressStore.getState().replaceAll(options.due ? makeAllDue(items, now) : items);
}
