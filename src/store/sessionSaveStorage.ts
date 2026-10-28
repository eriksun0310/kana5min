import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  parseSavedSession,
  serializeSession,
  type SavedSession,
} from '../logic/sessionSave';

export const SESSION_SAVE_KEY = 'kana5min-session';

/** 讀回今天的存檔；沒有、壞掉或不是今天的都回傳 null（並順手清掉）。 */
export async function readSavedSession(now: number): Promise<SavedSession | null> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_SAVE_KEY);
    const saved = parseSavedSession(raw, now);
    if (!saved && raw) await AsyncStorage.removeItem(SESSION_SAVE_KEY);
    return saved;
  } catch {
    return null;
  }
}

export async function writeSavedSession(saved: SavedSession): Promise<void> {
  try {
    await AsyncStorage.setItem(SESSION_SAVE_KEY, serializeSession(saved));
  } catch {
    // 存檔失敗不影響練習
  }
}

export async function clearSavedSession(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SESSION_SAVE_KEY);
  } catch {
    // ignore
  }
}
