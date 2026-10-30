// 每日練習的組成與測驗出題（spec 5.1、5.2，docs/architecture.md 第 5 節）。
// 純函式；隨機一律透過可注入的 rng，方便測試。

import { allKana, byId, byRow, ROW_ORDER, seionOrder } from '../data';
import type { Kana, Progress, Script } from '../data/types';
import { isDue, isLearned } from './srs';

export type Rng = () => number;

/** 每次練習預設的新字數 */
export const NEW_PER_SESSION = 3;

export interface DailySession {
  /** 今天要學的新字（依學習順序，最多 3 個） */
  newKanaIds: string[];
  /** 到期複習的字（最久沒複習的在前） */
  reviewKanaIds: string[];
  /** 已學過的字（出題選項取干擾項用；不含今天的新字） */
  learnedIds: string[];
}

export interface DailySessionOptions {
  newPerSession?: number;
  /** 學習順序（Kana id 陣列）；預設為目前階段（currentScript）的清音順序 */
  learningOrder?: string[];
}

export function defaultLearningOrder(script: Script = 'hiragana'): string[] {
  return seionOrder(script).map((k) => k.id);
}

/** 該文字的清音 46 個是否全部已學。 */
export function isSeionLearned(allProgress: readonly Progress[], script: Script): boolean {
  const learned = learnedIdSet([...allProgress]);
  const order = seionOrder(script);
  return order.length > 0 && order.every((k) => learned.has(k.id));
}

/**
 * 目前的學習階段：平假名清音 46 個全部學完前是 'hiragana'，之後是 'katakana'
 * （每日新字、首頁進度都跟著它；到期複習不受影響，兩種假名都會出現）。
 */
export function currentScript(allProgress: readonly Progress[]): Script {
  return isSeionLearned(allProgress, 'hiragana') ? 'katakana' : 'hiragana';
}

/** 學習進度裡已學過（learnedAt 有值）的 Kana id 集合。 */
export function learnedIdSet(allProgress: Progress[]): Set<string> {
  return new Set(allProgress.filter(isLearned).map((p) => p.kanaId));
}

/**
 * 下一批尚未學過的新字（依學習順序）。
 * 沒有指定 order 時用目前階段的順序：平假名學完後自動改從片假名清音取。
 */
export function nextNewKanaIds(
  allProgress: Progress[],
  limit: number = NEW_PER_SESSION,
  order: string[] = defaultLearningOrder(currentScript(allProgress)),
): string[] {
  const learned = learnedIdSet(allProgress);
  return order.filter((id) => !learned.has(id)).slice(0, limit);
}

/** 到期複習的 Kana id，最久沒複習（nextReviewAt 最小）的在前。 */
export function dueKanaIds(allProgress: Progress[], now: number): string[] {
  return allProgress
    .filter((p) => isDue(p, now))
    .sort((a, b) => a.nextReviewAt - b.nextReviewAt || a.kanaId.localeCompare(b.kanaId))
    .map((p) => p.kanaId);
}

/** 今天的練習：新字（最多 3，依序）+ 到期複習。 */
export function buildDailySession(
  allProgress: Progress[],
  now: number,
  options: DailySessionOptions = {},
): DailySession {
  const limit = options.newPerSession ?? NEW_PER_SESSION;
  const order = options.learningOrder ?? defaultLearningOrder(currentScript(allProgress));
  return {
    newKanaIds: nextNewKanaIds(allProgress, limit, order),
    reviewKanaIds: dueKanaIds(allProgress, now),
    learnedIds: [...learnedIdSet(allProgress)],
  };
}

// ---------------------------------------------------------------- 測驗

/**
 * see = 看字選音（C2-08）；hear = 聽音選字（C2-09）；
 * confuse = 易混淆字辨識：播放聲音，選項是該組成員（2～3 個，不補到 4 個）；
 * loanword = 讀外來語（C2-20，舊題型，只為相容舊存檔）：看片假名詞，選中文意思；
 * wordread = 看詞選拼音：看片假名詞，選拼音，答完才顯示意思（不屬於任何假名）；
 * findall = 找出所有：給拼音與聲音，從格子裡勾出所有符合的字（全對才算對）；
 * readseq = 念出一串：給一串假名，從固定的拼音鍵盤依序輸入；
 * seq = 聽音選字串：聽一串 4 個聲音，從 3 個字串裡選出對的；
 * maskhalf = 遮一半猜字：字被遮住一半，選拼音；
 * recall = 默寫自我檢查：看拼音與聲音，自己默寫後翻面核對、自評；
 * spoterr = 抓錯字：一串詞裡有一個字被換成易混淆字，點出來。
 */
