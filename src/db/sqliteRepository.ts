import * as SQLite from 'expo-sqlite';
import type { Progress } from '../data/types';
import type { ConfusionPair, ConfusionRecord, KanaStat, ProgressRepository } from './types';

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

interface KanaStatRow {
  kana_id: string;
  correct_count: number;
  wrong_count: number;
  updated_at: number;
}

interface ConfusionPairRow {
  truth_id: string;
  picked_id: string;
  count: number;
  updated_at: number;
}

/** 資料庫版本（PRAGMA user_version）。2 = 新增 kana_stat、confusion_pair（只加表，不動既有資料）。 */
export const SCHEMA_VERSION = 2;

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
  CREATE TABLE IF NOT EXISTS kana_stat (
    kana_id TEXT PRIMARY KEY NOT NULL,
    correct_count INTEGER NOT NULL DEFAULT 0,
    wrong_count INTEGER NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS confusion_pair (
    truth_id TEXT NOT NULL,
    picked_id TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (truth_id, picked_id)
  );
`;

/** 開啟（必要時建立）sqlite 資料庫並回傳 repository。 */
export async function openSqliteRepository(
  dbName: string = DB_NAME,
): Promise<ProgressRepository> {
  const db = await SQLite.openDatabaseAsync(dbName);
  // 所有表都是 IF NOT EXISTS：舊版資料庫升級時只會多出新表，progress／confusion 的資料不動
  await db.execAsync(SCHEMA);
  await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);

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
        await db.runAsync('DELETE FROM kana_stat');
        await db.runAsync('DELETE FROM confusion_pair');
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
    async getKanaStats() {
      const rows = await db.getAllAsync<KanaStatRow>('SELECT * FROM kana_stat');
      return rows.map(
        (r): KanaStat => ({
          kanaId: r.kana_id,
          correctCount: r.correct_count,
          wrongCount: r.wrong_count,
          updatedAt: r.updated_at,
        }),
      );
    },
    async addKanaResult(kanaId, correct, now) {
      await db.runAsync(
        `INSERT INTO kana_stat (kana_id, correct_count, wrong_count, updated_at) VALUES (?, ?, ?, ?)
         ON CONFLICT(kana_id) DO UPDATE SET
           correct_count = correct_count + excluded.correct_count,
           wrong_count = wrong_count + excluded.wrong_count,
           updated_at = excluded.updated_at`,
        kanaId,
        correct ? 1 : 0,
        correct ? 0 : 1,
        now,
      );
    },
    async getConfusionPairs() {
      const rows = await db.getAllAsync<ConfusionPairRow>('SELECT * FROM confusion_pair');
      return rows.map(
        (r): ConfusionPair => ({
          truthId: r.truth_id,
          pickedId: r.picked_id,
          count: r.count,
          updatedAt: r.updated_at,
        }),
      );
    },
    async addConfusionPair(truthId, pickedId, now, amount = 1) {
      await db.runAsync(
        `INSERT INTO confusion_pair (truth_id, picked_id, count, updated_at) VALUES (?, ?, ?, ?)
         ON CONFLICT(truth_id, picked_id) DO UPDATE SET
           count = count + excluded.count,
           updated_at = excluded.updated_at`,
        truthId,
        pickedId,
        amount,
        now,
      );
    },
  };
}
