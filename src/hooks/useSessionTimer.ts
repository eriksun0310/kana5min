import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { AppState } from 'react-native';
import { useSessionStore } from '../store/sessionStore';

/**
 * 練習計時：畫面取得焦點且 App 在前景時計時，離開畫面或切到背景就暫停。
 * 掛在 FlowHeader 裡，所有練習流程畫面（看與聽、筆順、描寫、測驗）自動套用；
 * 沒有進行中的練習（例如特殊音測驗）時 store 會忽略。
 */
export function useSessionTimer(): void {
  useFocusEffect(
    useCallback(() => {
      const store = useSessionStore.getState;
      if (AppState.currentState === 'active') store().resumeTimer(Date.now());
      const sub = AppState.addEventListener('change', (state) => {
        if (state === 'active') store().resumeTimer(Date.now());
        else store().pauseTimer(Date.now());
      });
      return () => {
        sub.remove();
        store().pauseTimer(Date.now());
      };
    }, []),
  );
}
