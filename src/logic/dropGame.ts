// 掉字歸類（正式版）的純邏輯：階段、選字、出題順序、過關判斷、計分事件。
// 畫面與手勢在 app/drop/；這裡不碰 React，方便單元測試。

import { byId } from '../data';
import type { ConfusionCounts } from './confusion';
import { counterpartId } from './counterpart';
import { shuffle } from './session';

type Rng = () => number;

/** 一局一關出幾個字 */
export const ROUND_SIZE = 12;
/** 一關最多錯幾個還算過關（掉到底沒歸類也算錯） */
export const MAX_WRONG_TO_PASS = 1;
export const MIN_PICK = 3;
export const MAX_PICK = 6;

export type DropFace = 'hiragana' | 'katakana' | 'romaji';

export interface DropStage {
  id: 'hira-romaji' | 'romaji-hira' | 'kata-romaji' | 'romaji-kata' | 'kata-hira' | 'hira-kata';
  /** 掉下來的是什麼（假名或拼音） */
  fall: DropFace;
  /** 籃子上寫什麼 */
  basket: DropFace;
  /** 例如「片假名 → 平假名」 */
  title: string;
}

/** 六個階段，由簡單到難依序進階（單一種文字、對拼音在前，兩種文字互相對照在最後）。 */
export const DROP_STAGES: readonly DropStage[] = [
  { id: 'hira-romaji', fall: 'hiragana', basket: 'romaji', title: '平假名 → 拼音' },
  { id: 'romaji-hira', fall: 'romaji', basket: 'hiragana', title: '拼音 → 平假名' },
  { id: 'kata-romaji', fall: 'katakana', basket: 'romaji', title: '片假名 → 拼音' },
  { id: 'romaji-kata', fall: 'romaji', basket: 'katakana', title: '拼音 → 片假名' },
  { id: 'kata-hira', fall: 'katakana', basket: 'hiragana', title: '片假名 → 平假名' },
  { id: 'hira-kata', fall: 'hiragana', basket: 'katakana', title: '平假名 → 片假名' },
];

/** 片假名還沒解鎖（或選的字沒有片假名）時只玩平假名的兩關：平假名 → 拼音、拼音 → 平假名。 */
export function stagesFor(katakanaReady: boolean): DropStage[] {
  return katakanaReady
    ? [...DROP_STAGES]
    : DROP_STAGES.filter((s) => s.id === 'hira-romaji' || s.id === 'romaji-hira');
}

/** 這一關考的是哪種文字的字形：掉下來是假名就是它，掉下來是拼音就看籃子（計分用）。 */
export function stageScript(stage: DropStage): 'hiragana' | 'katakana' {
  if (stage.fall !== 'romaji') return stage.fall;
  return stage.basket === 'katakana' ? 'katakana' : 'hiragana';
}

/**
 * 選字的單位是「音」，用平假名的 Kana id 代表（例如 'h-shi' 代表 し／シ／shi）。
 * 回傳這個音在某種文字下的 Kana id；片假名查不到回傳 undefined。
 */
export function idIn(syllable: string, script: 'hiragana' | 'katakana'): string | undefined {
  if (script === 'hiragana') return byId(syllable) ? syllable : undefined;
  return counterpartId(syllable);
}

/** 這個音在某種呈現下要顯示的文字（字或拼音）。 */
export function faceOf(syllable: string, face: DropFace): string {
  if (face === 'romaji') return byId(syllable)?.romaji ?? syllable;
  const id = idIn(syllable, face);
  return (id && byId(id)?.char) || '';
}

/** 選的每個音都查得到片假名對應字，才能玩含片假名的階段。 */
export function hasKatakana(selection: readonly string[]): boolean {
  return selection.every((s) => idIn(s, 'katakana') !== undefined);
}

/** 這組字在目前狀態下可以玩哪幾個階段。 */
export function availableStages(selection: readonly string[], katakanaUnlocked: boolean): DropStage[] {
  return stagesFor(katakanaUnlocked && hasKatakana(selection));
}

