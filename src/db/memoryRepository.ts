import type { Progress } from '../data/types';
import type { ConfusionRecord, ProgressRepository } from './types';

/** 記憶體實作：給單元測試與沒有 sqlite 的環境使用。回傳與存入的都是複本。 */
export function createMemoryRepository(): ProgressRepository {
  const progress = new Map<string, Progress>();
  const confusions = new Map<string, ConfusionRecord>();
  return {
    async getAll() {
      return [...progress.values()].map((p) => ({ ...p }));
    },
    async upsertMany(items) {
      for (const p of items) progress.set(p.kanaId, { ...p });
    },
    async reset() {
      progress.clear();
      confusions.clear();
    },
    async getConfusions() {
      return [...confusions.values()].map((c) => ({ ...c }));
    },
    async addConfusion(groupId, now, amount = 1) {
      const prev = confusions.get(groupId);
      confusions.set(groupId, {
        groupId,
        wrongCount: (prev?.wrongCount ?? 0) + amount,
        updatedAt: now,
      });
    },
  };
}
