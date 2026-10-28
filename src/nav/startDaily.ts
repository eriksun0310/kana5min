import type { useRouter } from 'expo-router';
import { currentProgressList, useSessionStore } from '../store/sessionStore';

type Router = ReturnType<typeof useRouter>;

/**
 * 建立今天的 session 並直接導到第一個畫面（有新字 → 看與聽；只有複習 → 測驗；都沒有 → 自動練習）。
 * 先建立再導覽，不經過空白的 /learn 入口畫面，避免按下後先閃一下白畫面。
 */
export function startDailyAndGo(router: Router, mode: 'push' | 'replace'): void {
  const outcome = useSessionStore.getState().startDaily(currentProgressList(), Date.now());
  const go = router[mode];
  if (outcome === 'learn') go('/learn/intro');
  else if (outcome === 'quiz') go('/quiz');
  else go({ pathname: '/quiz', params: { mode: 'auto' } });
}