export type QuizType =
  | 'see'
  | 'hear'
  | 'confuse'
  | 'loanword'
  | 'wordread'
  | 'findall'
  | 'readseq'
  | 'seq'
  | 'maskhalf'
  | 'recall'
  | 'spoterr';

/** 抓錯字題的內容（見 logic/spotError.ts）。 */
export interface SpotErrorPayload {
  /** 每個詞的字元（已換掉其中一個字）的 Kana id 或原字元（非假名字元不會被換） */
  words: { wordId: string; shown: string[] }[];
  /** 被換的詞與字的位置 */
  wordIndex: number;
  charIndex: number;
  /** 原本的字與換上去的字（Kana id） */
  originalId: string;
  replacementId: string;
}

export interface QuizQuestion {
  /** 題目序號 id，例如 'q-0' */
  id: string;
  /** 題目對應的假名；wordread／loanword 題沒有對應假名，固定為空字串（不更新 SRS） */
  kanaId: string;
  type: QuizType;
  /**
   * 選項。see／hear／confuse／maskhalf 為 Kana id，2～4 個；
   * loanword 為 4 個中文意思；wordread 為 4 個拼音。
   */
  options: string[];
  /** 正確選項（Kana id；loanword 為正確的中文意思；wordread 為正確的拼音）。 */
  answerId: string;
  /** confuse 題（以及易混淆字組快速辨識的題目）所屬的字組 id */
  groupId?: string;
  /** loanword／wordread 題的外來語 id（對應 words.json） */
  wordId?: string;
  /** wordread 題被替換的音節位置 */
  diffIndex?: number;
  /** findall 題的格子（Kana id，依格子順序）與所有目標格的索引 */
  cells?: string[];
  targetIndexes?: number[];
  /** findall 題的成對字（每對是易混淆字） */
  clusters?: string[][];
  /** readseq／seq 題的字串（Kana id，依順序） */
  sequence?: string[];
  /** readseq 題鍵盤上有哪些鍵（Kana id） */
  keyIds?: string[];
  /** seq 題的 3 個候選字串與正確的索引 */
  seqOptions?: string[][];
  answerIndex?: number;
  /** maskhalf 題遮住字的哪一半 */
  mask?: 'left' | 'right' | 'top' | 'bottom';
  /** spoterr 題 */
  spot?: SpotErrorPayload;
}

/** 作答後回報給計分的細節（每個假名各自計分、混淆對）。 */
export interface AnswerDetail {
  /** 選擇題：選到的選項（Kana id）；答錯時記成「把 kanaId 當成 picked」 */
  picked?: string;
  /** 一題有好幾個假名時，每個假名各自的對錯（沒給就只記 kanaId 一個） */
  perKana?: Record<string, boolean>;
  /** 「把 truth 當成 picked」的混淆對 */
  confusions?: { truth: string; picked: string }[];
}

/** 是否為不屬於任何假名的詞題（只計入答對數，不更新 SRS）。 */
export function isLoanwordQuestion(q: Pick<QuizQuestion, 'type'>): boolean {
  return q.type === 'loanword' || q.type === 'wordread';
}

export const QUIZ_OPTION_COUNT = 4;

export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * 挑 3 個干擾項（同文字、同種類）。優先順序：
 * 1. 已學（含今天的新字）的易混淆字
 * 2. 其他已學的字
 * 3. 還沒學的易混淆字
 * 4. 同種類的其他字
 */
