import { byId, seionOrder } from '../../data';
import type { Progress } from '../../data/types';
import { buildDailySession, buildQuiz, completedRows, dueKanaIds, nextNewKanaIds, pickDistractors } from '../session';
import { DAY_MS, MINUTE_MS } from '../srs';
import { prog, seededRng } from './testUtils';

const NOW = 1_800_000_000_000;
const order = seionOrder().map((k) => k.id);

/** 前 n 個清音都已學、且尚未到期 */
function learnedFirst(n: number, over: Partial<Progress> = {}): Progress[] {
  return order.slice(0, n).map((id) => prog(id, { nextReviewAt: NOW + DAY_MS, ...over }));
}

describe('buildDailySession', () => {
  it('完全沒進度：新字是前 3 個（あいう），沒有複習', () => {
    const s = buildDailySession([], NOW);
    expect(s.newKanaIds).toEqual(['h-a', 'h-i', 'h-u']);
    expect(s.reviewKanaIds).toEqual([]);
    expect(s.learnedIds).toEqual([]);
  });

  it('新字依序往下，跨行就跨行（已學 4 個 → えおか）', () => {
    const s = buildDailySession(learnedFirst(4), NOW);
    expect(s.newKanaIds).toEqual(['h-o', 'h-ka', 'h-ki']);
  });

  it('到期的複習字：nextReviewAt <= now 且已學，最久沒複習的在前', () => {
    const all = [
      prog('h-a', { nextReviewAt: NOW - 1 * DAY_MS }),
      prog('h-i', { nextReviewAt: NOW - 3 * DAY_MS }),
      prog('h-u', { nextReviewAt: NOW }),
      prog('h-e', { nextReviewAt: NOW + 1 }), // 還沒到期
    ];
    const s = buildDailySession(all, NOW);
    expect(s.reviewKanaIds).toEqual(['h-i', 'h-a', 'h-u']);
    expect(s.newKanaIds).toEqual(['h-o', 'h-ka', 'h-ki']);
  });

  it('沒學過的進度（沒有 learnedAt）不算複習，也不算已學', () => {
    const s = buildDailySession([prog('h-a', { learnedAt: undefined, nextReviewAt: 0 })], NOW);
    expect(s.reviewKanaIds).toEqual([]);
    expect(s.newKanaIds[0]).toBe('h-a');
  });

  it('剛答錯（10 分鐘後到期）：10 分鐘內不出現，之後出現', () => {
    const all = [prog('h-a', { level: 0, nextReviewAt: NOW + 10 * MINUTE_MS })];
    expect(dueKanaIds(all, NOW + 9 * MINUTE_MS)).toEqual([]);
    expect(dueKanaIds(all, NOW + 10 * MINUTE_MS)).toEqual(['h-a']);
  });

  it('46 個都學完：沒有新字', () => {
    expect(nextNewKanaIds(learnedFirst(46))).toEqual([]);
    expect(buildDailySession(learnedFirst(46), NOW).newKanaIds).toEqual([]);
  });

  it('剩 2 個新字時只給 2 個', () => {
    expect(nextNewKanaIds(learnedFirst(44))).toEqual(['h-wo', 'h-n']);
  });
});

describe('buildQuiz', () => {
  const learned = learnedFirst(10, { nextReviewAt: NOW - 1 }); // 10 個已學且全部到期
  const session = buildDailySession(learned, NOW); // 新字 3（け こ さ）+ 複習 10

  it('題數：新字各 2 題 + 複習字各 1 題', () => {
    const quiz = buildQuiz(session, seededRng(1));
    expect(quiz).toHaveLength(session.newKanaIds.length * 2 + session.reviewKanaIds.length);
    for (const id of session.newKanaIds) {
      const qs = quiz.filter((q) => q.kanaId === id);
      expect(qs.map((q) => q.type).sort()).toEqual(['hear', 'see']);
    }
    for (const id of session.reviewKanaIds) {
      expect(quiz.filter((q) => q.kanaId === id)).toHaveLength(1);
    }
  });

  it('選項 4 個、不重複、包含正確答案、答案位置有變化', () => {
    const positions = new Set<number>();
    for (let seed = 0; seed < 30; seed++) {
      for (const q of buildQuiz(session, seededRng(seed))) {
        expect(q.options).toHaveLength(4);
        expect(new Set(q.options).size).toBe(4);
        expect(q.options).toContain(q.answerId);
        expect(q.answerId).toBe(q.kanaId);
        positions.add(q.options.indexOf(q.answerId));
      }
    }
    expect(positions.size).toBe(4);
  });

  it('干擾項與題目同為清音', () => {
    for (const q of buildQuiz(session, seededRng(5))) {
      for (const id of q.options) expect(byId(id)?.kind).toBe('seion');
    }
  });

  it('同一個字的兩題不相鄰（多組亂數）', () => {
    for (let seed = 0; seed < 200; seed++) {
      const quiz = buildQuiz(session, seededRng(seed));
      for (let i = 1; i < quiz.length; i++) {
        expect(quiz[i].kanaId).not.toBe(quiz[i - 1].kanaId);
      }
    }
  });

  it('只有 2 個新字（4 題）也能交錯排開', () => {
    const only = { newKanaIds: ['h-a', 'h-i'], reviewKanaIds: [], learnedIds: [] };
    for (let seed = 0; seed < 100; seed++) {
      const quiz = buildQuiz(only, seededRng(seed));
      expect(quiz).toHaveLength(4);
      for (let i = 1; i < quiz.length; i++) expect(quiz[i].kanaId).not.toBe(quiz[i - 1].kanaId);
    }
  });

  it('題目 id 依序為 q-0, q-1…', () => {
    const quiz = buildQuiz(session, seededRng(3));
    expect(quiz.map((q) => q.id)).toEqual(quiz.map((_, i) => `q-${i}`));
  });

  it('同樣的 rng 種子產生同樣的題目（可重現）', () => {
    expect(buildQuiz(session, seededRng(42))).toEqual(buildQuiz(session, seededRng(42)));
  });

  it('review 題型由 rng 決定（rng<0.5 → see）', () => {
    const quiz = buildQuiz({ newKanaIds: [], reviewKanaIds: ['h-a', 'h-i'], learnedIds: ['h-a', 'h-i'] }, () => 0.1);
    expect(quiz.every((q) => q.type === 'see')).toBe(true);
    const quiz2 = buildQuiz({ newKanaIds: [], reviewKanaIds: ['h-a', 'h-i'], learnedIds: ['h-a', 'h-i'] }, () => 0.9);
    expect(quiz2.every((q) => q.type === 'hear')).toBe(true);
  });
});

