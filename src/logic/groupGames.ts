// 易混淆字的「找不同」系列題型：odd（找不同）、all（找出所有）、seq（聽音選字串）。
// 純函式；隨機一律透過注入的 rng。對應 docs/architecture.md 第 9 節。

import { byId } from '../data';
import type { ConfusableGroup } from '../data/confusables';
import { shuffle, type QuizDraft, type QuizQuestion, type Rng } from './session';

export const ODD_CELLS = 9;
export const ALL_CELLS = 12;
export const SEQ_LENGTH = 4;
export const SEQ_OPTION_COUNT = 3;

export type GroupGameType = 'odd' | 'all' | 'seq';
export const GROUP_GAME_TYPES: readonly GroupGameType[] = ['odd', 'all', 'seq'];

/** 組內「查得到資料」的成員（同 confusion.resolvedMembers，避免循環匯入）。 */
function resolvedMembers(group: ConfusableGroup): string[] {
  return group.members.filter((id) => byId(id) !== undefined);
}

function pickOne<T>(items: readonly T[], rng: Rng): T {
  return items[Math.floor(rng() * items.length)];
}

/** 目標字優先從已學成員挑（沒有已學成員才從全部挑），盡量避開 avoid。 */
function pickTarget(
  members: readonly string[],
  learned: ReadonlySet<string>,
  rng: Rng,
  avoid: ReadonlySet<string>,
): string {
  const learnedPool = members.filter((id) => learned.has(id));
  const base = learnedPool.length > 0 ? learnedPool : members;
  const fresh = base.filter((id) => !avoid.has(id));
  return pickOne(fresh.length > 0 ? fresh : base, rng);
}

/** 找不同：9 格，8 個 majority、1 個 target（kanaId = target = 答案）。 */
export function buildOddQuestion(
  group: ConfusableGroup,
  learned: ReadonlySet<string>,
  rng: Rng,
  avoid: ReadonlySet<string> = new Set(),
): QuizDraft {
  const members = resolvedMembers(group);
  const target = pickTarget(members, learned, rng, avoid);
  const majority = pickOne(members.filter((id) => id !== target), rng);
  const index = Math.floor(rng() * ODD_CELLS);
  const cells = Array<string>(ODD_CELLS).fill(majority);
  cells[index] = target;
  return {
    kanaId: target,
    type: 'odd',
    options: [target, majority],
    answerId: target,
    groupId: group.id,
    cells,
    targetIndexes: [index],
  };
}

/** 找出所有：12 格裡有 4～6 個 target，其餘從組內其他字隨機填。 */
export function buildAllQuestion(
  group: ConfusableGroup,
  learned: ReadonlySet<string>,
  rng: Rng,
  avoid: ReadonlySet<string> = new Set(),
): QuizDraft {
  const members = resolvedMembers(group);
  const target = pickTarget(members, learned, rng, avoid);
  const others = members.filter((id) => id !== target);
  const count = 4 + Math.floor(rng() * 3);
  const targetIndexes = shuffle(
    Array.from({ length: ALL_CELLS }, (_, i) => i),
    rng,
  )
    .slice(0, count)
    .sort((a, b) => a - b);
  const set = new Set(targetIndexes);
  const cells = Array.from({ length: ALL_CELLS }, (_, i) => (set.has(i) ? target : pickOne(others, rng)));
  return {
    kanaId: target,
    type: 'all',
    options: [target, ...others],
    answerId: target,
    groupId: group.id,
    cells,
    targetIndexes,
  };
}

/** 兩個字的 4 格序列，保證兩個字都出現。 */
function randomSequence(a: string, b: string, rng: Rng): string[] {
  for (;;) {
    const seq = Array.from({ length: SEQ_LENGTH }, () => (rng() < 0.5 ? a : b));
    if (seq.includes(a) && seq.includes(b)) return seq;
  }
}

/** 聽音選字串：3 個候選字串（錯的由正確答案改 1 格而來），正確位置隨機。 */
export function buildSeqQuestion(
  group: ConfusableGroup,
  learned: ReadonlySet<string>,
  rng: Rng,
  avoid: ReadonlySet<string> = new Set(),
): QuizDraft {
  const members = resolvedMembers(group);
  const first = pickTarget(members, learned, rng, avoid);
  const second = pickOne(members.filter((id) => id !== first), rng);
  const sequence = randomSequence(first, second, rng);
  const key = (s: readonly string[]) => s.join('|');
  const seen = new Set([key(sequence)]);
  const wrong: string[][] = [];
  while (wrong.length < SEQ_OPTION_COUNT - 1) {
    const variant = sequence.slice();
    const pos = Math.floor(rng() * SEQ_LENGTH);
    variant[pos] = variant[pos] === first ? second : first;
    if (seen.has(key(variant))) continue;
    seen.add(key(variant));
    wrong.push(variant);
  }
  const seqOptions = shuffle([sequence, ...wrong], rng);
  return {
    kanaId: first,
    type: 'seq',
    options: [...new Set(sequence)],
    answerId: first,
    groupId: group.id,
    sequence,
    seqOptions,
    answerIndex: seqOptions.findIndex((s) => key(s) === key(sequence)),
  };
}

export function buildGroupGameQuestion(
  type: GroupGameType,
  group: ConfusableGroup,
  learned: ReadonlySet<string>,
  rng: Rng,
  avoid: ReadonlySet<string> = new Set(),
): QuizDraft {
  if (type === 'odd') return buildOddQuestion(group, learned, rng, avoid);
  if (type === 'all') return buildAllQuestion(group, learned, rng, avoid);
  return buildSeqQuestion(group, learned, rng, avoid);
}

/** all 題是否答對：選到的格子恰好等於所有目標格。 */
export function isAllCorrect(selected: readonly number[], targets: readonly number[]): boolean {
  const a = [...new Set(selected)].sort((x, y) => x - y);
  const b = [...targets].sort((x, y) => x - y);
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

/** all 題確認後的統計：漏掉幾個、多選幾個。 */
export function allMistakes(
  selected: readonly number[],
  targets: readonly number[],
): { missed: number; extra: number } {
  const sel = new Set(selected);
  const tar = new Set(targets);
  return {
    missed: [...tar].filter((i) => !sel.has(i)).length,
    extra: [...sel].filter((i) => !tar.has(i)).length,
  };
}
