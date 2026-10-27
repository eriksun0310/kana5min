import { create } from 'zustand';
import { confusionGroupId } from '../data';
import type { Progress } from '../data/types';
import type { ConfusionRecord, ProgressRepository } from '../db/types';
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
  /** 從 repository 載入全部進度（App 啟動時呼叫一次） */
  load: (repo: ProgressRepository) => Promise<void>;
  /**
   * 提交一輪結果：answers = 每個字這輪所有題目的對錯。
   * 依 SRS 更新等級與下次複習時間、寫入 repository，並累計易混淆字組的答錯次數。
   */
  commitRound: (answers: Record<string, boolean[]>, now: number) => Promise<CommitResult>;
  /** 清除全部進度（設定或除錯用） */
  reset: () => Promise<void>;
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

    async load(r) {
      repo = r;
      const [all, confusions] = await Promise.all([r.getAll(), r.getConfusions()]);
      set({
        loaded: true,
        progress: Object.fromEntries(all.map((p) => [p.kanaId, p])),
        confusions,
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

      for (const [kanaId, list] of Object.entries(answers)) {
        const group = confusionGroupId(kanaId);
        const wrong = list.filter((ok) => !ok).length;
        if (group && wrong > 0) await r.addConfusion(group, now, wrong);
      }

      const next = { ...get().progress };
      for (const p of updated) next[p.kanaId] = p;
      set({ progress: next, confusions: await r.getConfusions() });
      return { before, after: progressList(next) };
    },

    async reset() {
      await need().reset();
      set({ progress: {}, confusions: [] });
    },
  }));
}

export const useProgressStore = createProgressStore();
