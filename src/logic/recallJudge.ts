// 默寫自我檢查的自動比對：使用者在空白的框裡憑記憶寫字（沒有淡色的字可以描），
// 所以大小與位置都不準。先把使用者寫的所有筆畫整體縮放、平移到標準字的範圍（等比例、對齊中心），
// 再用描寫判定（evaluateTrace）逐筆比對。純函式，座標一律是 KanjiVG viewBox（109）。
import { MIN_STROKE_LENGTH, polylineLength, samplePath, type Point, type Stroke } from './trace';
import { evaluateTrace, type TraceEvaluation } from './traceShape';

interface Box {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function boxOf(points: readonly Point[]): Box | null {
  if (points.length === 0) return null;
  let b: Box = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (const p of points) {
    b = {
      minX: Math.min(b.minX, p.x),
      minY: Math.min(b.minY, p.y),
      maxX: Math.max(b.maxX, p.x),
      maxY: Math.max(b.maxY, p.y),
    };
  }
  return b;
}

/** 默寫比對每一筆平均距離上限（viewBox 單位，描寫是 18）：對齊之後還差這麼多，就是形狀不一樣 */
export const RECALL_MAX_MEAN = 9;

/** 使用者的字最大邊至少要有標準字的這個比例，太小（只點幾下、畫一小撇）直接當作寫錯。 */
export const MIN_SIZE_RATIO = 0.35;

const validStrokes = (user: readonly Stroke[]) =>
  user.filter((s) => s.length >= 2 && polylineLength(s) >= MIN_STROKE_LENGTH);

/**
 * 把使用者的筆畫等比例縮放、平移到標準字的外框內（中心對齊），回傳新的筆畫；寫太小或沒有有效筆畫回傳 null。
 */
export function normalizeToReference(user: readonly Stroke[], referencePaths: readonly string[]): Stroke[] | null {
  const valid = validStrokes(user);
  const ub = boxOf(valid.flat());
  const rb = boxOf(referencePaths.flatMap((d) => samplePath(d)));
  if (!ub || !rb) return null;
  const uSize = Math.max(ub.maxX - ub.minX, ub.maxY - ub.minY);
  const rSize = Math.max(rb.maxX - rb.minX, rb.maxY - rb.minY);
  if (uSize < rSize * MIN_SIZE_RATIO || uSize <= 0) return null;
  const k = rSize / uSize;
  const ucx = (ub.minX + ub.maxX) / 2;
  const ucy = (ub.minY + ub.maxY) / 2;
  const rcx = (rb.minX + rb.maxX) / 2;
  const rcy = (rb.minY + rb.maxY) / 2;
  return valid.map((s) => s.map((p) => ({ x: rcx + (p.x - ucx) * k, y: rcy + (p.y - ucy) * k })));
}

export type RecallVerdict = 'none' | 'right' | 'wrong';

export interface RecallJudgement {
  verdict: RecallVerdict;
  /** 漏掉的標準筆畫索引（寫錯時用來亮起來給使用者看） */
  missing: number[];
  evaluation?: TraceEvaluation;
}

/**
 * 判斷默寫：沒寫任何有效的筆畫（可能在紙上或腦中寫）回傳 'none'，讓使用者自評；
 * 有寫就比對，通過 'right'、沒通過 'wrong'。
 */
export function judgeRecall(user: readonly Stroke[], referencePaths: readonly string[]): RecallJudgement {
  const valid = validStrokes(user);
  if (valid.length === 0 || referencePaths.length === 0) return { verdict: 'none', missing: [] };
  const normalized = normalizeToReference(valid, referencePaths);
  // 有寫但太小：算寫錯，每一筆都算漏掉
  if (!normalized) return { verdict: 'wrong', missing: referencePaths.map((_, i) => i) };
  // 已經對齊大小與位置，所以比描寫嚴格：每一筆要更貼近標準寫法，也不能多畫
  const evaluation = evaluateTrace(normalized, [...referencePaths], { maxMean: RECALL_MAX_MEAN, maxExtra: 0, allowMiss: 0 });
  return { verdict: evaluation.passed ? 'right' : 'wrong', missing: evaluation.missing, evaluation };
}