describe('pickDistractors', () => {
  it('優先取已學的字，不足 3 個才補同類型的其他字', () => {
    const target = byId('h-a')!;
    const known = new Set(['h-a', 'h-i', 'h-u', 'h-e', 'h-o']);
    for (let seed = 0; seed < 20; seed++) {
      const d = pickDistractors(target, known, seededRng(seed));
      expect(d).toHaveLength(3);
      d.forEach((id) => expect(known.has(id)).toBe(true));
      expect(d).not.toContain('h-a');
    }
    // 只學了 2 個：1 個已學 + 2 個補的
    const few = pickDistractors(target, new Set(['h-a', 'h-i']), seededRng(1));
    expect(few).toHaveLength(3);
    expect(few[0]).toBe('h-i');
    expect(new Set(few).size).toBe(3);
  });

  it('易混淆字組的另一個字優先當干擾項（已學時）', () => {
    // 題目 ぬ，め 是易混淆字；其他已學的字很多
    const known = new Set(order.slice(0, 40));
    const nu = byId('h-nu')!;
    for (let seed = 0; seed < 30; seed++) {
      expect(pickDistractors(nu, known, seededRng(seed))).toContain('h-me');
    }
    // わ／ね／れ 三個互為易混淆：兩個都會被取到
    const wa = byId('h-wa')!;
    const allKnown = new Set(order);
    for (let seed = 0; seed < 30; seed++) {
      const d = pickDistractors(wa, allKnown, seededRng(seed));
      expect(d).toContain('h-ne');
      expect(d).toContain('h-re');
    }
  });

  it('易混淆字還沒學過時，排在已學的字後面（不優先出現）', () => {
    const known = new Set(['h-nu', 'h-a', 'h-i', 'h-u', 'h-e']);
    for (let seed = 0; seed < 20; seed++) {
      expect(pickDistractors(byId('h-nu')!, known, seededRng(seed))).not.toContain('h-me');
    }
  });
});

describe('completedRows', () => {
  it('這輪才湊滿的行會回傳；本來就湊滿的不重複回傳', () => {
    const before = learnedFirst(8); // あ行 5 + か行前 3
    const after = learnedFirst(10); // か行湊滿
    expect(completedRows(before, after)).toEqual(['ka']);
    expect(completedRows(after, after)).toEqual([]);
  });

  it('同一輪湊滿兩行（理論上 3 新字不會，但函式要正確）', () => {
    expect(completedRows(learnedFirst(4), learnedFirst(10))).toEqual(['a', 'ka']);
  });

  it('沒湊滿任何一行回傳空陣列', () => {
    expect(completedRows(learnedFirst(0), learnedFirst(3))).toEqual([]);
  });

  it('沒有 learnedAt 的進度不算已學', () => {
    const after = learnedFirst(5).map((p, i) => (i === 4 ? { ...p, learnedAt: undefined } : p));
    expect(completedRows([], after)).toEqual([]);
  });

  it('や行只有 3 個字，學完 3 個就算湊滿', () => {
    expect(completedRows(learnedFirst(35), learnedFirst(38))).toEqual(['ya']);
  });

  it('最後一行（わ・を・ん）', () => {
    expect(completedRows(learnedFirst(45), learnedFirst(46))).toEqual(['wa']);
  });
});
