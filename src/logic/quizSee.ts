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
