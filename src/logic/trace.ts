// 描寫判定與筆畫路徑工具（docs/architecture.md 第 8 節）。
// 全部是不依賴 React Native 的純函式：
// - samplePath / pathEndpoints / pathLength：把 KanjiVG 的 SVG path 取樣成折線，供動畫算長度與判定取起終點
// - traceTransform：畫布像素 ↔ KanjiVG viewBox 座標（筆順動畫、描寫畫布、判定共用同一套）
// - evaluateTrace：描寫是否算完成（只看筆畫數與第一筆方向，不做精準辨識）

export interface Point {
  x: number;
  y: number;
}

export type Stroke = Point[];

// ---------------------------------------------------------------- SVG path 取樣

const TOKEN_RE = /[A-Za-z]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g;

function cubic(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return {
    x: a * p0.x + b * p1.x + c * p2.x + d * p3.x,
    y: a * p0.y + b * p1.y + c * p2.y + d * p3.y,
  };
}

function quad(p0: Point, p1: Point, p2: Point, t: number): Point {
  const u = 1 - t;
  return {
    x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
    y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
  };
}

/**
 * 把 SVG path 的 d 字串取樣成折線點。
 * 支援 M L H V C S Q T Z（大小寫）；A（弧線）以直線連到終點（KanjiVG 假名資料只用到 M 與 c）。
 * 多個子路徑會接在同一個陣列裡（假名的每一筆只有一個子路徑）。
 */
export function samplePath(d: string, curveSteps = 16): Point[] {
  const tokens = d.match(TOKEN_RE) ?? [];
  const pts: Point[] = [];
  let i = 0;
  let cmd = '';
  let cur: Point = { x: 0, y: 0 };
  let start: Point = { x: 0, y: 0 };
  let lastCtrl: Point | null = null; // S／T 用的上一個控制點
  const isCmd = (tok: string | undefined) => tok !== undefined && /^[A-Za-z]$/.test(tok);
  const num = () => parseFloat(tokens[i++]);

  while (i < tokens.length) {
    if (isCmd(tokens[i])) {
      cmd = tokens[i++];
      if (cmd === 'Z' || cmd === 'z') {
        cur = start;
        pts.push(cur);
        lastCtrl = null;
        continue;
      }
    } else if (cmd === 'M') {
      cmd = 'L'; // M 後面的隱含重複是 L
    } else if (cmd === 'm') {
      cmd = 'l';
    }
    if (!cmd) break;
    const rel = cmd === cmd.toLowerCase();
    const ox = rel ? cur.x : 0;
    const oy = rel ? cur.y : 0;
    const type = cmd.toUpperCase();

    if (type === 'M') {
      cur = { x: ox + num(), y: oy + num() };
      start = cur;
      pts.push(cur);
      lastCtrl = null;
    } else if (type === 'L') {
      cur = { x: ox + num(), y: oy + num() };
      pts.push(cur);
      lastCtrl = null;
    } else if (type === 'H') {
      cur = { x: (rel ? cur.x : 0) + num(), y: cur.y };
      pts.push(cur);
      lastCtrl = null;
    } else if (type === 'V') {
      cur = { x: cur.x, y: (rel ? cur.y : 0) + num() };
      pts.push(cur);
      lastCtrl = null;
    } else if (type === 'C') {
      const p1 = { x: ox + num(), y: oy + num() };
      const p2 = { x: ox + num(), y: oy + num() };
      const p3 = { x: ox + num(), y: oy + num() };
      for (let s = 1; s <= curveSteps; s++) pts.push(cubic(cur, p1, p2, p3, s / curveSteps));
      cur = p3;
      lastCtrl = p2;
    } else if (type === 'S') {
      const p1: Point = lastCtrl ? { x: 2 * cur.x - lastCtrl.x, y: 2 * cur.y - lastCtrl.y } : cur;
      const p2 = { x: ox + num(), y: oy + num() };
      const p3 = { x: ox + num(), y: oy + num() };
      for (let s = 1; s <= curveSteps; s++) pts.push(cubic(cur, p1, p2, p3, s / curveSteps));
      cur = p3;
      lastCtrl = p2;
    } else if (type === 'Q') {
      const p1 = { x: ox + num(), y: oy + num() };
      const p2 = { x: ox + num(), y: oy + num() };
      for (let s = 1; s <= curveSteps; s++) pts.push(quad(cur, p1, p2, s / curveSteps));
      cur = p2;
      lastCtrl = p1;
    } else if (type === 'T') {
      const p1: Point = lastCtrl ? { x: 2 * cur.x - lastCtrl.x, y: 2 * cur.y - lastCtrl.y } : cur;
      const p2 = { x: ox + num(), y: oy + num() };
      for (let s = 1; s <= curveSteps; s++) pts.push(quad(cur, p1, p2, s / curveSteps));
      cur = p2;
      lastCtrl = p1;
    } else if (type === 'A') {
      i += 5; // rx ry rotation large-arc sweep
      cur = { x: ox + num(), y: oy + num() };
      pts.push(cur);
      lastCtrl = null;
    } else {
      break; // 不認得的指令：停止，避免無窮迴圈
    }
  }
  return pts;
}

