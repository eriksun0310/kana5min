import kana from '../../data/kana.json';
import { strokesOf } from '../../data/strokes';
import { judgeRecall, normalizeToReference } from '../recallJudge';
import { samplePath, type Point, type Stroke } from '../trace';

const hira = (kana as { char: string; script: string; kind: string }[])
  .filter((k) => k.script === 'hiragana' && k.kind === 'seion')
  .map((k) => k.char);
const kata = (kana as { char: string; script: string; kind: string }[])
  .filter((k) => k.script === 'katakana' && k.kind === 'seion')
  .map((k) => k.char);

const refsOf = (c: string) => strokesOf(c)!.strokes;
/** 標準筆畫取樣成使用者筆畫，再縮放、平移（模擬寫得大小、位置不一樣） */
const drawn = (c: string, scale: number, dx: number, dy: number): Stroke[] =>
  refsOf(c).map((d) => samplePath(d).map((p): Point => ({ x: p.x * scale + dx, y: p.y * scale + dy })));

describe('recallJudge：默寫比對', () => {
  it('沒有寫任何筆畫（可能在紙上寫）：none，讓使用者自評', () => {
    expect(judgeRecall([], refsOf('あ')).verdict).toBe('none');
    // 只是輕點
    expect(judgeRecall([[{ x: 5, y: 5 }, { x: 5.2, y: 5.1 }]], refsOf('あ')).verdict).toBe('none');
  });

  it('寫對的字，大小與位置不同（縮小、放大、平移）也通過：平假名與片假名清音全部', () => {
    const failed: string[] = [];
    for (const c of [...hira, ...kata]) {
      for (const [s, dx, dy] of [
        [1, 0, 0],
        [0.5, 40, 10],
        [0.7, -5, 30],
        [1.3, -20, -15],
      ] as const) {
        if (judgeRecall(drawn(c, s, dx, dy), refsOf(c)).verdict !== 'right') failed.push(`${c}@${s}`);
      }
    }
    expect(failed).toEqual([]);
  });

  it('寫成別的字不通過：題目是 を 卻寫成 わ', () => {
    expect(judgeRecall(drawn('わ', 1, 0, 0), refsOf('を')).verdict).toBe('wrong');
  });

  it('易混淆的字不能互相蒙混：每一組寫成同組另一個字都不通過', () => {
    const pairs = [['ぬ', 'め'], ['め', 'ぬ'], ['る', 'ろ'], ['ろ', 'る'], ['あ', 'お'], ['お', 'あ'], ['シ', 'ツ'], ['ツ', 'シ'], ['ソ', 'ン'], ['ン', 'ソ'], ['ね', 'れ'], ['れ', 'ね'], ['は', 'ほ'], ['ほ', 'は']];
    const passed = pairs.filter(([truth, written]) => judgeRecall(drawn(written, 1, 0, 0), refsOf(truth)).verdict === 'right').map((p) => p.join('→'));
    expect(passed).toEqual([]);
  });

  it('亂塗（整個塗黑、很多筆）一定寫錯：使用者的例子', () => {
    const scribble: Stroke[] = Array.from({ length: 9 }, (_, i) => [
      { x: 10 + i * 10, y: 100 },
      { x: 60 + i * 5, y: 10 },
      { x: 100 - i * 4, y: 95 },
    ]);
    for (const c of [...hira, ...kata]) expect(judgeRecall(scribble, refsOf(c)).verdict).toBe('wrong');
  });

  it('亂畫的叉、直線、大圈：兩筆以上的字全部寫錯；整體誤判率很低', () => {
    const cross: Stroke[] = [
      [{ x: 20, y: 20 }, { x: 90, y: 90 }],
      [{ x: 90, y: 20 }, { x: 20, y: 90 }],
    ];
    const line: Stroke[] = [[{ x: 10, y: 50 }, { x: 100, y: 50 }]];
    const circle: Stroke[] = [
      Array.from({ length: 41 }, (_, i) => ({ x: 54.5 + 45 * Math.cos((i / 40) * 2 * Math.PI), y: 54.5 + 45 * Math.sin((i / 40) * 2 * Math.PI) })),
    ];
    let total = 0;
    const passed: string[] = [];
    for (const c of [...hira, ...kata]) {
      for (const [name, s] of [['叉', cross], ['線', line], ['圈', circle]] as const) {
        total++;
        if (judgeRecall(s, refsOf(c)).verdict === 'right') passed.push(`${c}:${name}`);
      }
    }
    // 單筆而且形狀接近直線的字（例如 へ、ノ 類）被一條線蒙混是難免的，不能超過 3%
    expect(passed.length / total).toBeLessThan(0.03);
    // 兩筆以上的字，一條線或一個圈絕對不能過
    for (const c of [...hira, ...kata].filter((x) => refsOf(x).length >= 2)) {
      expect(judgeRecall(line, refsOf(c)).verdict).toBe('wrong');
      expect(judgeRecall(circle, refsOf(c)).verdict).toBe('wrong');
    }
  });

  it('寫得太小（只有標準字的一小角）：算寫錯，每一筆都算漏掉', () => {
    const r = judgeRecall(drawn('あ', 0.15, 50, 50), refsOf('あ'));
    expect(r.verdict).toBe('wrong');
    expect(r.missing).toEqual([0, 1, 2]);
  });

  it('少寫一筆：寫錯，漏掉的筆有列出來（少一筆之後外框變了，其他筆也可能對不上）', () => {
    const user = drawn('き', 1, 0, 0).slice(0, 3); // き 有 4 筆
    const r = judgeRecall(user, refsOf('き'));
    expect(r.verdict).toBe('wrong');
    expect(r.missing).toContain(3);
  });

  it('normalizeToReference：縮放後的外框和標準字一樣大（等比例、中心對齊）', () => {
    const n = normalizeToReference(drawn('あ', 0.5, 40, 10), refsOf('あ'))!;
    const pts = n.flat();
    const w = Math.max(...pts.map((p) => p.x)) - Math.min(...pts.map((p) => p.x));
    const h = Math.max(...pts.map((p) => p.y)) - Math.min(...pts.map((p) => p.y));
    const ref = refsOf('あ').flatMap((d) => samplePath(d));
    const rw = Math.max(...ref.map((p) => p.x)) - Math.min(...ref.map((p) => p.x));
    const rh = Math.max(...ref.map((p) => p.y)) - Math.min(...ref.map((p) => p.y));
    expect(Math.max(w, h)).toBeCloseTo(Math.max(rw, rh), 0);
  });
});
