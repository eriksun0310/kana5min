// 自動練習（練習分頁／再練一輪）的出題：從已學的字隨機出一輪題。
// 只組出 DailySession 交給 session.buildQuiz，不改既有出題規則。

import type { Progress } from '../data/types';
import type { DailySession, Rng } from './session';
import { learnedIdSet } from './session';

/** 一輪自動練習的題數 */
export const AUTO_QUIZ_SIZE = 10;

function shuffled<T>(items: readonly T[], rng: Rng): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * 從已學的字挑出一輪題目：
 * - 已學字 >= count：隨機挑 count 個字，各 1 題（題型由 buildQuiz 隨機）
 * - 已學字不足：先讓部分字各出看字選音＋聽音選字 2 題，湊到 count 題（最多 2×已學字數）
 * 沒有任何已學字時回傳 null。
 * 注意：回傳值裡的 newKanaIds 只是借用 buildQuiz「每字 2 題」的機制，不代表要學新字。
 */
export function buildAutoSession(
  allProgress: Progress[],
  rng: Rng = Math.random,
  count: number = AUTO_QUIZ_SIZE,
): DailySession | null {
  const learned = [...learnedIdSet(allProgress)];
  if (learned.length === 0) return null;
  const order = shuffled(learned, rng);
  if (order.length >= count) {
    return { newKanaIds: [], reviewKanaIds: order.slice(0, count), learnedIds: learned };
  }
  const doubled = Math.min(order.length, count - order.length);
  return {
    newKanaIds: order.slice(0, doubled),
    reviewKanaIds: order.slice(doubled),
    learnedIds: learned,
  };
}
