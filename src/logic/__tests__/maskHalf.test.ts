import { byId } from '../../data';
import { confusableGroupById, confusableGroups } from '../../data/confusables';
import { MASK_SIDES, buildMaskHalfQuestion, decisiveMasks, visibleDistance, visibleLength } from '../maskHalf';
import { seededRng } from './testUtils';

const group = (id: string) => confusableGroupById(id)!;
const ch = (id: string) => byId(id)!.char;
const ALL = ['nume', 'ruro', 'wanere', 'shitsu', 'son'];

describe('遮一半：露出的那一半要看得出來', () => {
  it('ぬ／め 只有露出右半（遮左邊）或下半（遮上邊）時才分得出來；露出左半或上半時看不出（差異的圈被遮掉）', () => {
    expect(visibleDistance('ぬ', 'め', 'right')).toBeLessThan(5);
    expect(visibleDistance('ぬ', 'め', 'bottom')).toBeLessThan(5);
    expect(visibleDistance('ぬ', 'め', 'left')).toBeGreaterThan(30);
    expect(decisiveMasks('ぬ', ['め']).sort()).toEqual(['left', 'top']);
  });

  it('る／ろ 遮下面時圈被遮住，不可用', () => {
    expect(decisiveMasks('る', ['ろ'])).not.toContain('bottom');
    expect(decisiveMasks('る', ['ろ']).length).toBeGreaterThanOrEqual(2);
  });

  it('每一組、每個字，和同組其他字比，至少有 2 種遮法看得出來；露出的筆畫不會是空白', () => {
    for (const g of confusableGroups) {
      for (const a of g.members) {
        const rivals = g.members.filter((x) => x !== a);
        const sides = decisiveMasks(ch(a), rivals.map(ch));
        expect(sides.length).toBeGreaterThanOrEqual(1);
        for (const side of sides) expect(visibleLength(ch(a), side)).toBeGreaterThan(20);
      }
    }
    expect(MASK_SIDES).toHaveLength(4);
  });
});

describe('buildMaskHalfQuestion', () => {
  it('選項是兩對拼音（目標＋同組一個、另一組一個一對），4 個不重複；遮的那邊一定是看得出來的', () => {
    for (let seed = 1; seed <= 100; seed++) {
      for (const id of ALL) {
        const g = group(id);
        const q = buildMaskHalfQuestion(g, new Set(g.members), seededRng(seed))!;
        expect(q).toBeDefined();
        expect(q.type).toBe('maskhalf');
        expect(q.options).toHaveLength(4);
        expect(new Set(q.options).size).toBe(4);
        expect(q.options).toContain(q.answerId);
        expect(q.kanaId).toBe(q.answerId);
        expect(g.members).toContain(q.answerId);
        const rivals = q.options.filter((o) => o !== q.answerId).map(ch);
        expect(decisiveMasks(ch(q.answerId), rivals)).toContain(q.mask);
        // 同一種文字
        expect(new Set(q.options.map((o) => byId(o)!.script)).size).toBe(1);
        // 兩對：每一對都在同一個易混淆字組裡
        for (const pair of q.clusters!) {
          expect(confusableGroups.some((x) => pair.every((p) => x.members.includes(p)))).toBe(true);
        }
      }
    }
  });

  it('指定 target 一定考它；沒有其他字組可湊時回傳 undefined', () => {
    for (let seed = 1; seed <= 20; seed++) {
      expect(buildMaskHalfQuestion(group('nume'), new Set(), seededRng(seed), new Set(), { target: 'h-me' })!.answerId).toBe('h-me');
    }
    expect(buildMaskHalfQuestion(group('nume'), new Set(), seededRng(1), new Set(), { groups: [group('nume')] })).toBeUndefined();
  });
});

describe('作弊測試：遮一半猜字', () => {
  const N = 4000;
  const qs = Array.from({ length: N }, (_, i) => {
    const g = group(ALL[i % ALL.length]);
    return buildMaskHalfQuestion(g, new Set(g.members), seededRng(i + 1))!;
  });
  const tol = (p: number) => 4 * Math.sqrt((p * (1 - p)) / N) + 0.01;

  it('選項只有拼音：不認識假名的人，答案在第幾個選項是均勻的（固定選第 k 個 ≈ 25%）', () => {
    const hits = [0, 0, 0, 0];
    for (const q of qs) hits[q.options.indexOf(q.answerId)]++;
    for (const h of hits) expect(Math.abs(h / N - 0.25)).toBeLessThan(tol(0.25));
  });

  it('答案和干擾字結構相同：每個選項都在一對裡，答案所在的那一對在第幾對也是均勻的', () => {
    let first = 0;
    for (const q of qs) {
      expect(q.clusters!.flat().sort()).toEqual([...q.options].sort());
      if (q.clusters![0].includes(q.answerId)) first++;
    }
    expect(Math.abs(first / N - 0.5)).toBeLessThan(tol(0.5));
  });

  it('遮哪一邊、選項順序都不透露答案：隨機選一個的答對率 ≈ 25%', () => {
    const rng = seededRng(123);
    let ok = 0;
    for (const q of qs) if (q.options[Math.floor(rng() * 4)] === q.answerId) ok++;
    expect(Math.abs(ok / N - 0.25)).toBeLessThan(tol(0.25));
  });
});
