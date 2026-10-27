import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useSessionStore, STEPS_PER_NEW_KANA } from '../store/sessionStore';

export interface LearnSnapshot {
  /** 單獨查看模式（詳情頁進來）：不動 session，返回用 router.back() */
  standalone: boolean;
  /** 目前要學的字；沒有時為 undefined（呼叫端回首頁） */
  kanaId: string | undefined;
  /** 這是第幾個新字（0 起算）與新字總數 */
  index: number;
  total: number;
  /** 進行中的練習是否存在（非 standalone 時必須為 true） */
  active: boolean;
  /** 學習流程的進度條：step 為 1（看與聽）、2（筆順）、3（描寫）；分母是全部新字的步驟數 */
  progressAt: (step: 1 | 2 | 3) => number;
}

/**
 * 學習畫面讀取「這個畫面對應哪一個字」。
 * 掛載時就把 session 的目前新字固定下來：步驟完成後 store 會先前進到下一個字，
 * 但這個畫面在轉場期間不該跟著變。
 */
export function useLearnSnapshot(): LearnSnapshot {
  const params = useLocalSearchParams<{ id?: string; standalone?: string }>();
  const [snap] = useState(() => {
    const s = useSessionStore.getState();
    return {
      active: s.active,
      index: s.newIndex,
      total: s.newKanaIds.length,
      kanaId: s.newKanaIds[s.newIndex] as string | undefined,
    };
  });
  const standalone = params.standalone === '1' && !!params.id;
  return {
    standalone,
    kanaId: standalone ? params.id : snap.kanaId,
    index: snap.index,
    total: snap.total,
    active: snap.active,
    progressAt: (step) =>
      snap.total > 0 ? (snap.index * STEPS_PER_NEW_KANA + step) / (snap.total * STEPS_PER_NEW_KANA) : 0,
  };
}
