// 進行中的練習狀態（每日練習、自動練習、易混淆快速辨識共用）。
// SRS 只在一輪結束（完整或「結束這一輪」的部分提交）時寫入；
// 中途離開時把這一輪做到哪存進 AsyncStorage（與 SRS 的 sqlite 分開），之後可從首頁繼續。
// 流程見 docs/architecture.md 第 5、13 節。

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
import {
  elapsedMs,
  extendTimer,
  isTimeUp,
  limitMsFor,
  pauseTimer,
  resumeTimer,
  type TimerState,
} from '../logic/practiceTimer';
import {
  hasSessionProgress,
  newQuestionsFirst,
  SESSION_SAVE_VERSION,
  type SavedSession,
} from '../logic/sessionSave';
import { toDateKey } from '../logic/progressStats';
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
import { clearSavedSession, readSavedSession, writeSavedSession } from './sessionSaveStorage';
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

/** 答完一題後前進的結果：next = 已換下一題；timeup = 時間到（沒有前進，要詢問）；done = 已是最後一題 */
export type AdvanceOutcome = 'next' | 'timeup' | 'done';

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
  /** 目前這一題已作答、還沒按下一題（存檔時要把位置往後算一題，接續才不會重答） */
  qAnswered: boolean;
  /** 計時：已累積的練習時間、目前這一段的開始時間、上限（0 = 不限時，只有每日練習限時） */
  usedMs: number;
  runningSince: number | null;
  limitMs: number;
  result: SessionResultData | null;
  /** 提交中，避免重複提交 */
  finishing: boolean;
  /** 可接續的存檔（今天的）；沒有為 null。不隨 clear() 清掉 */
  saved: SavedSession | null;
  /** 目前存檔屬於哪一輪（sid）；一輪結束只清自己寫的存檔 */
  savedOwner: number | null;

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
  /** 啟動時讀回存檔（隔天的存檔作廢） */
  loadSaved: (now: number) => Promise<void>;
  /** 存檔若已不是今天的就丟掉（App 開著過了午夜） */
  refreshSaved: (now: number) => void;
  /** 丟掉存檔（「從頭開始」） */
  discardSaved: () => void;
  /**
   * 接續存檔的那一輪：回傳要去的畫面。'learn' 從該新字的「看與聽」重新開始；'quiz' 回到離開時的那一題；
   * 'finish' 表示題目都答完了、只差提交；沒有存檔回 null。
   */
  resumeSaved: (now: number) => 'learn' | 'quiz' | 'finish' | null;
  /** 畫面取得焦點／回到前景時繼續計時 */
  resumeTimer: (now: number) => void;
  /** 畫面失去焦點／切到背景時暫停計時（同時更新存檔的已用時間） */
  pauseTimer: (now: number) => void;
  /** 離開流程（✕ → 先離開）：暫停、存檔（有進度才存）、清掉這一輪的狀態 */
  leave: (now: number) => void;
  /** 答完一題後前進：每日練習時間到時回 'timeup'（會先把後面的新字題排到前面，新字測驗完才詢問） */
  advanceQuiz: (now: number) => AdvanceOutcome;
  /** 剛進入測驗畫面（含接續）時檢查：時間到而且沒有新字題待答 → true，要詢問 */
  timeUpDue: (now: number) => boolean;
  /** 「再練 5 分鐘」：延長上限，並前進到下一題（若目前這題已答完） */
  extendTime: (now: number) => void;
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
  qAnswered: false,
  usedMs: 0,
  runningSince: null as number | null,
  limitMs: 0,
  result: null as SessionResultData | null,
  finishing: false,
};

function timerOf(s: Pick<SessionState, 'usedMs' | 'runningSince' | 'limitMs'>): TimerState {
  return { usedMs: s.usedMs, runningSince: s.runningSince, limitMs: s.limitMs };
}

function snapshotOf(s: SessionState, now: number): SavedSession {
  return {
    version: SESSION_SAVE_VERSION,
    day: toDateKey(now),
    savedAt: now,
    mode: s.mode,
    groupId: s.groupId,
    phase: s.phase,
    newKanaIds: s.newKanaIds,
    reviewKanaIds: s.reviewKanaIds,
    learnedIds: s.learnedIds,
    newIndex: s.newIndex,
    questions: s.questions,
    qIndex: s.qAnswered ? s.qIndex + 1 : s.qIndex,
    answers: s.answers,
    loanwordAnswers: s.loanwordAnswers,
    startedAt: s.startedAt,
    usedMs: elapsedMs(timerOf(s), now),
    limitMs: s.limitMs,
  };
}

