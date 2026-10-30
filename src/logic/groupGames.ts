// 易混淆字的題型引擎：找出所有（findall）、念出一串（readseq）、聽音選字串（seq）。
// 純函式；隨機一律透過注入的 rng。對應 docs/architecture.md 第 9 節。
//
// 設計原則「作弊測試」：完全不認識假名的人，不能靠猜或排除法答對。所以每種題型都讓
// 「看得到的結構」對每個選項完全對稱：
// - findall：每一種字形出現的次數相同（不能靠「出現最多次」猜）；格子由成對的易混淆字組成，
//   答案字和干擾字一樣都在「成對」裡（不能靠「只有相似字才是答案」猜）；格子位置全部洗牌。
// - readseq：用固定位置的拼音鍵盤輸入，鍵盤內容只取決於已學的字，不取決於題目。
// - seq：三個選項是同一組字的三種排列（兩兩距離相同、字的組成相同），
//   所以聽到的聲音型態（哪幾個聲音重複）不能用來配對，也沒有「和其他選項差最多」的選項。
// 測試見 src/logic/__tests__/cheatTest.test.ts。

import { byId } from '../data';
import { confusableGroups, type ConfusableGroup } from '../data/confusables';
import { shuffle, type QuizDraft, type Rng } from './session';

export const READSEQ_LENGTHS = [3, 4, 5] as const;
export const SEQ_LENGTH = 4;
export const SEQ_OPTION_COUNT = 3;
export const FINDALL_MULTIPLICITIES = [1, 2] as const;

export type GroupGameType = 'findall' | 'readseq' | 'seq';
export const GROUP_GAME_TYPES: readonly GroupGameType[] = ['findall', 'readseq', 'seq'];

/** 組內「查得到資料」的成員（同 confusion.resolvedMembers，避免循環匯入）。 */
function resolvedMembers(group: ConfusableGroup): string[] {
  return group.members.filter((id) => byId(id) !== undefined);
}

function pickOne<T>(items: readonly T[], rng: Rng): T {
  return items[Math.floor(rng() * items.length)];
}

