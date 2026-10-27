// 易混淆字：字組可用性、依答錯次數排序、加權抽組、confuse 題與自動練習／快速辨識的出題
// （spec 5.3、5.6，docs/architecture.md 第 9 節）。純函式；隨機一律透過注入的 rng。

import { byId, seionOrder } from '../data';
import { confusableGroups, type ConfusableGroup } from '../data/confusables';
import type { Progress } from '../data/types';
import type { ConfusionRecord } from '../db/types';
import {
  arrange,
  learnedIdSet,
  makeChoiceQuestion,
  shuffle,
  type QuizDraft,
  type QuizQuestion,
  type Rng,
} from './session';

/** 自動練習與快速辨識的題數 */
export const AUTO_PRACTICE_SIZE = 10;

/** groupId → 答錯次數；沒有紀錄的組視為 0 */
export type ConfusionCounts = Record<string, number>;

export function confusionCounts(records: readonly ConfusionRecord[]): ConfusionCounts {
  const out: ConfusionCounts = {};
  for (const r of records) out[r.groupId] = r.wrongCount;
  return out;
}

/** 平假名清音 46 個全部學過 → 片假名解鎖（第三階段共用）。 */
export function isKatakanaUnlocked(progress: readonly Progress[]): boolean {
  const learned = learnedIdSet([...progress]);
  const order = seionOrder('hiragana');
  return order.length > 0 && order.every((k) => learned.has(k.id));
}

/** 組內「查得到資料」的成員（片假名資料第三階段才有，查不到的略過）。 */
export function resolvedMembers(group: ConfusableGroup): string[] {
  return group.members.filter((id) => byId(id) !== undefined);
}

/**
 * 目前可用的字組：成員至少 2 個查得到資料；片假名組要等片假名解鎖。
 * 順序維持預設順序。
 */
export function availableGroups(
  progress: readonly Progress[],
  groups: readonly ConfusableGroup[] = confusableGroups,
): ConfusableGroup[] {
  const unlocked = isKatakanaUnlocked(progress);
  return groups.filter(
    (g) => resolvedMembers(g).length >= 2 && (g.script !== 'katakana' || unlocked),
  );
}

/** 依答錯次數由大到小排序；同分維持傳入順序（穩定排序）。不改動原陣列。 */
export function sortGroupsByMisses(
  groups: readonly ConfusableGroup[],
  counts: ConfusionCounts,
): ConfusableGroup[] {
  return groups
    .map((g, i) => ({ g, i, n: counts[g.id] ?? 0 }))
    .sort((a, b) => b.n - a.n || a.i - b.i)
    .map((x) => x.g);
}

/** 某個字答錯時要累計答錯次數的字組（通常 0 或 1 組）。 */
export function groupsForWrongAnswer(
  targetKanaId: string,
  groups: readonly ConfusableGroup[] = confusableGroups,
): ConfusableGroup[] {
  return groups.filter((g) => g.members.includes(targetKanaId));
}

function learnedMembers(group: ConfusableGroup, learned: ReadonlySet<string>): string[] {
  return resolvedMembers(group).filter((id) => learned.has(id));
}

/** 至少 2 個成員已學的組才能出 confuse 題。 */
export function isConfuseEligible(group: ConfusableGroup, learned: ReadonlySet<string>): boolean {
  return learnedMembers(group, learned).length >= 2;
}

/**
 * 加權抽出一組：weight = 1 + 答錯次數，只考慮「至少 2 個成員已學」的組。
 * 沒有符合的組時回傳 undefined。
 */
export function pickConfuseGroup(
  groups: readonly ConfusableGroup[],
  counts: ConfusionCounts,
  learned: ReadonlySet<string>,
  rng: Rng,
): ConfusableGroup | undefined {
  const eligible = groups.filter((g) => isConfuseEligible(g, learned));
  if (eligible.length === 0) return undefined;
  const weights = eligible.map((g) => 1 + Math.max(0, counts[g.id] ?? 0));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < eligible.length; i++) {
    r -= weights[i];
    if (r < 0) return eligible[i];
  }
  return eligible[eligible.length - 1];
}

/** 一題以該組成員為選項的題目（confuse 或快速辨識的 see）；選項 2～3 個，順序隨機。 */
export function buildGroupQuestion(
  group: ConfusableGroup,
  targetId: string,
  type: 'confuse' | 'see',
  rng: Rng,
): QuizDraft {
  const members = resolvedMembers(group);
  return {
    kanaId: targetId,
    type,
    options: shuffle(members, rng),
    answerId: targetId,
    groupId: group.id,
  };
}

/**
 * 一題 confuse：目標字優先從已學成員挑（沒有已學成員才從全部挑）。
 * avoid = 已經出過的目標，盡量避開（沒得避開時才重複）。
 */
