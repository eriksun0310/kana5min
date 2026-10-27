// 進行中的練習狀態（每日練習與自動練習共用）。不持久化：
// 離開流程（結束、殺掉 App）時這一輪沒提交的內容就丟掉，SRS 只在一輪完整結束時寫入。
// 流程見 docs/architecture.md 第 5 節。

import { create } from 'zustand';
import type { Progress, Script } from '../data/types';
import {
  buildAutoPractice10,
  buildQuickConfuse10,
  confusionCounts,
  type ConfusionCounts,
} from '../logic/confusion';
import { confusableGroupById } from '../data/confusables';
import {
  buildResultSummary,
  type ResultSummary,
} from '../logic/progressStats';
import { mixLoanwordDrafts, pickLoanwordDrafts } from '../logic/loanword';
import {
  buildDailySession,
  buildQuiz,
  completedRows,
  learnedIdSet,
  type QuizQuestion,
  type Rng,
} from '../logic/session';
import { progressList, useProgressStore } from './progressStore';
import { useSettingsStore } from './settingsStore';

/** daily = 每日練習；auto = 自動練習；confuse = 易混淆字組快速辨識 */
export type SessionMode = 'daily' | 'auto' | 'confuse';
export type SessionPhase = 'learn' | 'quiz';

/** 每輪最多帶入的到期複習字數（其餘留到下一輪，避免一次出太多題） */
export const MAX_REVIEW_PER_ROUND = 20;

/** 學一個新字的步驟數：看與聽、筆順、描寫 */
export const STEPS_PER_NEW_KANA = 3;

export interface SessionResultData {
  mode: SessionMode;
  /** confuse 模式的字組 id（結果頁「再練一輪」用） */
  groupId: string | null;
  summary: ResultSummary;
  /** 這輪才湊滿的行（row key，依五十音順序） */
  completedRows: string[];
  /** completedRows 屬於哪種假名（一輪的新字只會來自同一種假名） */
  completedScript: Script;
  before: Progress[];
  after: Progress[];
}

export type StartDailyOutcome = 'learn' | 'quiz' | 'empty';

export interface SessionState {
  /** 每次開始新的一輪遞增，畫面用來辨認「這一輪是不是我啟動的」 */
  sid: number;
  active: boolean;
  mode: SessionMode;
  /** confuse 模式的字組 id */
  groupId: string | null;
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
  /** 讀外來語題的對錯（不屬於任何假名，只計入結果頁的答對數，不更新 SRS） */
  loanwordAnswers: boolean[];
  startedAt: number;
  result: SessionResultData | null;
  /** 提交中，避免重複提交 */
  finishing: boolean;

  /** 開始每日練習：有新字 → 'learn'；只有複習 → 直接建好題目 'quiz'；都沒有 → 'empty' */
  startDaily: (allProgress: Progress[], now: number, rng?: Rng) => StartDailyOutcome;
  /**
   * 開始自動練習（see／hear／confuse 混合 10 題）；沒有任何已學字時回傳 false。
   * counts 預設取 progressStore 目前的易混淆答錯次數。
   */
  startAuto: (allProgress: Progress[], now: number, rng?: Rng, counts?: ConfusionCounts) => boolean;
  /**
   * 開始易混淆字組快速辨識 10 題；字組不存在或資料不足時回傳 false。
   * 已學的字照常更新 SRS；未學的字只記答錯次數，不寫 SRS。
   */
  startConfuse: (groupId: string, allProgress: Progress[], now: number, rng?: Rng) => boolean;
  /** 目前新字的學習步驟都完成了：有下一個新字回 'next'，否則建立題目進入測驗回 'quiz' */
  advanceNew: (rng?: Rng) => 'next' | 'quiz';
  /** 記錄一題的對錯；答錯時同時把所屬易混淆字組的答錯次數即時寫入 */
  recordAnswer: (kanaId: string, correct: boolean) => void;
  /** 記錄一題讀外來語的對錯：不更新任何假名的 SRS 與易混淆紀錄 */
  recordLoanwordAnswer: (correct: boolean) => void;
  /** 前進到下一題；已經是最後一題時回傳 false（不動） */
  nextQuestion: () => boolean;
  /** 一輪結束：依 SRS 提交進度、記錄今天為練習日、組出結果頁資料 */
  finish: (now: number) => Promise<SessionResultData>;
  clear: () => void;
}

/**
 * 片假名階段的每日練習：有可讀外來語時加 1～2 題讀外來語（插在隨機位置）。
 * 還沒學任何片假名（平假名階段）時沒有可讀詞，原樣回傳，也不消耗 rng。
 */
