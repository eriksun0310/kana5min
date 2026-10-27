import type { Progress } from '../data/types';

export interface ConfusionRecord {
  /** 易混淆字組 id（見 data 的 confusionGroupId） */
  groupId: string;
  wrongCount: number;
  updatedAt: number;
}

/** 學習進度存取介面；sqlite 與記憶體各一份實作。 */
export interface ProgressRepository {
  getAll(): Promise<Progress[]>;
  /** 依 kanaId 新增或覆蓋 */
  upsertMany(items: Progress[]): Promise<void>;
  /** 清除所有進度與易混淆紀錄 */
  reset(): Promise<void>;
  getConfusions(): Promise<ConfusionRecord[]>;
  /** 易混淆字組答錯次數 + amount（預設 1） */
  addConfusion(groupId: string, now: number, amount?: number): Promise<void>;
}
