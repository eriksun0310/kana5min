// 遮一半猜字（maskhalf）：字被遮住一半，從拼音選項選出是哪個字。
// 選項只放拼音（不放字形），不認識假名的人沒辦法拿露出的筆畫去對選項；
// 選項分成兩對（目標字與同組的字一對、另一組一對），答案和干擾字結構相同。
// 遮哪一半要「看得出來」：露出的那一半和其他選項的字形要有足夠的差異（用 KanjiVG 筆畫取樣算），
// 否則（例如 ぬ／め 把差異的圈遮掉）換一邊或換題。docs/architecture.md 第 15 節。

import { byId } from '../data';
import { confusableGroups, type ConfusableGroup } from '../data/confusables';
import { strokesOf } from '../data/strokes';
import { samplePath, type Point } from './trace';
import { shuffle, type QuizDraft, type Rng } from './session';

export type MaskSide = 'left' | 'right' | 'top' | 'bottom';
export const MASK_SIDES: readonly MaskSide[] = ['left', 'right', 'top', 'bottom'];

/** 露出的筆畫至少要有多長（viewBox 109 單位），太少等於空白。 */
export const MIN_VISIBLE_LENGTH = 30;
/** 露出的那一半至少要有這麼長的筆畫和其他字不一樣（viewBox 單位）。 */
export const MIN_VISIBLE_DISTANCE = 12;

const SPACING = 2;
/** 兩個字的露出筆畫，距離超過這個值就算「不一樣的筆畫」（筆畫粗約 6） */
const FAR = 7;
const HALF = 109 / 2;

function densify(points: Point[]): Point[] {
  const out: Point[] = [];
  for (let i = 0; i < points.length; i++) {
    out.push(points[i]);
    const next = points[i + 1];
    if (!next) break;
    const n = Math.floor(Math.hypot(next.x - points[i].x, next.y - points[i].y) / SPACING);
    for (let k = 1; k <= n; k++) {
      const t = k / (n + 1);
      out.push({ x: points[i].x + (next.x - points[i].x) * t, y: points[i].y + (next.y - points[i].y) * t });
    }
  }
  return out;
}

/** 該字（KanjiVG 筆畫）取樣出的所有點，間距約 2 單位。 */
export function glyphPoints(char: string): Point[] {
  const data = strokesOf(char);
  return (data?.strokes ?? []).flatMap((d) => densify(samplePath(d)));
}

/** 這一邊「露出」的範圍是否包含點（mask 是被遮住的那一邊）。 */
export function isVisible(p: Point, mask: MaskSide): boolean {
  if (mask === 'left') return p.x >= HALF;
  if (mask === 'right') return p.x <= HALF;
  if (mask === 'top') return p.y >= HALF;
  return p.y <= HALF;
}

export function visiblePoints(char: string, mask: MaskSide): Point[] {
  return glyphPoints(char).filter((p) => isVisible(p, mask));
}

/** from 裡有多少長度（點數 × 間距）離 to 的所有點都超過 FAR 單位：露出的部分「獨有」的筆畫。 */
function uniqueInk(from: readonly Point[], to: readonly Point[]): number {
  let n = 0;
  for (const p of from) {
    let near = false;
    for (const q of to) {
      if (Math.hypot(p.x - q.x, p.y - q.y) <= FAR) {
        near = true;
        break;
      }
    }
    if (!near) n++;
  }
  return n * SPACING;
}

/** 露出的長度（點數 × 間距的近似）。 */
export function visibleLength(char: string, mask: MaskSide): number {
  return visiblePoints(char, mask).length * SPACING;
}

/**
 * 兩個字露出同一半時的差異：其中一個字有多長的筆畫，在另一個字露出的部分附近（FAR 以內）找不到；
 * 雙向取較大者。兩邊露出的部分幾乎一樣時接近 0。
 */
export function visibleDistance(a: string, b: string, mask: MaskSide): number {
  const pa = visiblePoints(a, mask);
  const pb = visiblePoints(b, mask);
  return Math.max(uniqueInk(pa, pb), uniqueInk(pb, pa));
}

const cache = new Map<string, MaskSide[]>();

/** 遮住哪幾邊，目標字露出的部分仍能和 rivals 區分（長度夠、差異夠）。 */
export function decisiveMasks(target: string, rivals: readonly string[]): MaskSide[] {
  const key = `${target}|${[...rivals].sort().join(',')}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const res = MASK_SIDES.filter(
    (side) =>
      visibleLength(target, side) >= MIN_VISIBLE_LENGTH &&
      rivals.every((r) => visibleDistance(target, r, side) >= MIN_VISIBLE_DISTANCE),
  );
  cache.set(key, res);
  return res;
}

function pickOne<T>(items: readonly T[], rng: Rng): T {
  return items[Math.floor(rng() * items.length)];
}

export interface MaskHalfOptions {
  target?: string;
  groups?: readonly ConfusableGroup[];
}

/**
 * 遮一半猜字：選項 = 兩對拼音（目標字＋同組另一個、另一組一對），4 個，洗牌。
 * 遮住的那邊從「看得出來」的邊裡隨機挑；湊不出時回傳 undefined。
 */
export function buildMaskHalfQuestion(
  group: ConfusableGroup,
  learned: ReadonlySet<string>,
  rng: Rng,
  avoid: ReadonlySet<string> = new Set(),
  opts: MaskHalfOptions = {},
): QuizDraft | undefined {
  const members = group.members.filter((id) => byId(id) !== undefined);
  const others = (opts.groups ?? confusableGroups).filter(
    (g) => g.id !== group.id && g.script === group.script && g.members.filter((id) => byId(id)).length >= 2,
  );
  if (members.length < 2 || others.length === 0) return undefined;
  const learnedPool = members.filter((id) => learned.has(id));
  const base = opts.target ? [opts.target] : learnedPool.length > 0 ? learnedPool : members;
  const fresh = base.filter((id) => !avoid.has(id));
  const target = pickOne(fresh.length > 0 ? fresh : base, rng);
  const partner = pickOne(members.filter((id) => id !== target), rng);
  for (const g of shuffle(others, rng)) {
    // 同一個字可能屬於好幾組：干擾字不能是目標字或同組的字，選項才不會重複
    const decoy = shuffle(g.members.filter((id) => byId(id) && !members.includes(id)), rng).slice(0, 2);
    if (decoy.length < 2) continue;
    const charOf = (id: string) => byId(id)!.char;
    const sides = decisiveMasks(charOf(target), [partner, ...decoy].map(charOf));
    if (sides.length === 0) continue;
    return {
      kanaId: target,
      type: 'maskhalf',
      options: shuffle([target, partner, ...decoy], rng),
      answerId: target,
      groupId: group.id,
      mask: pickOne(sides, rng),
      clusters: shuffle([[target, partner], decoy], rng),
    };
  }
  return undefined;
}
