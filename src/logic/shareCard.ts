// 諧音梗分享卡（spec 6.4／F5）的資料組裝：不含原生擷取，方便單元測試。
// 配色一律取自主題 token（亮／暗跟著 App 目前主題）。

import { byId, punFor } from '../data';
import { themes, type ThemeName, type ThemeTokens } from '../theme/tokens';

export const SHARE_APP_NAME = '諧音五十音';

export interface PunSegment {
  text: string;
  /** 梗用到的那個假名（用強調色標出） */
  highlight: boolean;
}

export interface ShareCardData {
  kanaId: string;
  char: string;
  romaji: string;
  /** 諧音句切成「一般文字／強調假名」的片段，串起來等於原句 */
  segments: PunSegment[];
  appName: string;
  colors: Pick<ThemeTokens, 'bg' | 'text' | 'muted' | 'accent'>;
}

/** 把句子依第一個 char 切成片段；找不到時整句當一般文字。 */
export function splitPun(pun: string, char: string): PunSegment[] {
  const i = pun.indexOf(char);
  if (i < 0) return [{ text: pun, highlight: false }];
  const out: PunSegment[] = [];
  if (i > 0) out.push({ text: pun.slice(0, i), highlight: false });
  out.push({ text: char, highlight: true });
  const rest = pun.slice(i + char.length);
  if (rest) out.push({ text: rest, highlight: false });
  return out;
}

/** 組出分享卡資料；沒有這個字或沒有諧音句（け、つ、ひ、へ、濁音、拗音）回傳 undefined。 */
export function buildShareCard(kanaId: string, theme: ThemeName): ShareCardData | undefined {
  const kana = byId(kanaId);
  const pun = punFor(kanaId);
  if (!kana || !pun) return undefined;
  const { bg, text, muted, accent } = themes[theme];
  return {
    kanaId,
    char: kana.char,
    romaji: kana.romaji,
    segments: splitPun(pun, kana.char),
    appName: SHARE_APP_NAME,
    colors: { bg, text, muted, accent },
  };
}
