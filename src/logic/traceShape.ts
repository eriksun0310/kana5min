// 描寫判定：逐筆比對使用者的線與 KanjiVG 標準筆畫（docs/architecture.md 第 8 節）。
// 純函式。座標一律是 KanjiVG viewBox（109）。刻意寬鬆：手指描本來就不準，
// 但每一筆都要「大致在淡色字的那條線上、方向對」，亂畫或寫成別的字不會通過。
import { MIN_STROKE_LENGTH, polylineLength, samplePath, type Point, type Stroke } from './trace';

/** 每一筆重取樣的點數 */
export const RESAMPLE_POINTS = 24;
/** 平均點對點距離上限（viewBox 單位，約字框 18%） */
export const MAX_MEAN_DISTANCE = 18;
/** 起點、終點距離上限 = MAX_MEAN_DISTANCE × 這個倍數 */
export const ENDPOINT_FACTOR = 1.5;
/** 使用者筆畫長度 ÷ 標準筆畫長度 的容許範圍 */
export const MIN_LENGTH_RATIO = 0.4;
export const MAX_LENGTH_RATIO = 2.2;
/** 長度上限的固定寬容量（viewBox 單位） */
export const LENGTH_SLACK = 20;
/** 標準筆畫數達到這個數字時，允許漏一筆 */
export const ALLOW_MISS_FROM = 5;
/** 容許多畫的筆數（超過就失敗，避免亂塗）；標準只有 1～2 筆的字只容許 1 筆，否則多筆的字常包含它 */
export const MAX_EXTRA_STROKES = 2;
export const maxExtraFor = (refCount: number) => (refCount <= 2 ? 1 : MAX_EXTRA_STROKES);

export type TraceFailReason = 'too-few' | 'shape' | 'too-many';

export interface TraceEvaluation {
  passed: boolean;
  /** 有效筆畫數（長度達標的） */
  strokeCount: number;
  /** 已對上的標準筆畫索引（遞增） */
  matched: number[];
  /** 漏掉的標準筆畫索引（遞增）；通過時也會列出（≥ 5 筆的字允許漏 1 筆） */
  missing: number[];
  /** 多餘（沒對上任何標準筆畫）的使用者筆畫數 */
  extra: number;
  reason?: TraceFailReason;
}

/** 依弧長把折線重取樣成 n 個點（含起終點）。 */
export function resample(points: Point[], n: number = RESAMPLE_POINTS): Point[] {
  if (points.length === 0) return [];
  const total = polylineLength(points);
  if (total < 1e-9) return Array.from({ length: n }, () => points[0]);
  const out: Point[] = [points[0]];
  const step = total / (n - 1);
  let acc = 0;
  let target = step;
  for (let i = 1; i < points.length && out.length < n - 1; i++) {
    const a = points[i - 1];
    const b = points[i];
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    while (seg > 0 && acc + seg >= target && out.length < n - 1) {
      const f = (target - acc) / seg;
      out.push({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f });
      target += step;
    }
    acc += seg;
  }
  out.push(points[points.length - 1]);
  return out;
}

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

interface Prepared {
  pts: Point[];
  length: number;
}

/** 平滑：3 點移動平均（保留起終點），抹掉手抖與取樣雜訊，避免鋸齒把長度灌大。 */
function smooth(points: Point[]): Point[] {
  return points.map((p, i) => {
    if (i === 0 || i === points.length - 1) return p;
    const a = points[i - 1];
    const b = points[i + 1];
    return { x: (a.x + p.x + b.x) / 3, y: (a.y + p.y + b.y) / 3 };
  });
}

function prepare(points: Point[]): Prepared {
  // 先重取樣到較密的點再平滑，長度與比對都用平滑後的線
  const dense = smooth(smooth(resample(points, RESAMPLE_POINTS * 2)));
  // 長度用只有 7 個點的粗折線量，手抖的鋸齒不會把短筆的長度灌大
  return { pts: resample(dense, RESAMPLE_POINTS), length: polylineLength(resample(dense, 7)) };
}