export function buildConfuseQuestion(
  group: ConfusableGroup,
  learned: ReadonlySet<string>,
  rng: Rng,
  avoid: ReadonlySet<string> = new Set(),
): QuizDraft {
  const learnedPool = learnedMembers(group, learned);
  const base = learnedPool.length > 0 ? learnedPool : resolvedMembers(group);
  const fresh = base.filter((id) => !avoid.has(id));
  const pool = fresh.length > 0 ? fresh : base;
  const target = pool[Math.floor(rng() * pool.length)];
  return buildGroupQuestion(group, target, 'confuse', rng);
}

/**
 * 自動練習 10 題：see／hear／confuse 混合。
 * - 有「至少 2 個成員已學」的組時，confuse 約 2～4 題（組依權重抽，答錯多的組出現機率較高）；
 *   沒有時不出 confuse。
 * - 其餘為看字選音／聽音選字：從已學字各出 1 題；已學字不足時同一個字最多 2 題（兩種題型），
 *   此時不足的題數由 confuse 補滿（可補時），否則總題數少於 10。
 * - 打散順序，同一個字不相鄰（可行時）。
 * 沒有任何已學字時回傳 null。
 */
export function buildAutoPractice10(
  allProgress: readonly Progress[],
  counts: ConfusionCounts,
  rng: Rng = Math.random,
  size: number = AUTO_PRACTICE_SIZE,
): QuizQuestion[] | null {
  const learned = learnedIdSet([...allProgress]);
  const learnedIds = [...learned].filter((id) => byId(id) !== undefined);
  if (learnedIds.length === 0) return null;

  const groups = availableGroups(allProgress).filter((g) => isConfuseEligible(g, learned));
  const hasConfuse = groups.length > 0;
  const wantConfuse = hasConfuse ? Math.min(size, 2 + Math.floor(rng() * 3)) : 0;
  const choiceCount = Math.min(size - wantConfuse, 2 * learnedIds.length);
  const confuseCount = hasConfuse ? size - choiceCount : 0;

  const drafts: QuizDraft[] = [];

  // 看字選音／聽音選字：已學字洗牌後依序取；超過一輪的字改出另一種題型
  const order = shuffle(learnedIds, rng);
  const firstType = new Map<string, 'see' | 'hear'>();
  for (let i = 0; i < choiceCount; i++) {
    const id = order[i % order.length];
    const prev = firstType.get(id);
    const type: 'see' | 'hear' = prev ? (prev === 'see' ? 'hear' : 'see') : rng() < 0.5 ? 'see' : 'hear';
    if (!prev) firstType.set(id, type);
    const d = makeChoiceQuestion(id, type, learned, rng);
    if (d) drafts.push(d);
  }

  const used = new Set<string>();
  for (let i = 0; i < confuseCount; i++) {
    const g = pickConfuseGroup(groups, counts, learned, rng);
    if (!g) break;
    const d = buildConfuseQuestion(g, learned, rng, used);
    used.add(d.kanaId);
    drafts.push(d);
  }

  return arrange(drafts, rng).map((d, i) => ({ id: `q-${i}`, ...d }));
}

/**
 * 易混淆字對比頁的「快速辨識 10 題」：只出該組的 confuse 題與看字選音題，選項限該組成員。
 * 目標字在組內輪流（次數相差最多 1、不相鄰），每個目標的題型交替，所以 confuse 與 see 各約一半。
 * 組成員不足 2 個（資料查不到）時回傳空陣列。
 */
export function buildQuickConfuse10(
  group: ConfusableGroup,
  rng: Rng = Math.random,
  size: number = AUTO_PRACTICE_SIZE,
): QuizQuestion[] {
  const members = resolvedMembers(group);
  if (members.length < 2) return [];

  const targets: string[] = [];
  while (targets.length < size) {
    const chunk = shuffle(members, rng);
    // 相鄰不重複：新一輪的第一個和上一題相同時，和第二個對調
    if (targets.length > 0 && chunk[0] === targets[targets.length - 1]) {
      [chunk[0], chunk[1]] = [chunk[1], chunk[0]];
    }
    targets.push(...chunk.slice(0, size - targets.length));
  }

  const startType = new Map<string, 'confuse' | 'see'>();
  const seen = new Map<string, number>();
  const drafts = targets.map((id) => {
    if (!startType.has(id)) startType.set(id, rng() < 0.5 ? 'confuse' : 'see');
    const n = seen.get(id) ?? 0;
    seen.set(id, n + 1);
    const first = startType.get(id)!;
    const type = n % 2 === 0 ? first : first === 'confuse' ? 'see' : 'confuse';
    return buildGroupQuestion(group, id, type, rng);
  });

  return arrange(drafts, rng).map((d, i) => ({ id: `q-${i}`, ...d }));
}
