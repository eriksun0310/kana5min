import { byId } from '../../data';
import { confusableGroupById, confusableGroups } from '../../data/confusables';
import {
  SEQ_LENGTH,
  SEQ_OPTION_COUNT,
  allMistakes,
  buildFindAllQuestion,
  buildReadSeqQuestion,
  buildSeqQuestion,
  isAllCorrect,
  keyboardKeyIds,
  scoreFindAll,
  scoreReadSeq,
  scoreSeq,
} from '../groupGames';
import { seededRng } from './testUtils';

const group = (id: string) => confusableGroupById(id)!;
const learned = (...ids: string[]) => new Set(ids);
const HIRA_GROUPS = ['nume', 'ruro', 'wanere'];
const KATA_GROUPS = ['shitsu', 'son'];

describe('buildFindAllQuestion（找出所有）', () => {
  it('格子由成對的易混淆字組成，每個字形出現次數相同；目標格索引與格子內容一致', () => {
    for (let seed = 1; seed <= 80; seed++) {
      for (const id of [...HIRA_GROUPS, ...KATA_GROUPS]) {
        const g = group(id);
        const q = buildFindAllQuestion(g, learned(g.members[0]), seededRng(seed))!;
        expect(q.type).toBe('findall');
        const cells = q.cells!;
        const counts = new Map<string, number>();
        for (const c of cells) counts.set(c, (counts.get(c) ?? 0) + 1);
        // 每個字形次數相同（m = 1 或 2）
        expect(new Set(counts.values()).size).toBe(1);
        const m = [...counts.values()][0];
        expect([1, 2]).toContain(m);
        expect(counts.size).toBe(cells.length / m);
        // 目標字就是答案字，目標格 = 它出現的所有格
        expect(q.kanaId).toBe(q.answerId);
        expect(q.targetIndexes).toEqual(cells.flatMap((c, i) => (c === q.answerId ? [i] : [])));
        expect(q.targetIndexes).toHaveLength(m);
        // 每個字形恰好屬於一個「成對」，每對都來自同一個易混淆字組
        const clusters = q.clusters!;
        expect(clusters.flat().sort()).toEqual([...counts.keys()].sort());
        for (const pair of clusters) {
          expect(pair).toHaveLength(2);
          expect(confusableGroups.some((x) => pair.every((p) => x.members.includes(p)))).toBe(true);
        }
        // 同一種文字
        expect(new Set(cells.map((c) => byId(c)!.script)).size).toBe(1);
      }
    }
  });

  it('平假名 3 對（6 或 12 格）、片假名 2 對（4 或 8 格）', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const h = buildFindAllQuestion(group('nume'), learned('h-nu'), seededRng(seed))!;
      expect([6, 12]).toContain(h.cells!.length);
      const k = buildFindAllQuestion(group('shitsu'), learned('k-shi'), seededRng(seed))!;
      expect([4, 8]).toContain(k.cells!.length);
    }
  });

  it('指定 target 時一定考它；沒指定時優先已學、avoid 盡量避開', () => {
    for (let seed = 1; seed <= 30; seed++) {
      expect(buildFindAllQuestion(group('wanere'), learned('h-wa'), seededRng(seed))!.answerId).toBe('h-wa');
      expect(
        buildFindAllQuestion(group('nume'), learned('h-nu', 'h-me'), seededRng(seed), new Set(['h-nu']))!.answerId,
      ).toBe('h-me');
      expect(buildFindAllQuestion(group('nume'), learned(), seededRng(seed), new Set(), { target: 'h-me' })!.answerId).toBe(
        'h-me',
      );
    }
  });

  it('同一種文字沒有其他字組可以湊成對時回傳 undefined', () => {
    expect(buildFindAllQuestion(group('nume'), learned('h-nu'), seededRng(1), new Set(), { groups: [group('nume')] })).toBeUndefined();
  });
});

describe('isAllCorrect／allMistakes／scoreFindAll', () => {
  it('選到的格子恰好等於所有目標格才算對（不看順序、忽略重複）', () => {
    expect(isAllCorrect([2, 5, 7], [7, 2, 5])).toBe(true);
    expect(isAllCorrect([2, 5, 5, 7], [2, 5, 7])).toBe(true);
    expect(isAllCorrect([2, 5], [2, 5, 7])).toBe(false);
    expect(isAllCorrect([2, 5, 7, 8], [2, 5, 7])).toBe(false);
    expect(isAllCorrect([], [1])).toBe(false);
  });

  it('漏掉與多選的數量', () => {
    expect(allMistakes([1, 2, 9], [1, 2, 3])).toEqual({ missed: 1, extra: 1 });
    expect(allMistakes([1, 2, 3], [1, 2, 3])).toEqual({ missed: 0, extra: 0 });
  });

  it('計分：目標字的對錯，選到的其他字各記一筆混淆（同一個字只記一筆）', () => {
    const cells = ['h-nu', 'h-me', 'h-ru', 'h-nu', 'h-me', 'h-ro'];
    const targets = [0, 3];
    expect(scoreFindAll(cells, [0, 3], targets, 'h-nu')).toEqual({ correct: true, confusions: [] });
    const wrong = scoreFindAll(cells, [0, 1, 4, 5], targets, 'h-nu');
    expect(wrong.correct).toBe(false);
    expect(wrong.confusions.sort((a, b) => a.picked.localeCompare(b.picked))).toEqual([
      { truth: 'h-nu', picked: 'h-me' },
      { truth: 'h-nu', picked: 'h-ro' },
    ]);
  });
});

