import { useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Screen } from '../../src/components';
import { currentProgressList, useSessionStore } from '../../src/store/sessionStore';

/**
 * 每日練習入口：依目前進度建立今天的 session，再導到第一個畫面。
 * - 有新字 → 看與聽（/learn/intro）
 * - 只有到期複習 → 直接進測驗
 * - 兩者都沒有 → 自動練習
 * 用 replace 導走，返回時不會回到這個空畫面。
 */
export default function LearnEntry() {
  const router = useRouter();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const outcome = useSessionStore.getState().startDaily(currentProgressList(), Date.now());
    if (outcome === 'learn') router.replace('/learn/intro');
    else if (outcome === 'quiz') router.replace('/quiz');
    else router.replace({ pathname: '/quiz', params: { mode: 'auto' } });
  }, [router]);

  return <Screen />;
}
