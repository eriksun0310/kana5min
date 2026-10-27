import { strokesOf } from '../../data/strokes';
import { seionOrder } from '../../data';
import {
  angleBetween,
  evaluateTrace,
  fromViewBox,
  pathEndpoints,
  pathLength,
  requiredStrokeCount,
  samplePath,
  toViewBox,
  traceTransform,
  type Point,
  type Stroke,
} from '../trace';

const line = (a: Point, b: Point, n = 10): Stroke =>
  Array.from({ length: n + 1 }, (_, i) => ({
    x: a.x + ((b.x - a.x) * i) / n,
    y: a.y + ((b.y - a.y) * i) / n,
  }));

describe('samplePath', () => {
  it('絕對與相對指令', () => {
    expect(samplePath('M10,10 L20,10 l0,10 H5 V0')).toEqual([
      { x: 10, y: 10 },
      { x: 20, y: 10 },
      { x: 20, y: 20 },
      { x: 5, y: 20 },
      { x: 5, y: 0 },
    ]);
  });

  it('M 後面的隱含座標視為 L；數字之間可以只用負號分隔', () => {
    const pts = samplePath('M0,0 10,0-5,5');
    expect(pts).toEqual([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: -5, y: 5 },
    ]);
  });

  it('三次貝茲曲線取樣後終點正確，長度介於弦長與控制多邊形之間', () => {
    const pts = samplePath('M0,0c0,10 10,10 10,0');
    expect(pts[pts.length - 1].x).toBeCloseTo(10);
    expect(pts[pts.length - 1].y).toBeCloseTo(0);
    const len = pathLength('M0,0c0,10 10,10 10,0');
    expect(len).toBeGreaterThan(10);
    expect(len).toBeLessThan(30);
  });

  it('pathEndpoints：起點與終點', () => {
    expect(pathEndpoints('M1,2l3,4')).toEqual({ start: { x: 1, y: 2 }, end: { x: 4, y: 6 } });
    expect(pathEndpoints('')).toBeUndefined();
  });

  it('strokes.json 的每一筆都能解析出長度大於 0 的路徑', () => {
    for (const k of seionOrder('hiragana')) {
      const data = strokesOf(k.char);
      expect(data).toBeDefined();
      expect(data!.numbers).toHaveLength(data!.strokes.length);
      for (const d of data!.strokes) expect(pathLength(d)).toBeGreaterThan(1);
    }
  });
});

describe('座標轉換', () => {
  it('畫布與 viewBox 座標互轉', () => {
    const tf = traceTransform(342);
    const p = { x: 120, y: 200 };
    const back = fromViewBox(toViewBox(p, tf), tf);
    expect(back.x).toBeCloseTo(p.x);
    expect(back.y).toBeCloseTo(p.y);
  });

  it('viewBox 中心對應畫布中心', () => {
    const tf = traceTransform(320);
    const c = fromViewBox({ x: 109 / 2, y: 109 / 2 }, tf);
    expect(c.x).toBeCloseTo(160);
    expect(c.y).toBeCloseTo(160);
  });
});

describe('requiredStrokeCount / angleBetween', () => {
  it('筆畫數的一半，四捨五入，至少 1', () => {
    expect(requiredStrokeCount(1)).toBe(1);
    expect(requiredStrokeCount(2)).toBe(1);
    expect(requiredStrokeCount(3)).toBe(2);
    expect(requiredStrokeCount(4)).toBe(2);
    expect(requiredStrokeCount(5)).toBe(3);
  });

  it('夾角', () => {
    expect(angleBetween({ x: 1, y: 0 }, { x: 1, y: 0 })).toBeCloseTo(0);
    expect(angleBetween({ x: 1, y: 0 }, { x: 0, y: 1 })).toBeCloseTo(90);
    expect(angleBetween({ x: 1, y: 0 }, { x: -1, y: 0 })).toBeCloseTo(180);
    expect(angleBetween({ x: 0, y: 0 }, { x: -1, y: 0 })).toBe(0);
  });
});

describe('evaluateTrace', () => {
  // く：1 畫，起點約 (60.7,15)、終點約 (…，…) 朝左下再轉右下；整體向量約往下
  const ku = strokesOf('く')!;
  const kuRef = pathEndpoints(ku.strokes[0])!;
  const along = (s: Point, e: Point) => line(s, e);

  it('く：沿著標準第一筆方向畫一筆就通過', () => {
    const user = [along(kuRef.start, kuRef.end)];
    const r = evaluateTrace(user, ku.strokes);
    expect(r.passed).toBe(true);
    expect(r.strokeCount).toBe(1);
    expect(r.firstStrokeAngle).toBeCloseTo(0, 0);
  });

  it('方向差不到 90 度仍通過，反方向不通過', () => {
    const v = { x: kuRef.end.x - kuRef.start.x, y: kuRef.end.y - kuRef.start.y };
    const ok = [line(kuRef.start, { x: kuRef.start.x + v.y * 0.6 + v.x * 0.4, y: kuRef.start.y - v.x * 0.6 + v.y * 0.4 })];
    expect(evaluateTrace(ok, ku.strokes).passed).toBe(true);
    const reversed = [along(kuRef.end, kuRef.start)];
    const r = evaluateTrace(reversed, ku.strokes);
    expect(r.passed).toBe(false);
    expect(r.reason).toBe('direction');
  });

  it('沒畫或只是輕點：筆畫數不足', () => {
    expect(evaluateTrace([], ku.strokes)).toMatchObject({ passed: false, reason: 'too-few', strokeCount: 0 });
    const tap: Stroke = [
      { x: 50, y: 50 },
      { x: 50.5, y: 50.5 },
    ];
    expect(evaluateTrace([tap], ku.strokes)).toMatchObject({ passed: false, reason: 'too-few' });
  });

  it('あ（3 畫）要至少 2 筆，且第一筆方向要對', () => {
    const a = strokesOf('あ')!;
    const ref = pathEndpoints(a.strokes[0])!;
    const first = line(ref.start, ref.end);
    const second = line({ x: 50, y: 17 }, { x: 46, y: 90 });
    expect(evaluateTrace([first], a.strokes)).toMatchObject({ passed: false, reason: 'too-few', required: 2 });
    expect(evaluateTrace([first, second], a.strokes).passed).toBe(true);
    expect(evaluateTrace([second, first], a.strokes).passed).toBe(false); // 第一筆方向不對
  });

  it('每個清音：照標準路徑的起終點各畫一筆（筆畫數足夠）都通過；全部反向則不通過', () => {
    for (const k of seionOrder('hiragana')) {
      const data = strokesOf(k.char)!;
      const strokes = data.strokes.map((d) => {
        const e = pathEndpoints(d)!;
        return line(e.start, e.end);
      });
      expect(evaluateTrace(strokes, data.strokes).passed).toBe(true);
      const first = pathEndpoints(data.strokes[0])!;
      const reversed = [line(first.end, first.start), ...strokes.slice(1)];
      // 第一筆起終點幾乎重合（封閉形）時方向無法判斷，視為通過；其餘反向必須失敗
      const refLen = Math.hypot(first.end.x - first.start.x, first.end.y - first.start.y);
      if (refLen > 3) expect(evaluateTrace(reversed, data.strokes).passed).toBe(false);
    }
  });
});
