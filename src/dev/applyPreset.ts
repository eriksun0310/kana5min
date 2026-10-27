import { useProgressStore } from '../store/progressStore';
import { presetProgress, type DebugPresetName } from './presets';

/** 把預設套用到進度（取代全部進度與易混淆紀錄）。不動設定（例如 onboarded）。 */
export async function applyDebugPreset(preset: DebugPresetName, now = Date.now()): Promise<void> {
  await useProgressStore.getState().replaceAll(presetProgress(preset, now));
}