/** 使用者一筆與標準一筆的配對成本；不符合條件回傳 null。 */
export function strokeMatchCost(user: Prepared, ref: Prepared): number | null {
  // 短筆（點）手抖時長度會被灌大，所以上限加一個固定寬容量
  if (user.length < ref.length * MIN_LENGTH_RATIO) return null;
  if (user.length > ref.length * MAX_LENGTH_RATIO + LENGTH_SLACK) return null;
  const n = ref.pts.length;
  const endLimit = MAX_MEAN_DISTANCE * ENDPOINT_FACTOR;
  if (dist(user.pts[0], ref.pts[0]) > endLimit) return null;
  if (dist(user.pts[n - 1], ref.pts[n - 1]) > endLimit) return null;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += dist(user.pts[i], ref.pts[i]);
  const mean = sum / n;
  return mean <= MAX_MEAN_DISTANCE ? mean : null;
}

/**
 * 判定描寫是否完成（不強制筆順）。
 * userStrokes：使用者畫的每一筆（viewBox 座標）。referencePaths：strokes.json 該字每一筆的 path。
 * 通過：標準筆畫數 ≤ 4 全部對上；≥ 5 允許漏 1 筆；且多畫的筆 ≤ 2。
 */
export function evaluateTrace(userStrokes: Stroke[], referencePaths: string[]): TraceEvaluation {
  const refs = referencePaths.map((d) => prepare(samplePath(d)));
  const valid = userStrokes.filter((s) => s.length >= 2 && polylineLength(s) >= MIN_STROKE_LENGTH);
  const allRefs = refs.map((_, i) => i);
  if (refs.length === 0) return { passed: true, strokeCount: valid.length, matched: [], missing: [], extra: 0 };

  const allowedMiss = refs.length >= ALLOW_MISS_FROM ? 1 : 0;
  const need = refs.length - allowedMiss;
  if (valid.length > refs.length + maxExtraFor(refs.length)) {
    return { passed: false, strokeCount: valid.length, matched: [], missing: allRefs, extra: valid.length, reason: 'too-many' };
  }

  const users = valid.map(prepare);
  const cost = users.map((u) => refs.map((r) => strokeMatchCost(u, r)));

  // 位元遮罩 DP：逐一處理使用者筆畫，決定它對上哪一筆標準筆畫（或不對）；
  // 目標：對上最多筆，其次總成本最小。
  const full = 1 << refs.length;
  type Cell = { count: number; cost: number; prev: number; pick: number } | null;
  let layer: Cell[] = Array.from({ length: full }, () => null);
  layer[0] = { count: 0, cost: 0, prev: -1, pick: -1 };
  const better = (a: Cell, b: Cell) => !b || a!.count > b.count || (a!.count === b.count && a!.cost < b.cost);
  for (let u = 0; u < users.length; u++) {
    const nextLayer: Cell[] = Array.from({ length: full }, () => null);
    for (let mask = 0; mask < full; mask++) {
      const cur = layer[mask];
      if (!cur) continue;
      const skip = { count: cur.count, cost: cur.cost, prev: mask, pick: -1 };
      if (better(skip, nextLayer[mask])) nextLayer[mask] = skip;
      for (let r = 0; r < refs.length; r++) {
        const c = cost[u][r];
        if (c === null || mask & (1 << r)) continue;
        const nm = mask | (1 << r);
        const cand = { count: cur.count + 1, cost: cur.cost + c, prev: mask, pick: r };
        if (better(cand, nextLayer[nm])) nextLayer[nm] = cand;
      }
    }
    layer = nextLayer;
  }
  let bestMask = 0;
  for (let mask = 0; mask < full; mask++) {
    if (layer[mask] && better(layer[mask], layer[bestMask])) bestMask = mask;
  }
  const matched: number[] = [];
  for (let r = 0; r < refs.length; r++) if (bestMask & (1 << r)) matched.push(r);
  const missing = allRefs.filter((r) => !matched.includes(r));
  const extra = valid.length - matched.length;

  let reason: TraceFailReason | undefined;
  if (extra > maxExtraFor(refs.length)) reason = 'too-many';
  else if (matched.length < need) reason = valid.length < need ? 'too-few' : 'shape';
  return { passed: !reason, strokeCount: valid.length, matched, missing, extra, reason };
}
