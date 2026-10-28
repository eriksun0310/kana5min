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

/**
 * 接續今天存起來的那一輪（首頁「繼續今天的練習」）：回到離開時的畫面；
 * 新字階段從該新字的「看與聽」重新開始，測驗回到離開時的那一題。
 * 題目都答完、只差提交時直接提交並顯示結果頁。沒有可接續的存檔時改開新的一輪。
 */
export async function resumeSavedAndGo(router: Router, mode: 'push' | 'replace'): Promise<void> {
  const store = useSessionStore.getState();
  const target = store.resumeSaved(Date.now());
  const go = router[mode];
  if (target === 'learn') go('/learn/intro');
  else if (target === 'quiz') go('/quiz');
  else if (target === 'finish') {
    await store.finish(Date.now());
    go('/result');
  } else startDailyAndGo(router, mode);
}