/** 折線總長。 */
export function polylineLength(points: Point[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  }
  return total;
}

/** SVG path 的近似長度（筆順動畫的 strokeDasharray 用）。 */
export function pathLength(d: string): number {
  return polylineLength(samplePath(d));
}

/** 一筆的起點與終點；空路徑回傳 undefined。 */
export function pathEndpoints(d: string): { start: Point; end: Point } | undefined {
  const pts = samplePath(d);
  if (pts.length === 0) return undefined;
  return { start: pts[0], end: pts[pts.length - 1] };
}

// ---------------------------------------------------------------- 座標轉換

/** KanjiVG 的 viewBox 邊長 */
export const KANJIVG_VIEWBOX = 109;
/** 假名筆畫在畫布上佔的比例（對照設計檔的字級：畫布的 0.9 倍時，字面約佔 62%） */
export const GLYPH_FILL = 0.9;

export interface TraceTransform {
  /** viewBox 單位 → 畫布像素 */
  scale: number;
  /** viewBox 原點在畫布上的位置（像素，x、y 相同） */
  offset: number;
}

export function traceTransform(
  canvasSize: number,
  viewBox: number = KANJIVG_VIEWBOX,
  fill: number = GLYPH_FILL,
): TraceTransform {
  const scale = (canvasSize * fill) / viewBox;
  return { scale, offset: (canvasSize - viewBox * scale) / 2 };
}

/** 畫布像素 → viewBox 座標 */
export function toViewBox(p: Point, tf: TraceTransform): Point {
  return { x: (p.x - tf.offset) / tf.scale, y: (p.y - tf.offset) / tf.scale };
}

/** viewBox 座標 → 畫布像素 */
export function fromViewBox(p: Point, tf: TraceTransform): Point {
  return { x: p.x * tf.scale + tf.offset, y: p.y * tf.scale + tf.offset };
}

// ---------------------------------------------------------------- 判定

/** 畫出的線至少要有這麼長（viewBox 單位）才算一筆，輕點不算 */
export const MIN_STROKE_LENGTH = 6;
/** 第一筆方向與標準方向的夾角必須小於這個角度 */
export const MAX_FIRST_STROKE_ANGLE = 90;

/** 至少要畫出的筆畫數：該字筆畫數的一半，四捨五入，至少 1。 */
export function requiredStrokeCount(kanaStrokes: number): number {
  return Math.max(1, Math.round(kanaStrokes / 2));
}

/** 兩個向量的夾角（度，0–180）；任一個長度為 0 時回傳 0（無法判斷，視為通過）。 */
export function angleBetween(a: Point, b: Point): number {
  const la = Math.hypot(a.x, a.y);
  const lb = Math.hypot(b.x, b.y);
  if (la < 1e-6 || lb < 1e-6) return 0;
  const cos = Math.min(1, Math.max(-1, (a.x * b.x + a.y * b.y) / (la * lb)));
  return (Math.acos(cos) * 180) / Math.PI;
}

export type TraceFailReason = 'too-few' | 'direction';

export interface TraceEvaluation {
  passed: boolean;
  /** 有效筆畫數（長度達標的） */
  strokeCount: number;
  required: number;
  /** 第一筆方向夾角（度）；沒有有效筆畫時為 undefined */
  firstStrokeAngle?: number;
  reason?: TraceFailReason;
}

/**
 * 判定描寫是否完成。
 * userStrokes：使用者畫的每一筆（viewBox 座標）。
 * referencePaths：KanjiVG 該字每一筆的 path（strokes.json 的 strokes）。
 * 規則：有效筆畫數 ≥ requiredStrokeCount(標準筆畫數)，且第一筆的起點→終點向量與
 * 標準第一筆的起點→終點向量夾角 < 90 度。
 */
export function evaluateTrace(userStrokes: Stroke[], referencePaths: string[]): TraceEvaluation {
  const required = requiredStrokeCount(referencePaths.length);
  const valid = userStrokes.filter((s) => s.length >= 2 && polylineLength(s) >= MIN_STROKE_LENGTH);
  if (valid.length < required) {
    return { passed: false, strokeCount: valid.length, required, reason: 'too-few' };
  }
  const ref = referencePaths[0] ? pathEndpoints(referencePaths[0]) : undefined;
  if (!ref) return { passed: true, strokeCount: valid.length, required };
  const first = valid[0];
  const userVec = { x: first[first.length - 1].x - first[0].x, y: first[first.length - 1].y - first[0].y };
  const refVec = { x: ref.end.x - ref.start.x, y: ref.end.y - ref.start.y };
  const angle = angleBetween(userVec, refVec);
  if (angle >= MAX_FIRST_STROKE_ANGLE) {
    return {
      passed: false,
      strokeCount: valid.length,
      required,
      firstStrokeAngle: angle,
      reason: 'direction',
    };
  }
  return { passed: true, strokeCount: valid.length, required, firstStrokeAngle: angle };
}