function withLoanwords(
  questions: QuizQuestion[],
  learnedIds: readonly string[],
  preferKanaIds: readonly string[],
  rng: Rng,
): QuizQuestion[] {
  const drafts = pickLoanwordDrafts(learnedIds, rng, preferKanaIds);
  return drafts.length === 0 ? questions : mixLoanwordDrafts(questions, drafts, rng);
}

const empty = {
  active: false,
  mode: 'daily' as SessionMode,
  groupId: null as string | null,
  phase: 'learn' as SessionPhase,
  newKanaIds: [] as string[],
  reviewKanaIds: [] as string[],
  learnedIds: [] as string[],
  newIndex: 0,
  questions: [] as QuizQuestion[],
  qIndex: 0,
  answers: {} as Record<string, boolean[]>,
  loanwordAnswers: [] as boolean[],
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
      : withLoanwords(
          buildQuiz({ newKanaIds: [], reviewKanaIds, learnedIds: daily.learnedIds }, rng),
          daily.learnedIds,
          [],
          rng,
        );
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

  startAuto(allProgress, now, rng = Math.random, counts) {
    const usedCounts = counts ?? confusionCounts(useProgressStore.getState().confusions);
    const questions = buildAutoPractice10(allProgress, usedCounts, rng);
    if (!questions || questions.length === 0) return false;
    set((s) => ({
      ...empty,
      sid: s.sid + 1,
      active: true,
      mode: 'auto',
      phase: 'quiz',
      // newKanaIds 在自動練習中不代表新字，不放進狀態；讀外來語題沒有對應假名，不列入
      reviewKanaIds: [...new Set(questions.filter((q) => q.kanaId !== '').map((q) => q.kanaId))],
      learnedIds: [...learnedIdSet(allProgress)],
      questions,
      startedAt: now,
    }));
    return true;
  },

  startConfuse(groupId, allProgress, now, rng = Math.random) {
    const group = confusableGroupById(groupId);
    if (!group) return false;
    const questions = buildQuickConfuse10(group, rng);
    if (questions.length === 0) return false;
    const learnedIds = [...learnedIdSet(allProgress)];
    const learned = new Set(learnedIds);
    set((s) => ({
      ...empty,
      sid: s.sid + 1,
      active: true,
      mode: 'confuse',
      groupId: group.id,
      phase: 'quiz',
      reviewKanaIds: [...new Set(questions.map((q) => q.kanaId))].filter((id) => learned.has(id)),
      learnedIds,
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
    const questions = withLoanwords(
      buildQuiz(
        { newKanaIds: s.newKanaIds, reviewKanaIds: s.reviewKanaIds, learnedIds: s.learnedIds },
        rng,
      ),
      // 新字已經在學習流程裡學過，測驗時就算已學：含今天新字的外來語也可以出題
      [...s.learnedIds, ...s.newKanaIds],
      s.newKanaIds,
      rng,
    );
    set({ phase: 'quiz', questions, qIndex: 0 });
    return 'quiz';
  },

  recordAnswer(kanaId, correct) {
    set((s) => ({ answers: { ...s.answers, [kanaId]: [...(s.answers[kanaId] ?? []), correct] } }));
    if (!correct) {
      // 作答當下就寫入易混淆字組的答錯次數，不等一輪結束；寫入失敗不影響作答流程
      useProgressStore
        .getState()
        .recordWrongAnswer(kanaId, Date.now())
        .catch(() => {});
    }
  },

  recordLoanwordAnswer(correct) {
    set((s) => ({ loanwordAnswers: [...s.loanwordAnswers, correct] }));
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
      // SRS 只更新已學的字與這輪的新字；快速辨識裡還沒學的字只記答錯次數（已在作答當下寫入）
      const eligible = new Set([...s.learnedIds, ...s.newKanaIds]);
      const srsAnswers = Object.fromEntries(
        Object.entries(s.answers).filter(([kanaId]) => eligible.has(kanaId)),
      );
      const { before, after } = await useProgressStore.getState().commitRound(srsAnswers, now);
      useSettingsStore.getState().markPracticed(now);
      const summary = buildResultSummary({
        answers: s.answers,
        before,
        after,
        startedAt: s.startedAt,
        finishedAt: now,
        extraAnswers: s.loanwordAnswers,
      });
      const hiraganaRows = completedRows(before, after, 'hiragana');
      const rowsScript: Script = hiraganaRows.length > 0 ? 'hiragana' : 'katakana';
      const result: SessionResultData = {
        mode: s.mode,
        groupId: s.groupId,
        summary,
        completedRows: hiraganaRows.length > 0 ? hiraganaRows : completedRows(before, after, 'katakana'),
        completedScript: rowsScript,
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
