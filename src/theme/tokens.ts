// 主題顏色 token（spec 第 7 節 + docs/architecture.md 第 3 節）。
// 色碼只允許出現在這個資料夾；元件一律透過 useTheme() 取用。

export interface ThemeTokens {
  /** 背景 */
  bg: string;
  /** 卡片、按鈕底色 */
  surface: string;
  /** 邊框、分隔線 */
  line: string;
  /** 主要文字 */
  text: string;
  /** 次要文字 */
  muted: string;
  /** 進度條底色、停用按鈕 */
  track: string;
  /** 標籤、小元件底色 */
  chip: string;
  /** 主色文字（亮色下加深以維持對比） */
  accentText: string;
  /** 主色淡底 */
  accentSoft: string;
  /** 答對邊框 */
  correct: string;
  /** 答錯邊框 */
  wrong: string;
  /** 首頁進度條的下一格 */
  next: string;
  /** 描寫的淡色字 */
  faint: string;
  /** 田字格虛線 */
  guide: string;
  /** 答對底色 */
  correctSoft: string;
  /** 答對文字 */
  correctText: string;
  /** 答錯底色 */
  wrongSoft: string;
  /** 答錯文字 */
  wrongText: string;
  /** 主色（兩主題相同） */
  accent: string;
  /** 主色按鈕上的文字（兩主題相同） */
  onAccent: string;
  /** 設定頁開關的圓鈕 */
  knob: string;
}

export const dark: ThemeTokens = {
  bg: '#15171B',
  surface: '#1F2228',
  line: '#2C3038',
  text: '#F1EFEA',
  muted: '#A9A59D',
  track: '#2C3038',
  chip: '#262A31',
  accentText: '#F2B54A',
  accentSoft: '#3A3020',
  correct: '#7FC8A9',
  wrong: '#F28C7A',
  next: '#6B6760',
  faint: '#2A2E35',
  guide: '#2C3038',
  correctSoft: '#1D2E28',
  correctText: '#9FDCC2',
  wrongSoft: '#33221F',
  wrongText: '#F7B0A4',
  accent: '#F2B54A',
  onAccent: '#15171B',
  knob: '#FFFFFF',
};

export const light: ThemeTokens = {
  bg: '#F7F5F1',
  surface: '#FFFFFF',
  line: '#E7E3DC',
  text: '#1C1E22',
  muted: '#5F5B54',
  track: '#E5E1DA',
  chip: '#F0EDE7',
  accentText: '#8A5F0E',
  accentSoft: '#FBEFD6',
  correct: '#2F8A63',
  wrong: '#D9644F',
  next: '#A7A198',
  faint: '#ECE8E1',
  guide: '#E2DDD5',
  correctSoft: '#E5F3EC',
  correctText: '#1F6B49',
  wrongSoft: '#FBE9E5',
  wrongText: '#A23A28',
  accent: '#F2B54A',
  onAccent: '#15171B',
  knob: '#FFFFFF',
};

export type ThemeName = 'dark' | 'light';
export const themes: Record<ThemeName, ThemeTokens> = { dark, light };
