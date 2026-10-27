import * as SQLite from 'expo-sqlite';
import type { Progress } from '../data/types';
import type { ConfusionRecord, ProgressRepository } from './types';

export const DB_NAME = 'kana5min.db';

interface ProgressRow {
  kana_id: string;
  level: number;
  next_review_at: number;
  correct_streak: number;
  wrong_count: number;
  learned_at: number | null;
}

interface ConfusionRow {
  group_id: string;
  wrong_count: number;
  updated_at: number;
}

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS progress (
    kana_id TEXT PRIMARY KEY NOT NULL,
    level INTEGER NOT NULL,
    next_review_at INTEGER NOT NULL,
    correct_streak INTEGER NOT NULL,
    wrong_count INTEGER NOT NULL,
    learned_at INTEGER
  );
  CREATE TABLE IF NOT EXISTS confusion (
    group_id TEXT PRIMARY KEY NOT NULL,
    wrong_count INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
`;

/** 開啟（必要時建立）sqlite 資料庫並回傳 repository。 */
export async function openSqliteRepository(
  dbName: string = DB_NAME,
): Promise<ProgressRepository> {
  const db = await SQLite.openDatabaseAsync(dbName);
  await db.execAsync(SCHEMA);

  return {
    async getAll() {
      const rows = await db.getAllAsync<ProgressRow>('SELECT * FROM progress');
      return rows.map(
        (r): Progress => ({
          kanaId: r.kana_id,
          level: r.level,
          nextReviewAt: r.next_review_at,
          correctStreak: r.correct_streak,
          wrongCount: r.wrong_count,
          learnedAt: r.learned_at ?? undefined,
        }),
      );
    },
    async upsertMany(items) {
      if (items.length === 0) return;
      await db.withTransactionAsync(async () => {
        for (const p of items) {
          await db.runAsync(
            `INSERT INTO progress (kana_id, level, next_review_at, correct_streak, wrong_count, learned_at)
             VALUES (?, ?, ?, ?, ?, ?)
             ON CONFLICT(kana_id) DO UPDATE SET
               level = excluded.level,
               next_review_at = excluded.next_review_at,
               correct_streak = excluded.correct_streak,
               wrong_count = excluded.wrong_count,
               learned_at = excluded.learned_at`,
            p.kanaId,
            p.level,
            p.nextReviewAt,
            p.correctStreak,
            p.wrongCount,
            p.learnedAt ?? null,
          );
        }
      });
    },
    async reset() {
      await db.withTransactionAsync(async () => {
        await db.runAsync('DELETE FROM progress');
        await db.runAsync('DELETE FROM confusion');
      });
    },
    async getConfusions() {
      const rows = await db.getAllAsync<ConfusionRow>('SELECT * FROM confusion');
      return rows.map(
        (r): ConfusionRecord => ({
          groupId: r.group_id,
          wrongCount: r.wrong_count,
          updatedAt: r.updated_at,
        }),
      );
    },
    async addConfusion(groupId, now, amount = 1) {
      await db.runAsync(
        `INSERT INTO confusion (group_id, wrong_count, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(group_id) DO UPDATE SET
           wrong_count = wrong_count + excluded.wrong_count,
           updated_at = excluded.updated_at`,
        groupId,
        amount,
        now,
      );
    },
  };
}