describe('buildReadSeqQuestion（念出一串）', () => {
  it('3～5 個字，只用同組已學成員，至少兩種，一定包含目標字', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const g = group('wanere');
      const q = buildReadSeqQuestion(g, learned('h-wa', 'h-ne'), seededRng(seed))!;
      expect(q.type).toBe('readseq');
      const seq = q.sequence!;
      expect(seq.length).toBeGreaterThanOrEqual(3);
      expect(seq.length).toBeLessThanOrEqual(5);
      expect(new Set(seq).size).toBeGreaterThanOrEqual(2);
      expect(seq).toContain(q.answerId);
      for (const id of seq) expect(['h-wa', 'h-ne']).toContain(id);
    }
  });

  it('鍵盤 = 已學的清音 + 這一題用到的字，與題目無關（相同的已學字 → 相同的鍵）', () => {
    const l = learned('h-a', 'h-ka', 'h-nu', 'h-me', 'h-ru', 'h-ro');
    const sets = new Set<string>();
    for (let seed = 1; seed <= 60; seed++) {
      for (const id of ['nume', 'ruro']) {
        const q = buildReadSeqQuestion(group(id), l, seededRng(seed))!;
        sets.add([...q.keyIds!].sort().join(','));
      }
    }
    expect(sets.size).toBe(1);
  });

  it('keyboardKeyIds：只放同一種文字的清音，字串用到的字一定在內', () => {
    const ids = keyboardKeyIds(learned('h-a', 'k-a', 'h-ga'), ['h-nu'], 'hiragana');
    expect(ids.sort()).toEqual(['h-a', 'h-nu']);
  });

  it('計分：每個字各自對錯（出現多次要全對），打錯的位置記混淆', () => {
    const seq = ['h-nu', 'h-me', 'h-nu'];
    expect(scoreReadSeq(seq, ['h-nu', 'h-me', 'h-nu'])).toEqual({
      correct: true,
      perKana: { 'h-nu': true, 'h-me': true },
      confusions: [],
    });
    const r = scoreReadSeq(seq, ['h-nu', 'h-me', 'h-me']);
    expect(r.correct).toBe(false);
    expect(r.perKana).toEqual({ 'h-nu': false, 'h-me': true });
    expect(r.confusions).toEqual([{ truth: 'h-nu', picked: 'h-me' }]);
  });
});

describe('buildSeqQuestion（聽音選字串）', () => {
  it('序列 4 個不重複的字；3 個選項互不相同、恰好一個等於正確序列、兩兩距離都是 3', () => {
    for (let seed = 1; seed <= 120; seed++) {
      for (const id of [...HIRA_GROUPS, ...KATA_GROUPS]) {
        const g = group(id);
        const q = buildSeqQuestion(g, learned(...g.members), seededRng(seed))!;
        expect(q.type).toBe('seq');
        const seq = q.sequence!;
        expect(seq).toHaveLength(SEQ_LENGTH);
        expect(new Set(seq).size).toBe(SEQ_LENGTH);
        expect(seq).toContain(q.answerId);
        const opts = q.seqOptions!;
        expect(opts).toHaveLength(SEQ_OPTION_COUNT);
        expect(new Set(opts.map((o) => o.join('|'))).size).toBe(SEQ_OPTION_COUNT);
        expect(opts[q.answerIndex!]).toEqual(seq);
        const dist = (a: string[], b: string[]) => a.filter((x, i) => x !== b[i]).length;
        for (let i = 0; i < opts.length; i++) {
          for (let j = i + 1; j < opts.length; j++) expect(dist(opts[i], opts[j])).toBe(3);
          // 同一組字的重新排列
          expect([...opts[i]].sort()).toEqual([...seq].sort());
        }
      }
    }
  });

  it('湊不出 4 個不重複的字時回傳 undefined', () => {
    expect(buildSeqQuestion(group('nume'), learned(), seededRng(1), new Set(), { groups: [group('nume')] })).toBeUndefined();
  });

  it('計分：選對 → 每個字都對；選錯 → 不一樣的位置，真正的字記錯並記混淆', () => {
    const seq = ['h-nu', 'h-me', 'h-ru', 'h-ro'];
    const right = scoreSeq(seq, seq);
    expect(right.correct).toBe(true);
    expect(Object.values(right.perKana).every(Boolean)).toBe(true);
    const wrong = scoreSeq(seq, ['h-me', 'h-ru', 'h-nu', 'h-ro']);
    expect(wrong.correct).toBe(false);
    expect(wrong.perKana).toEqual({ 'h-nu': false, 'h-me': false, 'h-ru': false });
    expect(wrong.confusions).toEqual([
      { truth: 'h-nu', picked: 'h-me' },
      { truth: 'h-me', picked: 'h-ru' },
      { truth: 'h-ru', picked: 'h-nu' },
    ]);
  });
});
