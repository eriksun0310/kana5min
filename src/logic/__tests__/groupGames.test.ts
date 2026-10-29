import { confusableGroupById } from '../../data/confusables';
import {
  ALL_CELLS,
  ODD_CELLS,
  SEQ_LENGTH,
  SEQ_OPTION_COUNT,
  allMistakes,
  buildAllQuestion,
  buildOddQuestion,
  buildSeqQuestion,
  isAllCorrect,
} from '../groupGames';
import { seededRng } from './testUtils';

const group = (id: string) => confusableGroupById(id)!;
const learned = (...ids: string[]) => new Set(ids);

describe('buildOddQuestion（找不同）', () => {
  it('9 格：8 個同一個字、1 個不一樣的，答案格就是不一樣的那個', () => {
    for (let seed = 1; seed <= 60; seed++) {
      for (const id of ['nume', 'ruro', 'wanere']) {
        const q = buildOddQuestion(group(id), learned(...group(id).members), seededRng(seed));
        expect(q.type).toBe('odd');
        expect(q.cells).toHaveLength(ODD_CELLS);
        const idx = q.targetIndexes![0];
        expect(q.cells![idx]).toBe(q.answerId);
        const others = q.cells!.filter((_, i) => i !== idx);
        expect(new Set(others).size).toBe(1);
        expect(others[0]).not.toBe(q.answerId);
        expect(group(id).members).toContain(others[0]);
        expect(q.kanaId).toBe(q.answerId);
      }
    }
  });

  it('不一樣的那個字優先挑已學的；avoid 的字盡量避開', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const q = buildOddQuestion(group('wanere'), learned('h-wa'), seededRng(seed));
      expect(q.answerId).toBe('h-wa');
      const q2 = buildOddQuestion(group('nume'), learned('h-nu', 'h-me'), seededRng(seed), new Set(['h-nu']));
      expect(q2.answerId).toBe('h-me');
    }
  });

  it('目標格位置會隨機分佈在 9 格（不會固定在同一格）', () => {
    const positions = new Set<number>();
    for (let seed = 1; seed <= 80; seed++) {
      positions.add(buildOddQuestion(group('ruro'), learned('h-ru'), seededRng(seed)).targetIndexes![0]);
    }
    expect(positions.size).toBeGreaterThanOrEqual(7);
  });
});

describe('buildAllQuestion（找出所有）', () => {
  it('12 格：目標字 4～6 個，目標格索引與格子內容一致，其餘是組內其他字', () => {
    for (let seed = 1; seed <= 60; seed++) {
      for (const id of ['nume', 'wanere']) {
        const q = buildAllQuestion(group(id), learned(group(id).members[0]), seededRng(seed));
        expect(q.type).toBe('all');
        expect(q.cells).toHaveLength(ALL_CELLS);
        const targets = q.targetIndexes!;
        expect(targets.length).toBeGreaterThanOrEqual(4);
        expect(targets.length).toBeLessThanOrEqual(6);
        q.cells!.forEach((c, i) => {
          expect(c === q.answerId).toBe(targets.includes(i));
          expect(group(id).members).toContain(c);
        });
      }
    }
  });
});

describe('buildSeqQuestion（聽音選字串）', () => {
  it('序列 4 個字、兩種字都出現；3 個候選字串互不相同且恰好一個等於正確序列', () => {
    for (let seed = 1; seed <= 80; seed++) {
      const q = buildSeqQuestion(group('ruro'), learned('h-ru'), seededRng(seed));
      expect(q.type).toBe('seq');
      expect(q.sequence).toHaveLength(SEQ_LENGTH);
      expect(new Set(q.sequence).size).toBe(2);
      expect(q.seqOptions).toHaveLength(SEQ_OPTION_COUNT);
      const keys = q.seqOptions!.map((s) => s.join('|'));
      expect(new Set(keys).size).toBe(SEQ_OPTION_COUNT);
      expect(keys.filter((k) => k === q.sequence!.join('|'))).toHaveLength(1);
      expect(q.seqOptions![q.answerIndex!]).toEqual(q.sequence);
      for (const s of q.seqOptions!) expect(s).toHaveLength(SEQ_LENGTH);
    }
  });

  it('正確選項的位置會隨機分佈', () => {
    const pos = new Set<number>();
    for (let seed = 1; seed <= 60; seed++) {
      pos.add(buildSeqQuestion(group('nume'), learned('h-nu'), seededRng(seed)).answerIndex!);
    }
    expect(pos.size).toBe(SEQ_OPTION_COUNT);
  });

  it('三個字的組也只用兩個字出序列；kanaId 是被考的目標字、一定出現在序列裡', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const q = buildSeqQuestion(group('wanere'), learned('h-wa', 'h-ne', 'h-re'), seededRng(seed));
      expect(new Set(q.sequence).size).toBe(2);
      expect(q.sequence).toContain(q.kanaId);
    }
  });
});

describe('isAllCorrect／allMistakes', () => {
  it('選到的格子恰好等於所有目標格才算對（順序、重複不影響）', () => {
    expect(isAllCorrect([2, 5, 7], [7, 2, 5])).toBe(true);
    expect(isAllCorrect([2, 5, 5, 7], [2, 5, 7])).toBe(true);
    expect(isAllCorrect([2, 5], [2, 5, 7])).toBe(false);
    expect(isAllCorrect([2, 5, 7, 8], [2, 5, 7])).toBe(false);
    expect(isAllCorrect([], [1])).toBe(false);
  });

  it('漏掉與多選的數量', () => {
    expect(allMistakes([1, 2, 9], [1, 2, 3, 4])).toEqual({ missed: 2, extra: 1 });
    expect(allMistakes([1, 2], [1, 2])).toEqual({ missed: 0, extra: 0 });
  });
});
