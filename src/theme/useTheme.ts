import { useColorScheme } from 'react-native';
import { useSettingsStore } from '../store/settingsStore';
import { resolveTheme } from './resolve';
import { themes, type ThemeName, type ThemeTokens } from './tokens';

/** 目前實際使用的主題名稱（設定為 system 時跟隨系統）。 */
export function useThemeName(): ThemeName {
  const setting = useSettingsStore((s) => s.theme);
  const system = useColorScheme();
  return resolveTheme(setting, system);
}

/** 取得目前主題的顏色 token。元件一律用這個取色，不要寫死色碼。 */
export function useTheme(): ThemeTokens {
  return themes[useThemeName()];
}
