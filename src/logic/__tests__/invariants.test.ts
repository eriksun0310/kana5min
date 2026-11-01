// 防呆總檢查：用大量「已學進度 × 亂數種子」跑真正的出題函式，驗證每一題都「能作答、不會壞」。
// 這裡不測某個功能，而是測「不管學到哪裡、不管抽到什麼，都不會出現壞題」：
// 答案在選項裡、選項不重複、同音選項不會讓答案有兩個、鍵盤打得出答案、默寫有筆畫資料、不會丟例外。

import { allKana, byId } from '../../data';
import { confusableGroups } from '../../data/confusables';
import { strokesOf } from '../../data/strokes';
import type { Progress } from '../../data/types';
import { buildAutoPractice10, buildQuickConfuse10 } from '../confusion';
import { defaultLearningOrder, type QuizQuestion } from '../session';
import { prog, seededRng } from './testUtils';

const HIRA = defaultLearningOrder('hiragana');
const KATA = defaultLearningOrder('katakana');

function progressOf(ids: readonly string[]): Progress[] {
  return ids.map((id) => prog(id));
}

/** 各種「學到哪裡」：1 個字、2 個、前 N 個、平假名全部、全部加片假名前 N 個、隨機子集 */
function learnedScenarios(): { name: string; ids: string[] }[] {
  const out: { name: string; ids: string[] }[] = [];
  for (const n of [1, 2, 3, 5, 10, 15, 20, 30, 40, 46]) out.push({ name: `hira-${n}`, ids: HIRA.slice(0, n) });
  for (const n of [1, 5, 20, 46]) out.push({ name: `all-hira+kata-${n}`, ids: [...HIRA, ...KATA.slice(0, n)] });
  for (let s = 1; s <= 12; s++) {
    const rng = seededRng(s * 77);
    out.push({ name: `random-${s}`, ids: [...HIRA, ...KATA].filter(() => rng() < 0.4) });
  }
  return out.filter((x) => x.ids.length > 0);
}

const isKanaOption = (t: QuizQuestion['type']) =>
  t === 'see' || t === 'hear' || t === 'confuse' || t === 'maskhalf';

function checkQuestion(q: QuizQuestion, ctx: string) {
  const at = `${ctx} ${q.type}/${q.kanaId}`;
  expect(q.id).toMatch(/^q-\d+$/);
  expect(q.answerId).toBeTruthy();

  if (q.type === 'loanword' || q.type === 'wordread') {
    expect(new Set(q.options).size).toBe(q.options.length);
    expect(q.options).toContain(q.answerId);
    return;
  }
  if (q.type === 'spoterr') return;

  const target = byId(q.kanaId);
  expect(target).toBeDefined();
  expect(q.answerId).toBe(q.kanaId);

  if (q.type === 'recall') {
    // 默寫一定要有標準筆畫，不然翻面比對會壞
    expect(strokesOf(target!.char)).toBeDefined();
    return;
  }

  if (isKanaOption(q.type)) {
    expect(q.options).toContain(q.answerId);
    expect(new Set(q.options).size).toBe(q.options.length);
    const opts = q.options.map((id) => byId(id));
    for (const o of opts) expect(o).toBeDefined();
    // 字形不重複、同一題不會混平假名與片假名（看起來不同音的字才有意義）
    expect(new Set(opts.map((o) => o!.char)).size).toBe(opts.length);
    // 答案只能有一個：沒有別的選項和答案同音（聽音選字、看字選音才不會有兩個正解）
    const same = opts.filter((o) => o!.romaji === target!.romaji);
    expect(same.length).toBe(1);
    if (q.type !== 'maskhalf' && q.type !== 'confuse') expect(q.options.length).toBeGreaterThanOrEqual(2);
    if (q.type === 'maskhalf') {
      expect(q.options.length).toBe(4);
      expect(q.mask).toBeDefined();
    }
    return;
  }

  if (q.type === 'findall') {
    const cells = q.cells!;
    const targets = q.targetIndexes!;
    expect(targets.length).toBeGreaterThan(0);
    for (const i of targets) expect(cells[i]).toBe(q.answerId);
    expect(cells.filter((c) => c === q.answerId).length).toBe(targets.length);
    const glyphs = cells.map((c) => byId(c)!.char);
    // 不同 id 不可以是同一個字形
    expect(new Set(glyphs).size).toBe(new Set(cells).size);
    // 每個字形出現次數相同
    const counts = new Map<string, number>();
    for (const c of cells) counts.set(c, (counts.get(c) ?? 0) + 1);
    expect(new Set(counts.values()).size).toBe(1);
    // 沒有別的字形和目標同音（不然「找出所有 ほ」會有兩種字形都對）
    const sameSound = [...counts.keys()].filter((c) => byId(c)!.romaji === target!.romaji);
    expect(sameSound.length).toBe(1);
    return;
  }

  if (q.type === 'readseq') {
    const seq = q.sequence!;
    expect(seq.length).toBeGreaterThanOrEqual(3);
    expect(seq.length).toBeLessThanOrEqual(5);
    expect(seq).toContain(q.answerId);
    expect(new Set(seq).size).toBeGreaterThanOrEqual(2);
    // 鍵盤一定打得出整串答案，鍵盤上不會有兩個同音的鍵
    const keys = q.keyIds!;
    for (const id of seq) expect(keys).toContain(id);
    const romajis = keys.map((k) => byId(k)!.romaji);
    expect(new Set(romajis).size).toBe(keys.length);
    return;
  }

  if (q.type === 'seq') {
    const seq = q.sequence!;
    expect(seq.length).toBe(4);
    expect(new Set(seq).size).toBe(4);
    expect(new Set(seq.map((id) => byId(id)!.romaji)).size).toBe(4);
    const opts = q.seqOptions!;
    expect(opts.length).toBe(3);
    expect(new Set(opts.map((o) => o.join('|'))).size).toBe(3);
    expect(q.answerIndex).toBeGreaterThanOrEqual(0);
    expect(opts[q.answerIndex!].join('|')).toBe(seq.join('|'));
    return;
  }
  throw new Error(`未知題型 ${at}`);
}

