import { seionOrder } from '../../data';
import { isGraduated, learnedSeionCount, practiceDayCount } from '../graduate';
import { prog } from './testUtils';

const ids = (script: 'hiragana' | 'katakana') => seionOrder(script).map((k) => k.id);
const learned = (list: string[]) => list.map((id) => prog(id));

describe('isGraduated', () => {
  it('沒有進度：未畢業', () => {
    expect(isGraduated([])).toBe(false);
  });

  it('只學完平假名：未畢業', () => {
    expect(isGraduated(learned(ids('hiragana')))).toBe(false);
  });

  it('片假名只差一個：未畢業', () => {
    const kata = ids('katakana');
    expect(isGraduated(learned([...ids('hiragana'), ...kata.slice(0, kata.length - 1)]))).toBe(false);
  });

  it('平假名缺一個、片假名全部：未畢業', () => {
    const hira = ids('hiragana');
    expect(isGraduated(learned([...hira.slice(1), ...ids('katakana')]))).toBe(false);
  });

  it('兩種假名清音各 46 個都已學：畢業', () => {
    expect(ids('hiragana')).toHaveLength(46);
    expect(ids('katakana')).toHaveLength(46);
    expect(isGraduated(learned([...ids('hiragana'), ...ids('katakana')]))).toBe(true);
  });

  it('有進度但 learnedAt 沒值不算已學', () => {
    const all = [...ids('hiragana'), ...ids('katakana')].map((id) => prog(id));
    all[10] = prog(all[10].kanaId, { learnedAt: undefined });
    expect(isGraduated(all)).toBe(false);
  });
});

describe('learnedSeionCount', () => {
  it('依文字分開計算，濁音拗音不算', () => {
    const list = learned([...ids('hiragana'), ...ids('katakana').slice(0, 7), 'h-ga']);
    expect(learnedSeionCount(list, 'hiragana')).toBe(46);
    expect(learnedSeionCount(list, 'katakana')).toBe(7);
    expect(learnedSeionCount([], 'katakana')).toBe(0);
  });
});

describe('practiceDayCount', () => {
  it('空清單為 0', () => {
    expect(practiceDayCount([])).toBe(0);
  });

  it('不同日期的數量，重複的只算一次', () => {
    expect(practiceDayCount(['2026-10-25', '2026-10-26', '2026-10-27'])).toBe(3);
    expect(practiceDayCount(['2026-10-25', '2026-10-25', '2026-10-27'])).toBe(2);
  });
});