/** 有學過（平假名或片假名任一種）的音，回傳平假名 id，不重複、依五十音表順序。 */
export function learnedSyllables(learnedKanaIds: readonly string[], order: readonly string[]): string[] {
  const set = new Set<string>();
  for (const id of learnedKanaIds) {
    const k = byId(id);
    if (!k) continue;
    if (k.script === 'hiragana') set.add(k.id);
    else {
      const h = counterpartId(k.id);
      if (h) set.add(h);
    }
  }
  return order.filter((id) => set.has(id));
}

/** 點選：已選就取消，沒選就加入；超過上限不加。 */
export function toggleSelection(selection: readonly string[], id: string): string[] {
  if (selection.includes(id)) return selection.filter((x) => x !== id);
  if (selection.length >= MAX_PICK) return [...selection];
  return [...selection, id];
}

export function canStart(selection: readonly string[]): boolean {
  return selection.length >= MIN_PICK && selection.length <= MAX_PICK;
}

/** 隨機：從學過的音抽 n 個（不夠 MIN_PICK 回傳空陣列）。 */
export function randomSelection(learned: readonly string[], rng: Rng, n = 4): string[] {
  if (learned.length < MIN_PICK) return [];
  return shuffle(learned, rng).slice(0, Math.min(n, learned.length, MAX_PICK));
}

export interface DropPreset {
  id: string;
  label: string;
  /** 平假名 id */
  syllables: string[];
  /** 這個推薦對應的易混淆組，用來依答錯次數排序、也給對比頁找 */
  groupIds: string[];
}

export const DROP_PRESETS: readonly DropPreset[] = [
  { id: 'nume-wanere', label: 'ぬ・め・わ・ね・れ', syllables: ['h-nu', 'h-me', 'h-wa', 'h-ne', 'h-re'], groupIds: ['nume', 'wanere'] },
  { id: 'ruro-nume', label: 'る・ろ・ぬ・め', syllables: ['h-ru', 'h-ro', 'h-nu', 'h-me'], groupIds: ['ruro', 'nume'] },
  { id: 'shitsu-son', label: 'し・つ・そ・ん', syllables: ['h-shi', 'h-tsu', 'h-so', 'h-n'], groupIds: ['shitsu', 'son'] },
];

/** 預設順序：片假名組放在最前面最能鑑別，其次是平假名最常搞混的 */
const DEFAULT_PRESET_ORDER = ['shitsu-son', 'ruro-nume', 'nume-wanere'];

/** 預設推薦裡只留「已學的音至少 MIN_PICK 個」的，並把沒學過的音拿掉。 */
export function playableSelection(preset: DropPreset, learned: ReadonlySet<string>): string[] | undefined {
  const sel = preset.syllables.filter((s) => learned.has(s));
  return sel.length >= MIN_PICK ? sel : undefined;
}

/** 推薦三組：依對應易混淆組的答錯次數由多到少（同分用預設順序），只放玩得起來的。 */
export function recommendedPresets(
  learned: ReadonlySet<string>,
  counts: ConfusionCounts,
  n = 3,
): { preset: DropPreset; selection: string[] }[] {
  const score = (p: DropPreset) => p.groupIds.reduce((sum, g) => sum + (counts[g] ?? 0), 0);
  return [...DROP_PRESETS]
    .sort((a, b) => score(b) - score(a) || DEFAULT_PRESET_ORDER.indexOf(a.id) - DEFAULT_PRESET_ORDER.indexOf(b.id))
    .flatMap((p) => {
      const selection = playableSelection(p, learned);
      return selection ? [{ preset: p, selection }] : [];
    })
    .slice(0, n);
}

/** 對比頁「用這一組玩掉字」：該易混淆組所屬的推薦字組；學過的字不夠就回傳 undefined。 */
export function presetForGroup(
  groupId: string,
  learned: ReadonlySet<string>,
): { preset: DropPreset; selection: string[] } | undefined {
  const preset = DROP_PRESETS.find((p) => p.groupIds.includes(groupId));
  if (!preset) return undefined;
  const selection = playableSelection(preset, learned);
  return selection ? { preset, selection } : undefined;
}

/**
 * 一關的出題順序（存「選字陣列的索引」）：每個字出現次數盡量一樣，順序打散，不連續出現同一個。
 * 不看過去的答對錯，所以不會因為「某個字一直沒出現」洩漏答案。
 */