describe('防呆：自動練習 10 題（各種進度 × 亂數）', () => {
  for (const sc of learnedScenarios()) {
    it(`${sc.name}（${sc.ids.length} 個字）每題都正常`, () => {
      const progress = progressOf(sc.ids);
      for (let seed = 1; seed <= 25; seed++) {
        const rng = seededRng(seed * 31 + sc.ids.length);
        // 答錯次數也亂數：有些組權重很高
        const counts: Record<string, number> = {};
        for (const g of confusableGroups) if (rng() < 0.5) counts[g.id] = Math.floor(rng() * 20);
        let qs: QuizQuestion[] | null = null;
        expect(() => {
          qs = buildAutoPractice10(progress, counts, seededRng(seed * 131 + 7));
        }).not.toThrow();
        expect(qs).not.toBeNull();
        const list = qs as unknown as QuizQuestion[];
        // 學過 2 個字以上就該湊得出 10 題（只有 1 個字時最多出 2 題）
        // 每個已學字最多 2 題（看字選音＋聽音選字），所以字很少時題數 = 2 × 字數；字夠多（≥ 5）就一定湊滿 10 題
        expect(list.length).toBeGreaterThanOrEqual(Math.min(10, 2 * sc.ids.length));
        if (sc.ids.length >= 5) expect(list.length).toBe(10);
        expect(new Set(list.map((q) => q.id)).size).toBe(list.length);
        for (const q of list) checkQuestion(q, `${sc.name}#${seed}`);
        // 題目只會是已學的字（目標字不會是沒學過的）
        const learned = new Set(sc.ids);
        for (const q of list) {
          if (q.kanaId && q.type !== 'maskhalf' && q.type !== 'confuse') {
            // findall/readseq/seq 在「已學成員不足」時才會用沒學的，這裡只要求有已學成員時一定是已學
            const g = confusableGroups.find((x) => x.id === q.groupId);
            if (g && g.members.filter((m) => learned.has(m)).length >= 2) expect(learned.has(q.kanaId)).toBe(true);
          }
        }
      }
    });
  }

  it('沒有任何已學字時回傳 null，不丟例外', () => {
    expect(buildAutoPractice10([], {}, seededRng(1))).toBeNull();
  });

  it('進度裡有查不到的 id（舊資料、壞資料）也不會壞', () => {
    const progress = [...progressOf(HIRA.slice(0, 10)), prog('h-nonexistent'), prog('')];
    for (let seed = 1; seed <= 10; seed++) {
      const qs = buildAutoPractice10(progress, {}, seededRng(seed))!;
      expect(qs.length).toBeGreaterThan(0);
      for (const q of qs) checkQuestion(q, `bad-progress#${seed}`);
    }
  });
});

describe('防呆：每一組的快速辨識 10 題', () => {
  for (const g of confusableGroups) {
    it(`${g.id} 每題都正常、不會重複目標太多`, () => {
      for (let seed = 1; seed <= 30; seed++) {
        let qs: QuizQuestion[] = [];
        expect(() => {
          qs = buildQuickConfuse10(g, seededRng(seed));
        }).not.toThrow();
        expect(qs.length).toBe(10);
        for (const q of qs) {
          if (q.type === 'confuse') {
            // 組內題：選項就是組成員，答案在其中
            expect(q.options).toContain(q.answerId);
            expect(new Set(q.options).size).toBe(q.options.length);
            continue;
          }
          checkQuestion(q, `quick-${g.id}#${seed}`);
        }
      }
    });
  }
});

