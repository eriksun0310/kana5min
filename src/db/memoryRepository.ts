import type { Progress } from '../data/types';
import type { ConfusionPair, ConfusionRecord, KanaStat, ProgressRepository } from './types';

/** 記憶體實作：給單元測試與沒有 sqlite 的環境使用。回傳與存入的都是複本。 */
export function createMemoryRepository(): ProgressRepository {
  const progress = new Map<string, Progress>();
  const confusions = new Map<string, ConfusionRecord>();
  const stats = new Map<string, KanaStat>();
  const pairs = new Map<string, ConfusionPair>();
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
      stats.clear();
      pairs.clear();
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
    async getKanaStats() {
      return [...stats.values()].map((c) => ({ ...c }));
    },
    async addKanaResult(kanaId, correct, now) {
      const prev = stats.get(kanaId);
      stats.set(kanaId, {
        kanaId,
        correctCount: (prev?.correctCount ?? 0) + (correct ? 1 : 0),
        wrongCount: (prev?.wrongCount ?? 0) + (correct ? 0 : 1),
        updatedAt: now,
      });
    },
    async getConfusionPairs() {
      return [...pairs.values()].map((c) => ({ ...c }));
    },
    async addConfusionPair(truthId, pickedId, now, amount = 1) {
      const key = `${truthId}>${pickedId}`;
      const prev = pairs.get(key);
      pairs.set(key, { truthId, pickedId, count: (prev?.count ?? 0) + amount, updatedAt: now });
    },
  };
}
