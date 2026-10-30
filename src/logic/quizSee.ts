// 看字選音（C2-08）的點選邏輯：點選項＝播放該聲音並暫選（可以一直重播同一個）；
// 只有按底部「選這個」才確定作答，避免想重聽卻不小心把答案送出。

export interface SeePressState {
  /** 目前暫選的選項（0–3），還沒點過為 null */
  selected: number | null;
  /** 聽過的選項（依第一次聽的順序） */
  heard: number[];
}

export interface SeePressResult extends SeePressState {
  /** 這次點擊要不要播放聲音（永遠是 true，包含重點同一個選項）；已作答時為 false */
  play: boolean;
}

export function pressSeeOption(state: SeePressState, index: number, answered: boolean): SeePressResult {
  if (answered) return { ...state, play: false };
  return {
    selected: index,
    heard: state.heard.includes(index) ? state.heard : [...state.heard, index],
    play: true,
  };
}

export type RevealKind = 'answer' | 'wrong' | 'plain';

export interface RevealTag {
  /** 假名（用 Klee One 顯示）；整段標記文字 = kana + text */
  kana: string;
  /** 假名之後的文字：" (u)"、" (sa)"、拼音淡出時為 "" */
  text: string;
}

/**
 * 作答後選項右側的標記：假名永遠顯示，拼音依 showRomaji 決定，格式「う (u)」。
 * 正確答案用綠色框標示（不另外寫「正確」，無障礙標籤會唸）；拼音淡出時「う」、選錯「さ (sa)」（一律顯示拼音）、其他「あ (a)」。
 */
export function revealTag(kind: RevealKind, kana: string, romaji: string, showRomaji: boolean): RevealTag {
  if (kind === 'answer') return { kana, text: showRomaji ? ` (${romaji})` : '' };
  if (kind === 'wrong') return { kana, text: ` (${romaji})` };
  return { kana, text: showRomaji ? ` (${romaji})` : '' };
}