export function pickDistractors(
  target: Kana,
  known: ReadonlySet<string>,
  rng: Rng,
  count: number = QUIZ_OPTION_COUNT - 1,
): string[] {
  const pool = allKana.filter(
    (k) => k.script === target.script && k.kind === target.kind && k.id !== target.id,
  );
  const poolIds = new Set(pool.map((k) => k.id));
  const conf = (target.confusableWith ?? []).filter((id) => poolIds.has(id));
  const confSet = new Set(conf);
  const knownConf = conf.filter((id) => known.has(id));
  const unknownConf = conf.filter((id) => !known.has(id));
  const rest = pool.filter((k) => !confSet.has(k.id));
  const knownRest = shuffle(rest.filter((k) => known.has(k.id)), rng).map((k) => k.id);
  const unknownRest = shuffle(rest.filter((k) => !known.has(k.id)), rng).map((k) => k.id);
  return [...shuffle(knownConf, rng), ...knownRest, ...shuffle(unknownConf, rng), ...unknownRest].slice(
    0,
    count,
  );
}

/**
 * 依 session 出題：
 * - 每個新字 2 題（看字選音、聽音選字各 1）
 * - 每個複習字 1 題（題型隨機）
 * - 題目順序打散，且同一個字的兩題不相鄰（可行時）
 * - 選項 4 個，正確選項位置隨機
 */
export function buildQuiz(session: DailySession, rng: Rng = Math.random): QuizQuestion[] {
  const known = new Set([...session.learnedIds, ...session.newKanaIds, ...session.reviewKanaIds]);

  const drafts: QuizDraft[] = [];
  for (const id of session.newKanaIds) {
    for (const type of ['see', 'hear'] as const) {
      const d = makeChoiceQuestion(id, type, known, rng);
      if (d) drafts.push(d);
    }
  }
  for (const id of session.reviewKanaIds) {
    const d = makeChoiceQuestion(id, rng() < 0.5 ? 'see' : 'hear', known, rng);
    if (d) drafts.push(d);
  }

  return arrange(drafts, rng).map((d, i) => ({ id: `q-${i}`, ...d }));
}

export type QuizDraft = Omit<QuizQuestion, 'id'>;

/** 一題 4 選項的看字選音／聽音選字（干擾項規則見 pickDistractors）。找不到字時回傳 undefined。 */
export function makeChoiceQuestion(
  kanaId: string,
  type: 'see' | 'hear',
  known: ReadonlySet<string>,
  rng: Rng,
): QuizDraft | undefined {
  const target = byId(kanaId);
  if (!target) return undefined;
  const options = shuffle([kanaId, ...pickDistractors(target, known, rng)], rng);
  return { kanaId, type, options, answerId: kanaId };
}

/**
 * 打散順序並避免同一個字相鄰：每一步從「不同於上一題」的題目裡隨機選；
 * 若某個字剩下的題數必須立刻交錯才排得完（2c-1 >= 剩餘題數），就強制先選它。
 */
export function arrange<T extends { kanaId: string }>(items: T[], rng: Rng): T[] {
  const remaining = shuffle(items, rng);
  const out: T[] = [];
  while (remaining.length > 0) {
    const last = out[out.length - 1]?.kanaId;
    const counts = new Map<string, number>();
    for (const q of remaining) counts.set(q.kanaId, (counts.get(q.kanaId) ?? 0) + 1);

    let candidates = remaining.filter((q) => q.kanaId !== last);
    if (candidates.length === 0) candidates = remaining; // 無法避免相鄰
    const forced = candidates.filter((q) => 2 * (counts.get(q.kanaId) ?? 0) - 1 >= remaining.length);
    const pool = forced.length > 0 ? forced : candidates;
    const pick = pool[Math.floor(rng() * pool.length)];
    remaining.splice(remaining.indexOf(pick), 1);
    out.push(pick);
  }
  return out;
}

// ---------------------------------------------------------------- 一行學完

/**
 * 這一輪「才湊滿」的行：after 裡整行清音都已學，但 before 還沒有。
 * 回傳 row key（'ka' 等），依五十音順序。
 */
export function completedRows(
  before: Progress[],
  after: Progress[],
  script: Script = 'hiragana',
): string[] {
  const b = learnedIdSet(before);
  const a = learnedIdSet(after);
  return ROW_ORDER.filter((row) => {
    const ids = byRow(row, script).map((k) => k.id);
    return ids.length > 0 && ids.every((id) => a.has(id)) && !ids.every((id) => b.has(id));
  });
}
