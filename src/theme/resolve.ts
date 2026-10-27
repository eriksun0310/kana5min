import type { ThemeName } from './tokens';

import type { ThemeSetting } from '../data/types';

/** 依設定值與系統主題決定實際使用的主題；系統回報 null 時視為亮色。 */
export function resolveTheme(
  setting: ThemeSetting,
  systemScheme: 'light' | 'dark' | null | undefined,
): ThemeName {
  if (setting === 'light' || setting === 'dark') return setting;
  return systemScheme === 'dark' ? 'dark' : 'light';
}
