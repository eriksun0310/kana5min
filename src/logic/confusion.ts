// 易混淆字：字組可用性、依答錯次數排序、加權抽組、confuse 題與自動練習／快速辨識的出題
// （spec 5.3、5.6，docs/architecture.md 第 9 節）。純函式；隨機一律透過注入的 rng。

import { byId } from '../data';
import { confusableGroups, type ConfusableGroup } from '../data/confusables';
import type { Progress } from '../data/types';
import type { ConfusionRecord } from '../db/types';
import { mixLoanwordDrafts } from './loanword';
import { buildGroupGameQuestion, GROUP_GAME_TYPES, type GroupGameType } from './groupGames';
import { pickWordReadDraftsExact, wordReadPool } from './wordRead';
import {
  arrange,
  isSeionLearned,
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
  return isSeionLearned(progress, 'hiragana');
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

/** 沒有答錯紀錄（或同分）時，練習頁「最常搞混的」優先放哪幾組：ぬ・め、る・ろ、シ・ツ（再來才是其他）。 */
export const DEFAULT_TOP_ORDER = ['nume', 'ruro', 'shitsu', 'wanere', 'son'] as const;

/** 練習頁只放最常搞混的前 n 組（預設 3）：答錯次數多的在前，同分依 DEFAULT_TOP_ORDER。不改動原陣列。 */
export function topConfusionGroups(
  groups: readonly ConfusableGroup[],
  counts: ConfusionCounts,
  n: number = 3,
): ConfusableGroup[] {
  const rank = (id: string) => {
    const i = (DEFAULT_TOP_ORDER as readonly string[]).indexOf(id);
    return i < 0 ? DEFAULT_TOP_ORDER.length : i;
  };
  const base = [...groups].sort((a, b) => rank(a.id) - rank(b.id));
  return sortGroupsByMisses(base, counts).slice(0, n);
}

/** 完整目錄的分類（目前只有平假名、片假名兩類；之後補濁點、發音等再加）。 */
export type CatalogTab = 'hiragana' | 'katakana';
export const CATALOG_TABS: readonly { tab: CatalogTab; label: string }[] = [
  { tab: 'hiragana', label: '平假名' },
  { tab: 'katakana', label: '片假名' },
];

/** 目錄裡每個分類各有哪些組（沒有組的分類不會出現在結果裡），順序維持傳入順序。 */
export function groupsByTab(
  groups: readonly ConfusableGroup[],
): { tab: CatalogTab; label: string; groups: ConfusableGroup[] }[] {
  return CATALOG_TABS.map((t) => ({ ...t, groups: groups.filter((g) => g.script === t.tab) })).filter(
    (t) => t.groups.length > 0,
  );
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

/** 一輪 10 題裡，同一種題型最多幾題（可用的題型太少時會自動放寬，見 planTypes）。 */
export const MAX_PER_TYPE = 2;

/**
 * 把 size 題分配給可用的題型：洗牌後輪流分配，各題型題數最多差 1；
 * 上限 cap 在題型夠多時一定成立（可用題型數 × cap >= size），不夠時放寬成剛好分得完。
 */
export function planTypes<T extends string>(
  available: readonly T[],
  size: number,
  rng: Rng,
  cap: number = MAX_PER_TYPE,
): T[] {
  if (available.length === 0) return [];
  const limit = Math.max(cap, Math.ceil(size / available.length));
  const order = shuffle(available, rng);
  const counts = new Map<T, number>();
  const out: T[] = [];
  for (let i = 0; out.length < size && i < size * available.length; i++) {
    const type = order[i % order.length];
    if ((counts.get(type) ?? 0) >= limit) continue;
    counts.set(type, (counts.get(type) ?? 0) + 1);
    out.push(type);
  }
  return out;
}

type AutoType = 'see' | 'hear' | 'findall' | 'readseq' | 'seq' | 'wordread';

/**
 * 自動練習 10 題：看字選音、聽音選字、找出所有、念出一串、聽音選字串、看詞選拼音混合。
 * - 同一種題型最多 2 題（可用題型數 × 2 >= 10 時；題型比較少時平均分配）。
 * - 易混淆字題（找出所有／念出一串／聽音選字串）需要「至少 2 個成員已學」的組；組依權重抽
 *   （答錯多的組出現機率較高）。看詞選拼音需要有可讀的外來語（片假名已學到能讀）。
 * - 看字選音／聽音選字：從已學字各出 1 題。
 * - 打散順序，同一個字不相鄰（可行時）；看詞選拼音插在隨機位置。
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
  const hasWord = wordReadPool(learned).length > 0;
  const available: AutoType[] = ['see', 'hear'];
  if (groups.length > 0) available.push(...GROUP_GAME_TYPES);
  if (hasWord) available.push('wordread');
  const plan = planTypes(available, size, rng);

  const drafts: QuizDraft[] = [];
  const order = shuffle(learnedIds, rng);
  let nextKana = 0;
  const firstType = new Map<string, 'see' | 'hear'>();
  const used = new Set<string>();
  // 看字選音／聽音選字每個已學字最多 2 題（兩種題型各 1）；超出的名額有易混淆字組就改出組題，否則不出
  let choiceLeft = 2 * learnedIds.length;
  const choice = (type: 'see' | 'hear'): boolean => {
    if (choiceLeft <= 0) return false;
    choiceLeft--;
    const id = order[nextKana++ % order.length];
    const prev = firstType.get(id);
    const t: 'see' | 'hear' = prev ? (prev === 'see' ? 'hear' : 'see') : type;
    if (!prev) firstType.set(id, t);
    const d = makeChoiceQuestion(id, t, learned, rng);
    if (d) drafts.push(d);
    return true;
  };

  const game = (type: GroupGameType): boolean => {
    const g = pickConfuseGroup(groups, counts, learned, rng);
    const d = g ? buildGroupGameQuestion(type, g, learned, rng, used) : undefined;
    if (!d) return false;
    used.add(d.kanaId);
    drafts.push(d);
    return true;
  };

  let wordCount = 0;
  for (const type of plan) {
    if (type === 'wordread') wordCount++;
    else if (type === 'see' || type === 'hear') {
      if (!choice(type) && groups.length > 0) game(GROUP_GAME_TYPES[Math.floor(rng() * GROUP_GAME_TYPES.length)]);
    } else if (!game(type)) choice(type === 'findall' ? 'see' : 'hear');
  }

  const arranged = arrange(drafts, rng);
  const wordDrafts = pickWordReadDraftsExact(learned, rng, wordCount);
  if (wordDrafts.length === 0) return arranged.map((d, i) => ({ id: `q-${i}`, ...d }));
  return mixLoanwordDrafts(arranged, wordDrafts, rng);
}

/**
 * 易混淆字對比頁的「快速辨識 10 題」：找出所有、念出一串、聽音選字串、看字選音、聽音選字（組內）輪流出，
 * 同一種題型最多 2 題；每題的目標字在組內輪流（次數相差最多 1、不相鄰）。
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

  // 這一組都視為「看過」：目標字固定為這一題輪到的 id
  const known = new Set(members);
  const probe = GROUP_GAME_TYPES.filter(
    (type) => buildGroupGameQuestion(type, group, known, rng, new Set(), { target: members[0] }) !== undefined,
  );
  const plan = planTypes<GroupGameType | 'see' | 'confuse'>([...probe, 'see', 'confuse'], size, rng);
  const drafts = targets.map((id, i) => {
    const type = plan[i];
    if (type === 'see' || type === 'confuse') return buildGroupQuestion(group, id, type, rng);
    return buildGroupGameQuestion(type, group, known, rng, new Set(), { target: id }) ?? buildGroupQuestion(group, id, 'confuse', rng);
  });

  return arrange(drafts, rng).map((d, i) => ({ id: `q-${i}`, ...d }));
}