export const useSessionStore = create<SessionState>()((set, get) => {
  /** 把目前這一輪存起來（有進度才存；一輪已結束就不存） */
  const persist = (now: number = Date.now()) => {
    const s = get();
    if (!s.active || s.result || s.finishing || !hasSessionProgress(s)) return;
    const saved = snapshotOf(s, now);
    set({ saved, savedOwner: s.sid });
    void writeSavedSession(saved);
  };
  const dropSaved = () => {
    set({ saved: null, savedOwner: null });
    void clearSavedSession();
  };

  return {
  sid: 0,
  saved: null,
  savedOwner: null,
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
    // 重新開始每日練習 = 丟掉舊的存檔（接續走 resumeSaved）
    dropSaved();
    set((s) => ({
      ...empty,
      limitMs: limitMsFor(useSettingsStore.getState().dailyGoalMinutes),
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
      persist();
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
    set({ phase: 'quiz', questions, qIndex: 0, qAnswered: false });
    persist();
    return 'quiz';
  },

  recordAnswer(kanaId, correct) {
    set((s) => ({
      answers: { ...s.answers, [kanaId]: [...(s.answers[kanaId] ?? []), correct] },
      qAnswered: true,
    }));
    persist();
    if (!correct) {
      // 作答當下就寫入易混淆字組的答錯次數，不等一輪結束；寫入失敗不影響作答流程
      useProgressStore
        .getState()
        .recordWrongAnswer(kanaId, Date.now())
        .catch(() => {});
    }
  },

  recordLoanwordAnswer(correct) {
    set((s) => ({ loanwordAnswers: [...s.loanwordAnswers, correct], qAnswered: true }));
    persist();
  },

  nextQuestion() {
    const s = get();
    if (s.qIndex + 1 >= s.questions.length) return false;
    set({ qIndex: s.qIndex + 1, qAnswered: false });
    return true;
  },

  async loadSaved(now) {
    set({ saved: await readSavedSession(now) });
  },

  refreshSaved(now) {
    const saved = get().saved;
    if (saved && saved.day !== toDateKey(now)) dropSaved();
  },

  discardSaved() {
    dropSaved();
  },

  resumeSaved(now) {
    const saved = get().saved;
    if (!saved || saved.day !== toDateKey(now)) {
      if (saved) dropSaved();
      return null;
    }
    set((s) => ({
      ...empty,
      sid: s.sid + 1,
      savedOwner: s.sid + 1,
      active: true,
      mode: saved.mode,
      groupId: saved.groupId,
      phase: saved.phase,
      newKanaIds: saved.newKanaIds,
      reviewKanaIds: saved.reviewKanaIds,
      learnedIds: saved.learnedIds,
      newIndex: saved.newIndex,
      questions: saved.questions,
      qIndex: saved.qIndex,
      answers: saved.answers,
      loanwordAnswers: saved.loanwordAnswers,
      startedAt: saved.startedAt,
      usedMs: saved.usedMs,
      limitMs: saved.limitMs,
    }));
    if (saved.phase === 'quiz' && saved.qIndex >= saved.questions.length) return 'finish';
    return saved.phase;
  },

  resumeTimer(now) {
    const s = get();
    if (!s.active || s.result || s.finishing) return;
    set(timerOf(resumeTimer(timerOf(s), now)));
  },

  pauseTimer(now) {
    const s = get();
    if (s.runningSince === null) return;
    set(timerOf(pauseTimer(timerOf(s), now)));
    persist(now);
  },

  leave(now) {
    get().pauseTimer(now);
    persist(now);
    set({ ...empty });
  },

  advanceQuiz(now) {
    const s = get();
    const next = s.qIndex + 1;
    if (next >= s.questions.length) return 'done';
    if (s.mode === 'daily' && isTimeUp(timerOf(s), now)) {
      const r = newQuestionsFirst(s.questions, next, new Set(s.newKanaIds));
      if (!r.hasNew) return 'timeup';
      set({ questions: r.questions, qIndex: next, qAnswered: false });
      return 'next';
    }
    set({ qIndex: next, qAnswered: false });
    return 'next';
  },

  timeUpDue(now) {
    const s = get();
    if (!s.active || s.mode !== 'daily' || s.phase !== 'quiz' || s.qAnswered) return false;
    if (s.qIndex >= s.questions.length || !isTimeUp(timerOf(s), now)) return false;
    const r = newQuestionsFirst(s.questions, s.qIndex, new Set(s.newKanaIds));
    if (r.hasNew) {
      set({ questions: r.questions });
      return false;
    }
    return true;
  },

  extendTime(now) {
    const s = get();
    set({
      ...timerOf(extendTimer(timerOf(s), now)),
      ...(s.qAnswered ? { qIndex: s.qIndex + 1, qAnswered: false } : {}),
    });
    persist(now);
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
    // 先停表：用時只算練習畫面的時間
    set({ ...timerOf(pauseTimer(timerOf(s), now)), finishing: true });
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
        elapsedMs: get().usedMs,
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
      // 這一輪自己寫的存檔隨提交清掉（別的模式寫的存檔不動）
      if (get().savedOwner === s.sid) dropSaved();
      return result;
    } catch (e) {
      set({ finishing: false });
      throw e;
    }
  },

  clear() {
    set({ ...empty });
  },
  };
});

/** 目前進度的陣列（方便畫面從 progressStore 取用）。 */
export function currentProgressList(): Progress[] {
  return progressList(useProgressStore.getState().progress);
}
