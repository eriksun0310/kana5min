// 主題顏色 token（spec 第 7 節 + docs/architecture.md 第 3 節）。
// 色碼只允許出現在這個資料夾；元件一律透過 useTheme() 取用。
// 配色對齊同團隊的壽司日檢（jlpt5minapp constants/tokens.ts）：主色為壽司紅，
// 底色為暖米白／暖黑；muted、track、guide 為推導值，確保對比與可見度。

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
  /** 主色（暗色下提亮） */
  accent: string;
  /** 主色按鈕上的文字（亮色白字、暗色深字，對比皆 ≥ 4.5） */
  onAccent: string;
  /** 設定頁開關的圓鈕 */
  knob: string;
}

export const dark: ThemeTokens = {
  bg: '#1C1B18',
  surface: '#28261F',
  line: '#3A382F',
  text: '#F0EEE6',
  muted: '#9A978A',
  track: '#3A382F',
  chip: '#2F2D25',
  accentText: '#E8734F',
  accentSoft: '#3A2A22',
  correct: '#6BBF7D',
  wrong: '#E8734F',
  next: '#5F5C4E',
  faint: '#322F27',
  guide: '#3A382F',
  correctSoft: '#233B28',
  correctText: '#8FD99F',
  wrongSoft: '#3D281F',
  wrongText: '#F0A487',
  accent: '#E8734F',
  onAccent: '#1C1B18',
  knob: '#FFFFFF',
};

export const light: ThemeTokens = {
  bg: '#FAFAF7',
  surface: '#FFFFFF',
  line: '#D6D6D2',
  text: '#1A1A1A',
  muted: '#6A6964',
  track: '#E4E4E0',
  chip: '#F1F1ED',
  accentText: '#A83A28',
  accentSoft: '#FDF0EC',
  correct: '#4A9A5A',
  wrong: '#C44830',
  next: '#A8A8A4',
  faint: '#ECECEA',
  guide: '#E4E4E0',
  correctSoft: '#E8F4E2',
  correctText: '#3F7A4A',
  wrongSoft: '#FCE5DE',
  wrongText: '#A83A28',
  accent: '#C44830',
  onAccent: '#FFFFFF',
  knob: '#FFFFFF',
};

export type ThemeName = 'dark' | 'light';
export const themes: Record<ThemeName, ThemeTokens> = { dark, light };