export function buildRound(selectionSize: number, rng: Rng, size: number = ROUND_SIZE): number[] {
  // 餘數分給哪幾個字隨機，不固定給前面的字
  const left: number[] = new Array(selectionSize).fill(Math.floor(size / selectionSize));
  shuffle(Array.from({ length: selectionSize }, (_, i) => i), rng)
    .slice(0, size % selectionSize)
    .forEach((i) => (left[i] += 1));
  const out: number[] = [];
  for (let n = 0; n < size; n++) {
    const prev = out[n - 1];
    const options = left.map((c, i) => ({ c, i })).filter((o) => o.c > 0 && o.i !== prev);
    // 剩下的全是同一個字（只可能發生在最後）就只能接上去
    const pool = options.length > 0 ? options : left.map((c, i) => ({ c, i })).filter((o) => o.c > 0);
    const max = Math.max(...pool.map((o) => o.c));
    const top = pool.filter((o) => o.c === max);
    const pick = top[Math.floor(rng() * top.length)].i;
    out.push(pick);
    left[pick] -= 1;
  }
  return out;
}

/** 籃子順序：每一關重新打散，避免靠位置記答案。 */
export function basketOrder(n: number, rng: Rng): number[] {
  return shuffle(Array.from({ length: n }, (_, i) => i), rng);
}

/** 錯的個數（歸錯 + 掉到底）不超過上限就算過關；一關要全部出完才判斷。 */
export function isPassed(wrong: number): boolean {
  return wrong <= MAX_WRONG_TO_PASS;
}

export interface DropEvent {
  /** 掉下來的音（平假名 id） */
  syllable: string;
  /** 放進的籃子的音；掉到底沒歸類是 undefined */
  picked?: string;
}

/** 把一關的事件轉成要記錄的計分：每個字各自對錯，歸錯的記「把 X 當成 Y」（用這一關考的那種文字，見 stageScript）。 */
export function scoreEvents(
  events: readonly DropEvent[],
  stage: DropStage,
): { results: { kanaId: string; correct: boolean }[]; confusions: { truth: string; picked: string }[] } {
  const results: { kanaId: string; correct: boolean }[] = [];
  const confusions: { truth: string; picked: string }[] = [];
  for (const e of events) {
    const truth = idIn(e.syllable, stageScript(stage));
    if (!truth) continue;
    const correct = e.picked === e.syllable;
    results.push({ kanaId: truth, correct });
    if (e.picked && !correct) {
      const picked = idIn(e.picked, stageScript(stage));
      if (picked) confusions.push({ truth, picked });
    }
  }
  return { results, confusions };
}

/** 籃子位置 [x, y, w, h, x, y, w, h, …]（螢幕座標），手指放開／拖曳到哪個籃子；沒有回傳 -1。上方放寬 slop。 */
export function slotAtPoint(rects: readonly number[], px: number, py: number, slop: number): number {
  'worklet';
  for (let i = 0; i + 3 < rects.length; i += 4) {
    const x = rects[i];
    const y = rects[i + 1];
    const w = rects[i + 2];
    const h = rects[i + 3];
    if (px >= x && px <= x + w && py >= y - slop && py <= y + h) return i / 4;
  }
  return -1;
}

/** 籃子排幾欄：4 個以內排一列，5～6 個排兩列（每列 3 個）。 */
export function basketColumns(n: number): number {
  return n <= 4 ? n : 3;
}

export interface DropMistake {
  /** 掉下來的字（這一關掉下來的那種文字） */
  fell: string;
  /** 正確的籃子上的字 */
  answer: string;
  /** 放進的籃子上的字；掉到底沒歸類是 undefined */
  put?: string;
}

/** 這一關放錯或掉到底的字，結果頁列出來讓使用者知道是哪幾個。 */
export function mistakesOf(events: readonly DropEvent[], stage: DropStage): DropMistake[] {
  return events
    .filter((e) => e.picked !== e.syllable)
    .map((e) => ({
      fell: faceOf(e.syllable, stage.fall),
      answer: faceOf(e.syllable, stage.basket),
      put: e.picked ? faceOf(e.picked, stage.basket) : undefined,
    }));
}
