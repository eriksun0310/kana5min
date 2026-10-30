import type { Progress } from '../data/types';

export interface ConfusionRecord {
  /** 易混淆字組 id（見 data 的 confusionGroupId） */
  groupId: string;
  wrongCount: number;
  updatedAt: number;
}

/** 每個假名各自的累計對錯（與 SRS 分開，掉字遊戲與題型引擎共用）。 */
export interface KanaStat {
  kanaId: string;
  correctCount: number;
  wrongCount: number;
  updatedAt: number;
}

/** 「把 truth 當成 picked」的混淆對累計次數。 */
export interface ConfusionPair {
  truthId: string;
  pickedId: string;
  count: number;
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
  getKanaStats(): Promise<KanaStat[]>;
  /** 某個假名的累計對錯 +1 */
  addKanaResult(kanaId: string, correct: boolean, now: number): Promise<void>;
  getConfusionPairs(): Promise<ConfusionPair[]>;
  /** 「把 truth 當成 picked」+ amount（預設 1） */
  addConfusionPair(truthId: string, pickedId: string, now: number, amount?: number): Promise<void>;
}
