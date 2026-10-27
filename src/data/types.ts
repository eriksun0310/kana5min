// 資料模型，對應 spec 8.1（必要處已擴充）。

export type Script = 'hiragana' | 'katakana';
export type KanaKind = 'seion' | 'dakuon' | 'youon';

export interface Kana {
  /** 穩定 id，例如 'h-ku'（見 docs/architecture.md 第 4 節） */
  id: string;
  /** 'く' */
  char: string;
  /** 顯示用羅馬拼音（Hepburn），ぢ 顯示 ji、を 顯示 wo */
  romaji: string;
  script: Script;
  kind: KanaKind;
  /** 清音：a ka sa ta na ha ma ya ra wa；濁音：ga za da ba pa；拗音：kya sha … */
  row: string;
  strokes: number;
  /** 例字 id，對應 words.json */
  exampleWordId?: string;
  /** 容易搞混的其他 Kana id（兩兩互指） */
  confusableWith?: string[];
  /** 片假名專用：同讀音的平假名 id（例如 'k-ka' → 'h-ka'） */
  hiraganaId?: string;
  /** 片假名專用：跟對應平假名的差異或記法，一句話 */
  diffNote?: string;
}

export interface Word {
  /** 例如 'w-kao' */
  id: string;
  text: string;
  romaji: string;
  /** 中文意思 */
  meaning: string;
  script: Script;
  /** 讀外來語題答完後的補充說明，例如「「ー」是長音。」 */
  note?: string;
  /**
   * 只當作某個假名的例字（例如 ヲ、ヂ、ヅ 在外來語幾乎不出現），
   * 不是真正的外來語，不進「讀外來語」題。
   */
  exampleOnly?: boolean;
}

export interface Progress {
  kanaId: string;
  /** 熟練等級 0–5 */
  level: number;
  /** 下次複習時間（epoch ms） */
  nextReviewAt: number;
  /** 連續答對次數，用於羅馬拼音淡出 */
  correctStreak: number;
  wrongCount: number;
  /** 完成過一次學新字流程並作答的時間；未學過則為 undefined */
  learnedAt?: number;
}

export type ThemeSetting = 'system' | 'light' | 'dark';

export interface Settings {
  theme: ThemeSetting;
  dailyGoalMinutes: 3 | 5 | 10;
  /** 開 = 熟練後自動隱藏羅馬拼音；關 = 一律顯示 */
  romajiAutoHide: boolean;
  reminder: { enabled: boolean; time: string };
  audioSpeed: 'normal' | 'slow';
  /** 好笑記憶包是否已購買（付費機制不在階段 1～4 範圍，先保留欄位） */
  punPackPurchased: boolean;
}
