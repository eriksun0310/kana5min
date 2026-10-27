import type { Progress } from '../../data/types';
import type { Rng } from '../session';

/** 可重現的亂數（mulberry32） */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function prog(kanaId: string, over: Partial<Progress> = {}): Progress {
  return {
    kanaId,
    level: 1,
    nextReviewAt: 0,
    correctStreak: 0,
    wrongCount: 0,
    learnedAt: 1,
    ...over,
  };
}