/** 目標字優先從已學成員挑（沒有已學成員才從全部挑），盡量避開 avoid。 */
export function pickTarget(
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

/** 同一種文字、有 2 個以上成員的其他字組（干擾用）。 */
function otherGroups(group: ConfusableGroup, all: readonly ConfusableGroup[]): ConfusableGroup[] {
  return all.filter((g) => g.id !== group.id && g.script === group.script && resolvedMembers(g).length >= 2);
}

export interface GameOptions {
  /** 指定目標字（快速辨識輪流出題用）；沒指定就依 learned／avoid 挑 */
  target?: string;
  /** 干擾字組的來源（測試用），預設全部易混淆字組 */
  groups?: readonly ConfusableGroup[];
}

// ---------------------------------------------------------------- 找出所有

/**
 * 找出所有：題目給拼音＋聲音，不顯示字形也不顯示答案數量。
 * 格子 = K 組「成對的易混淆字」（目標字所在的一對 + 其他字組各一對），每個字形各出現 m 次（m 隨機 1 或 2），
 * 位置全部洗牌。目標字是其中一個字形的全部格子；全部選對才算對。
 * 沒有其他字組可以湊成對時回傳 undefined。
 */
export function buildFindAllQuestion(
  group: ConfusableGroup,
  learned: ReadonlySet<string>,
  rng: Rng,
  avoid: ReadonlySet<string> = new Set(),
  opts: GameOptions = {},
): QuizDraft | undefined {
  const members = resolvedMembers(group);
  const others = otherGroups(group, opts.groups ?? confusableGroups);
  if (members.length < 2 || others.length === 0) return undefined;
  const target = opts.target ?? pickTarget(members, learned, rng, avoid);
  const partner = pickOne(members.filter((id) => id !== target), rng);
  const clusters: string[][] = [[target, partner]];
  // 最多再加 2 組；字組數不夠就少放
  for (const g of shuffle(others, rng).slice(0, 2)) {
    clusters.push(shuffle(resolvedMembers(g), rng).slice(0, 2));
  }
  const m = pickOne(FINDALL_MULTIPLICITIES, rng);
  const cells = shuffle(
    clusters.flat().flatMap((id) => Array<string>(m).fill(id)),
    rng,
  );
  const targetIndexes = cells.flatMap((id, i) => (id === target ? [i] : []));
  return {
    kanaId: target,
    type: 'findall',
    options: [...new Set(cells)],
    answerId: target,
    groupId: group.id,
    cells,
    targetIndexes,
    clusters: shuffle(clusters, rng),
  };
}

/** findall 是否答對：選到的格子恰好等於所有目標格。 */
export function isAllCorrect(selected: readonly number[], targets: readonly number[]): boolean {
  const a = [...new Set(selected)].sort((x, y) => x - y);
  const b = [...targets].sort((x, y) => x - y);
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

/** findall 確認後的統計：漏掉幾個、多選幾個。 */
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

/** findall 作答後的計分：目標字對錯；選到的非目標字各記一筆「把目標當成它」的混淆。 */
export function scoreFindAll(
  cells: readonly string[],
  selected: readonly number[],
  targets: readonly number[],
  targetId: string,
): { correct: boolean; confusions: { truth: string; picked: string }[] } {
  const picked = new Set(selected.map((i) => cells[i]).filter((id) => id !== targetId));
  return {
    correct: isAllCorrect(selected, targets),
    confusions: [...picked].map((id) => ({ truth: targetId, picked: id })),
  };
}

// ---------------------------------------------------------------- 念出一串

/** 拼音鍵盤用的鍵：已學的清音 + 這一題用到的字（依傳入順序去重）。 */
export function keyboardKeyIds(
  learned: ReadonlySet<string>,
  sequence: readonly string[],
  script: 'hiragana' | 'katakana',
): string[] {
  const out = new Set<string>();
  for (const id of learned) {
    const k = byId(id);
    if (k && k.script === script && k.kind === 'seion') out.add(id);
  }
  for (const id of sequence) out.add(id);
  return [...out];
}

/**
 * 念出一串：給一串 3～5 個假名（只用同一組的成員，至少 2 種），使用者從固定位置的拼音鍵盤依序輸入。
 * 字串用的字優先取已學成員；鍵盤內容只取決於已學的字（不取決於題目）。
 */
export function buildReadSeqQuestion(
  group: ConfusableGroup,
  learned: ReadonlySet<string>,
  rng: Rng,
  avoid: ReadonlySet<string> = new Set(),
  opts: GameOptions = {},
): QuizDraft | undefined {
  const members = resolvedMembers(group);
  if (members.length < 2) return undefined;
  const target = opts.target ?? pickTarget(members, learned, rng, avoid);
  const learnedMembers = members.filter((id) => learned.has(id) || id === target);
  const alphabet = learnedMembers.length >= 2 ? learnedMembers : members;
  const length = pickOne(READSEQ_LENGTHS, rng);
  let sequence: string[];
  for (;;) {
    sequence = Array.from({ length }, () => pickOne(alphabet, rng));
    // 目標字一定出現，且至少兩種字
    if (sequence.includes(target) && new Set(sequence).size >= 2) break;
  }
  const script = group.script;
  return {
    kanaId: target,
    type: 'readseq',
    options: [...new Set(sequence)],
    answerId: target,
    groupId: group.id,
    sequence,
    keyIds: keyboardKeyIds(learned, sequence, script),
  };
}

/** readseq 作答後的計分：每個字各自對錯（同一個字出現多次要全對）；打錯的位置記「把它當成打的那個字」。 */
export function scoreReadSeq(
  sequence: readonly string[],
  typed: readonly string[],
): {
  correct: boolean;
  perKana: Record<string, boolean>;
  confusions: { truth: string; picked: string }[];
} {
  const perKana: Record<string, boolean> = {};
  const confusions: { truth: string; picked: string }[] = [];
  sequence.forEach((id, i) => {
    const ok = byId(typed[i] ?? '')?.romaji === byId(id)?.romaji;
    perKana[id] = (perKana[id] ?? true) && ok;
    if (!ok && typed[i]) confusions.push({ truth: id, picked: typed[i] });
  });
  return { correct: Object.values(perKana).every(Boolean), perKana, confusions };
}

// ---------------------------------------------------------------- 聽音選字串

/**
 * 聽音選字串：聽一串 4 個不重複的字的聲音，從 3 個字串裡選出對的。
 * 4 個字 = 目標字、同組的另一個字、另外兩個其他字組的字。其中 3 個位置上，三個選項是同一組字的
 * 三種輪換（abc／bca／cab），第 4 個位置三個選項都一樣。所以兩兩距離都是 3、字的組成完全相同。
 * 湊不出 4 個不重複的字時回傳 undefined。
 */
export function buildSeqQuestion(
  group: ConfusableGroup,
  learned: ReadonlySet<string>,
  rng: Rng,
  avoid: ReadonlySet<string> = new Set(),
  opts: GameOptions = {},
): QuizDraft | undefined {
  const members = resolvedMembers(group);
  if (members.length < 2) return undefined;
  const target = opts.target ?? pickTarget(members, learned, rng, avoid);
  const partner = pickOne(members.filter((id) => id !== target), rng);
  const pool = otherGroups(group, opts.groups ?? confusableGroups).flatMap(resolvedMembers);
  const known = (id: string) => (learned.has(id) ? 0 : 1);
  // 干擾字優先已學的；最不熟的那個放在「三個選項都一樣」的位置
  const extras = shuffle(pool, rng).sort((a, b) => known(a) - known(b)).slice(0, 2);
  if (extras.length < 2) return undefined;
  const fixedGlyph = extras[1];
  const rotating = shuffle([target, partner, extras[0]], rng);

  const order = shuffle([0, 1, 2, 3], rng);
  const fixedPos = order[0];
  const [p1, p2, p3] = order.slice(1);
  const sequence: string[] = Array<string>(SEQ_LENGTH).fill('');
  sequence[fixedPos] = fixedGlyph;
  [p1, p2, p3].forEach((p, i) => (sequence[p] = rotating[i]));

  const rotate = (shift: number) => {
    const v = sequence.slice();
    const ps = [p1, p2, p3];
    ps.forEach((p, i) => (v[p] = sequence[ps[(i + shift) % 3]]));
    return v;
  };
  const seqOptions = shuffle([sequence, rotate(1), rotate(2)], rng);
  const key = (s: readonly string[]) => s.join('|');
  return {
    kanaId: target,
    type: 'seq',
    options: [...sequence],
    answerId: target,
    groupId: group.id,
    sequence,
    seqOptions,
    answerIndex: seqOptions.findIndex((s) => key(s) === key(sequence)),
  };
}

/** seq 作答後的計分：選對 → 輪換的三個字都算對；選錯 → 每個不一樣的位置，真正的字記錯、選到的字記一筆混淆。 */
export function scoreSeq(
  sequence: readonly string[],
  picked: readonly string[],
): {
  correct: boolean;
  perKana: Record<string, boolean>;
  confusions: { truth: string; picked: string }[];
} {
  const perKana: Record<string, boolean> = {};
  const confusions: { truth: string; picked: string }[] = [];
  sequence.forEach((id, i) => {
    if (picked[i] === id) return;
    perKana[id] = false;
    confusions.push({ truth: id, picked: picked[i] });
  });
  const correct = confusions.length === 0;
  if (correct) for (const id of sequence) perKana[id] = true;
  return { correct, perKana, confusions };
}

export function buildGroupGameQuestion(
  type: GroupGameType,
  group: ConfusableGroup,
  learned: ReadonlySet<string>,
  rng: Rng,
  avoid: ReadonlySet<string> = new Set(),
  opts: GameOptions = {},
): QuizDraft | undefined {
  if (type === 'findall') return buildFindAllQuestion(group, learned, rng, avoid, opts);
  if (type === 'readseq') return buildReadSeqQuestion(group, learned, rng, avoid, opts);
  return buildSeqQuestion(group, learned, rng, avoid, opts);
}
