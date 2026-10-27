// 進行中的練習狀態（每日練習與自動練習共用）。不持久化：
// 離開流程（結束、殺掉 App）時這一輪沒提交的內容就丟掉，SRS 只在一輪完整結束時寫入。
// 流程見 docs/architecture.md 第 5 節。

import { create } from 'zustand';
import type { Progress } from '../data/types';
import { buildAutoSession } from '../logic/autoQuiz';
import {
  buildResultSummary,
  type ResultSummary,
} from '../logic/progressStats';
import {
  buildDailySession,
  buildQuiz,
  completedRows,
  type QuizQuestion,
  type Rng,
} from '../logic/session';
import { progressList, useProgressStore } from './progressStore';
import { useSettingsStore } from './settingsStore';

export type SessionMode = 'daily' | 'auto';
export type SessionPhase = 'learn' | 'quiz';

/** 每輪最多帶入的到期複習字數（其餘留到下一輪，避免一次出太多題） */
export const MAX_REVIEW_PER_ROUND = 20;

/** 學一個新字的步驟數：看與聽、筆順、描寫 */
export const STEPS_PER_NEW_KANA = 3;

export interface SessionResultData {
  mode: SessionMode;
  summary: ResultSummary;
  /** 這輪才湊滿的行（row key，依五十音順序） */
  completedRows: string[];
  before: Progress[];
  after: Progress[];
}

export type StartDailyOutcome = 'learn' | 'quiz' | 'empty';

export interface SessionState {
  /** 每次開始新的一輪遞增，畫面用來辨認「這一輪是不是我啟動的」 */
  sid: number;
  active: boolean;
  mode: SessionMode;
  phase: SessionPhase;
  newKanaIds: string[];
  reviewKanaIds: string[];
  /** 已學過的字（出題取干擾項用；不含今天的新字） */
  learnedIds: string[];
  newIndex: number;
  questions: QuizQuestion[];
  qIndex: number;
  /** kanaId → 這輪每一題的對錯 */
  answers: Record<string, boolean[]>;
  startedAt: number;
  result: SessionResultData | null;
  /** 提交中，避免重複提交 */
  finishing: boolean;

  /** 開始每日練習：有新字 → 'learn'；只有複習 → 直接建好題目 'quiz'；都沒有 → 'empty' */
  startDaily: (allProgress: Progress[], now: number, rng?: Rng) => StartDailyOutcome;
  /** 開始自動練習；沒有任何已學字時回傳 false */
  startAuto: (allProgress: Progress[], now: number, rng?: Rng) => boolean;
  /** 目前新字的學習步驟都完成了：有下一個新字回 'next'，否則建立題目進入測驗回 'quiz' */
  advanceNew: (rng?: Rng) => 'next' | 'quiz';
  recordAnswer: (kanaId: string, correct: boolean) => void;
  /** 前進到下一題；已經是最後一題時回傳 false（不動） */
  nextQuestion: () => boolean;
  /** 一輪結束：依 SRS 提交進度、記錄今天為練習日、組出結果頁資料 */
  finish: (now: number) => Promise<SessionResultData>;
  clear: () => void;
}

const empty = {
  active: false,
  mode: 'daily' as SessionMode,
  phase: 'learn' as SessionPhase,
  newKanaIds: [] as string[],
  reviewKanaIds: [] as string[],
  learnedIds: [] as string[],
  newIndex: 0,
  questions: [] as QuizQuestion[],
  qIndex: 0,
  answers: {} as Record<string, boolean[]>,
  startedAt: 0,
  result: null as SessionResultData | null,
  finishing: false,
};

export const useSessionStore = create<SessionState>()((set, get) => ({
  sid: 0,
  ...empty,

  startDaily(allProgress, now, rng = Math.random) {
    const daily = buildDailySession(allProgress, now);
    const reviewKanaIds = daily.reviewKanaIds.slice(0, MAX_REVIEW_PER_ROUND);
    if (daily.newKanaIds.length === 0 && reviewKanaIds.length === 0) return 'empty';
    const hasNew = daily.newKanaIds.length > 0;
    const questions = hasNew
      ? []
      : buildQuiz({ newKanaIds: [], reviewKanaIds, learnedIds: daily.learnedIds }, rng);
    set((s) => ({
      ...empty,
      sid: s.sid + 1,
      active: true,
      mode: 'daily',
      phase: hasNew ? 'learn' : 'quiz',
      newKanaIds: daily.newKanaIds,
      reviewKanaIds,
      learnedIds: daily.learnedIds,
      questions,
      startedAt: now,
    }));
    return hasNew ? 'learn' : 'quiz';
  },

  startAuto(allProgress, now, rng = Math.random) {
    const auto = buildAutoSession(allProgress, rng);
    if (!auto) return false;
    const questions = buildQuiz(auto, rng);
    set((s) => ({
      ...empty,
      sid: s.sid + 1,
      active: true,
      mode: 'auto',
      phase: 'quiz',
      // newKanaIds 在自動練習中不代表新字，不放進狀態
      reviewKanaIds: [...new Set(questions.map((q) => q.kanaId))],
      learnedIds: auto.learnedIds,
      questions,
      startedAt: now,
    }));
    return true;
  },

  advanceNew(rng = Math.random) {
    const s = get();
    if (s.newIndex + 1 < s.newKanaIds.length) {
      set({ newIndex: s.newIndex + 1 });
      return 'next';
    }
    const questions = buildQuiz(
      { newKanaIds: s.newKanaIds, reviewKanaIds: s.reviewKanaIds, learnedIds: s.learnedIds },
      rng,
    );
    set({ phase: 'quiz', questions, qIndex: 0 });
    return 'quiz';
  },

  recordAnswer(kanaId, correct) {
    set((s) => ({ answers: { ...s.answers, [kanaId]: [...(s.answers[kanaId] ?? []), correct] } }));
  },

  nextQuestion() {
    const s = get();
    if (s.qIndex + 1 >= s.questions.length) return false;
    set({ qIndex: s.qIndex + 1 });
    return true;
  },

  async finish(now) {
    const s = get();
    if (s.result) return s.result;
    if (s.finishing) {
      // 已在提交中：等結果出來（正常操作下按鈕只會按一次，這裡只是保險）
      return new Promise((resolve) => {
        const unsub = useSessionStore.subscribe((next) => {
          if (next.result) {
            unsub();
            resolve(next.result);
          }
        });
      });
    }
    set({ finishing: true });
    try {
      const { before, after } = await useProgressStore.getState().commitRound(s.answers, now);
      useSettingsStore.getState().markPracticed(now);
      const summary = buildResultSummary({
        answers: s.answers,
        before,
        after,
        startedAt: s.startedAt,
        finishedAt: now,
      });
      const result: SessionResultData = {
        mode: s.mode,
        summary,
        completedRows: completedRows(before, after),
        before,
        after,
      };
      set({ result, finishing: false });
      return result;
    } catch (e) {
      set({ finishing: false });
      throw e;
    }
  },

  clear() {
    set({ ...empty });
  },
}));

/** 目前進度的陣列（方便畫面從 progressStore 取用）。 */
export function currentProgressList(): Progress[] {
  return progressList(useProgressStore.getState().progress);
}
