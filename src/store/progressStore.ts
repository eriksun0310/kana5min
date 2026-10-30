import { create } from 'zustand';
import type { Progress } from '../data/types';
import type { ConfusionPair, ConfusionRecord, KanaStat, ProgressRepository } from '../db/types';
import { groupsForWrongAnswer } from '../logic/confusion';
import { applyRoundResult } from '../logic/srs';

export interface CommitResult {
  /** 提交前所有進度 */
  before: Progress[];
  /** 提交後所有進度 */
  after: Progress[];
}

export interface ProgressState {
  loaded: boolean;
  progress: Record<string, Progress>;
  confusions: ConfusionRecord[];
  /** 每個假名各自的累計對錯 */
  kanaStats: Record<string, KanaStat>;
  /** 混淆對：「把 truthId 當成 pickedId」的累計次數 */
  confusionPairs: ConfusionPair[];
  /** 從 repository 載入全部進度（App 啟動時呼叫一次） */
  load: (repo: ProgressRepository) => Promise<void>;
  /**
   * 提交一輪結果：answers = 每個字這輪所有題目的對錯。
   * 依 SRS 更新等級與下次複習時間並寫入 repository。
   * 易混淆字組的答錯次數不在這裡累計，而是作答當下由 recordWrongAnswer 寫入。
   */
  commitRound: (answers: Record<string, boolean[]>, now: number) => Promise<CommitResult>;
  /**
   * 作答當下呼叫（只在答錯時）：正確答案所屬的易混淆字組答錯次數 +1，立刻寫入 repository。
   * 先更新記憶體（畫面立即看到）再寫入；字不屬於任何組時什麼都不做。
   */
  recordWrongAnswer: (kanaId: string, now: number) => Promise<void>;
  /**
   * 記錄某個假名的一次對錯（每個假名各自計分；與 SRS 分開，不影響複習排程）。
   * 先更新記憶體再寫入；repository 尚未載入時只更新記憶體不丟錯。
   */
  recordKanaResult: (kanaId: string, correct: boolean, now?: number) => Promise<void>;
  /** 記錄「把 truthId 當成 pickedId」一次（truthId === pickedId 或空字串不記）。 */
  recordConfusion: (truthId: string, pickedId: string, now?: number) => Promise<void>;
  /** 清除全部進度（設定或除錯用） */
  reset: () => Promise<void>;
  /** 以給定進度取代全部進度並清空易混淆紀錄（開發用預設） */
  replaceAll: (items: Progress[]) => Promise<void>;
}

export function progressList(record: Record<string, Progress>): Progress[] {
  return Object.values(record);
}

/** 建立 store；測試時可各自建立、注入記憶體 repository。 */
export function createProgressStore() {
  let repo: ProgressRepository | null = null;
  const need = (): ProgressRepository => {
    if (!repo) throw new Error('progressStore: repository 尚未載入，請先呼叫 load()');
    return repo;
  };

  return create<ProgressState>()((set, get) => ({
    loaded: false,
    progress: {},
    confusions: [],
    kanaStats: {},
    confusionPairs: [],

    async load(r) {
      repo = r;
      const [all, confusions, stats, pairs] = await Promise.all([
        r.getAll(),
        r.getConfusions(),
        r.getKanaStats(),
        r.getConfusionPairs(),
      ]);
      set({
        loaded: true,
        progress: Object.fromEntries(all.map((p) => [p.kanaId, p])),
        confusions,
        kanaStats: Object.fromEntries(stats.map((x) => [x.kanaId, x])),
        confusionPairs: pairs,
      });
    },

    async commitRound(answers, now) {
      const r = need();
      const before = progressList(get().progress);
      const updated: Progress[] = [];
      for (const [kanaId, list] of Object.entries(answers)) {
        if (list.length === 0) continue;
        updated.push(applyRoundResult(get().progress[kanaId], kanaId, list, now));
      }
      await r.upsertMany(updated);

      const next = { ...get().progress };
      for (const p of updated) next[p.kanaId] = p;
      set({ progress: next });
      return { before, after: progressList(next) };
    },

    async recordWrongAnswer(kanaId, now) {
      const groups = groupsForWrongAnswer(kanaId);
      if (groups.length === 0) return;
      const r = need();
      for (const g of groups) {
        const list = get().confusions;
        const prev = list.find((c) => c.groupId === g.id);
        const nextRecord: ConfusionRecord = {
          groupId: g.id,
          wrongCount: (prev?.wrongCount ?? 0) + 1,
          updatedAt: now,
        };
        set({ confusions: [...list.filter((c) => c.groupId !== g.id), nextRecord] });
        await r.addConfusion(g.id, now, 1);
      }
    },

    async recordKanaResult(kanaId, correct, now = Date.now()) {
      const prev = get().kanaStats[kanaId];
      const next: KanaStat = {
        kanaId,
        correctCount: (prev?.correctCount ?? 0) + (correct ? 1 : 0),
        wrongCount: (prev?.wrongCount ?? 0) + (correct ? 0 : 1),
        updatedAt: now,
      };
      set({ kanaStats: { ...get().kanaStats, [kanaId]: next } });
      if (repo) await repo.addKanaResult(kanaId, correct, now);
    },

    async recordConfusion(truthId, pickedId, now = Date.now()) {
      if (!truthId || !pickedId || truthId === pickedId) return;
      const list = get().confusionPairs;
      const prev = list.find((c) => c.truthId === truthId && c.pickedId === pickedId);
      const next: ConfusionPair = { truthId, pickedId, count: (prev?.count ?? 0) + 1, updatedAt: now };
      set({
        confusionPairs: [...list.filter((c) => c !== prev), next],
      });
      if (repo) await repo.addConfusionPair(truthId, pickedId, now, 1);
    },

    async reset() {
      await need().reset();
      set({ progress: {}, confusions: [], kanaStats: {}, confusionPairs: [] });
    },

    async replaceAll(items) {
      const r = need();
      await r.reset();
      await r.upsertMany(items);
      set({
        progress: Object.fromEntries(items.map((p) => [p.kanaId, p])),
        confusions: [],
        kanaStats: {},
        confusionPairs: [],
      });
    },
  }));
}

export const useProgressStore = createProgressStore();