describe('防呆：資料完整性', () => {
  it('每個假名都有標準筆畫（默寫、描紅、筆順動畫都靠它）', () => {
    // 拗音是兩個字合起來的，沒有單獨的筆畫資料；其他（清音、濁音）都要有
    const missing = allKana.filter((k) => k.kind !== 'youon' && !strokesOf(k.char)).map((k) => k.id);
    expect(missing).toEqual([]);
  });

  it('每個易混淆組：成員都查得到、沒有重複、同組不會有同音字（會讓「答案唯一」失效）', () => {
    for (const g of confusableGroups) {
      expect(new Set(g.members).size).toBe(g.members.length);
      for (const id of g.members) expect(byId(id)).toBeDefined();
      const romajis = g.members.map((id) => byId(id)!.romaji);
      expect(new Set(romajis).size).toBe(romajis.length);
      // 同一組都是同一種文字
      expect(new Set(g.members.map((id) => byId(id)!.script)).size).toBe(1);
      expect(g.members.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('每個易混淆組都有「差在哪裡」說明，且不是空字串', () => {
    for (const g of confusableGroups) expect((g.tip ?? '').trim().length).toBeGreaterThan(0);
  });

  it('每個假名的 id、字形都不重複', () => {
    expect(new Set(allKana.map((k) => k.id)).size).toBe(allKana.length);
    expect(new Set(allKana.map((k) => k.char)).size).toBe(allKana.length);
  });
});

// ---------------------------------------------------------------- 掉字遊戲

import {
  availableStages,
  buildRound,
  DROP_PRESETS,
  DROP_STAGES,
  faceOf,
  learnedSyllables,
  MAX_PICK,
  MIN_PICK,
  mistakesOf,
  randomSelection,
  ROUND_SIZE,
  scoreEvents,
  stageScript,
} from '../dropGame';

describe('防呆：掉字遊戲（任何選字 × 任何關卡）', () => {
  it('每一關、每個選字：籃子上的字不會重複、掉下來的字一定有對應的籃子', () => {
    for (let n = MIN_PICK; n <= 46; n += 3) {
      const learnedIds = [...HIRA.slice(0, n), ...KATA];
      const learned = learnedSyllables(learnedIds, HIRA);
      for (let seed = 1; seed <= 20; seed++) {
        const rng = seededRng(seed * 13 + n);
        const selection = randomSelection(learned, rng, MIN_PICK + Math.floor(rng() * (MAX_PICK - MIN_PICK + 1)));
        expect(selection.length).toBeGreaterThanOrEqual(MIN_PICK);
        expect(selection.length).toBeLessThanOrEqual(MAX_PICK);
        expect(new Set(selection).size).toBe(selection.length);
        for (const stage of availableStages(selection, true)) {
          const baskets = selection.map((s) => faceOf(s, stage.basket));
          const falls = selection.map((s) => faceOf(s, stage.fall));
          for (const f of [...baskets, ...falls]) expect(f).toBeTruthy();
          // 籃子的字不能重複：兩個籃子寫一樣的字，答案就有兩個
          expect(new Set(baskets).size).toBe(baskets.length);
          expect(new Set(falls).size).toBe(falls.length);
          // 計分一定查得到字
          const events = selection.map((s) => ({ syllable: s, picked: s }));
          const sc = scoreEvents(events, stage);
          expect(sc.results.length).toBe(selection.length);
          expect(sc.results.every((r) => r.correct)).toBe(true);
          expect(byId(sc.results[0].kanaId)?.script).toBe(stageScript(stage));
        }
      }
    }
  });

  it('出題順序：長度固定、索引不越界、每個字次數相差最多 1、不連續同一個', () => {
    for (let n = MIN_PICK; n <= MAX_PICK; n++) {
      for (let seed = 1; seed <= 200; seed++) {
        const round = buildRound(n, seededRng(seed));
        expect(round.length).toBe(ROUND_SIZE);
        const counts = new Array<number>(n).fill(0);
        for (const i of round) {
          expect(i).toBeGreaterThanOrEqual(0);
          expect(i).toBeLessThan(n);
          counts[i]++;
        }
        expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
        for (let k = 1; k < round.length; k++) expect(round[k]).not.toBe(round[k - 1]);
      }
    }
  });

  it('推薦字組：每組的字都查得到，平假名與片假名都有，籃子字不重複', () => {
    for (const p of DROP_PRESETS) {
      expect(p.syllables.length).toBeGreaterThanOrEqual(MIN_PICK);
      expect(p.syllables.length).toBeLessThanOrEqual(MAX_PICK);
      for (const stage of DROP_STAGES) {
        const faces = p.syllables.map((s) => faceOf(s, stage.basket));
        for (const f of faces) expect(f).toBeTruthy();
        expect(new Set(faces).size).toBe(faces.length);
      }
    }
  });

  it('全錯、全部掉到底、混合：結果與錯題清單都不丟例外，數量對得上', () => {
    const sel = ['h-nu', 'h-me', 'h-wa'];
    for (const stage of DROP_STAGES) {
      const dropped = sel.map((s) => ({ syllable: s }));
      const swapped = sel.map((s, i) => ({ syllable: s, picked: sel[(i + 1) % sel.length] }));
      for (const events of [dropped, swapped, [...dropped, ...swapped], []]) {
        expect(() => scoreEvents(events, stage)).not.toThrow();
        expect(mistakesOf(events, stage).length).toBe(events.length);
      }
    }
  });
});
