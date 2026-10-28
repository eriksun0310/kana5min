import kana from '../../data/kana.json';
import { strokesOf } from '../../data/strokes';
import { samplePath, type Point, type Stroke } from '../trace';
import { evaluateTrace, maxExtraFor, resample } from '../traceShape';

// 有筆畫資料的假名（平假名＋片假名，含濁音半濁音；拗音是兩個字組成，沒有獨立筆畫資料）
const chars = (kana as { char: string }[]).map((k) => k.char).filter((c) => strokesOf(c));
const refsOf = (c: string) => strokesOf(c)!.strokes;

/** 可重現的亂數（mulberry32） */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 標準筆畫取 12 點，加上每點 ±5 雜訊、整體平移 ±8、縮放 0.9～1.1 */
function wobble(paths: string[], rand: () => number): Stroke[] {
  const dx = (rand() * 2 - 1) * 8;
  const dy = (rand() * 2 - 1) * 8;
  const sc = 0.9 + rand() * 0.2;
  return paths.map((d) =>
    resample(samplePath(d), 12).map((p) => ({
      x: 54.5 + (p.x - 54.5) * sc + dx + (rand() * 2 - 1) * 5,
      y: 54.5 + (p.y - 54.5) * sc + dy + (rand() * 2 - 1) * 5,
    })),
  );
}

const exact = (paths: string[]): Stroke[] => paths.map((d) => samplePath(d));
const shuffle = <T,>(a: T[], rand: () => number) => {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
};

describe('描寫逐筆判定（真實 KanjiVG 資料）', () => {
  it('有足夠的假名可測', () => {
    expect(chars.length).toBeGreaterThanOrEqual(140);
  });

  it('1. 標準筆畫加抖動：每個假名 × 20 組亂數種子，通過率 100%', () => {
    let total = 0;
    const failed: string[] = [];
    for (const c of chars) {
      for (let seed = 1; seed <= 20; seed++) {
        total++;
        const r = evaluateTrace(wobble(refsOf(c), rng(seed * 1000 + c.charCodeAt(0))), refsOf(c));
        if (!r.passed) failed.push(`${c}#${seed} ${JSON.stringify(r)}`);
      }
    }
    expect(failed).toEqual([]);
    expect(total).toBeGreaterThan(2800);
  });

  it('2. 筆順打亂也通過', () => {
    for (const c of chars) {
      for (let seed = 1; seed <= 5; seed++) {
        const rand = rng(seed * 77 + c.charCodeAt(0));
        const r = evaluateTrace(shuffle(wobble(refsOf(c), rand), rand), refsOf(c));
        expect(r.passed).toBe(true);
      }
    }
  });

  it('3. 拿另一個假名的筆畫當輸入：失敗率 ≥ 97%；誤通過的只限「形近字」或「標準字的筆畫是對方的一部分」', () => {
    // 誤通過的原因只有兩種：
    // (a) extra = 0：兩個字的筆畫幾乎重疊（形近字：ぬ／め 不在其中，但 ろ／る、ね／れ、へ／ヘ、り／リ、ば／ぱ、
    //     シ／ツ／ソ／ン 這類，以及平假名與片假名同形者），寬鬆判定本來就分不開；
    // (b) extra ≥ 1：標準字筆畫很少（如 く、こ、し），對方字多出的 1～2 筆在容許範圍內，例如 くす、こに、すキ。
    //     這是「允許多畫 2 筆」的代價；亂塗的情況由第 4、7 點擋掉。
    // 因此這裡不逐對列白名單，而是檢查整體失敗率與兩類比例，並把誤通過的清單印出來備查。
    let pairs = 0;
    const lookAlike: string[] = [];
    const subset: string[] = [];
    for (const a of chars) {
      for (const b of chars) {
        if (a === b) continue;
        pairs++;
        const r = evaluateTrace(exact(refsOf(b)), refsOf(a));
        if (r.passed) (r.extra === 0 ? lookAlike : subset).push(a + b);
      }
    }
    const rate = 1 - (lookAlike.length + subset.length) / pairs;
    // eslint-disable-next-line no-console
    console.log(`反例：${pairs} 組，失敗率 ${(rate * 100).toFixed(2)}%；形近字 ${lookAlike.length} 組、多畫容許 ${subset.length} 組\n形近字：${lookAlike.join(' ')}`);
    expect(rate).toBeGreaterThanOrEqual(0.97);
    // 容易混的字（spec 的易混淆組）必須被分開
    const bad = [['ぬ', 'め'], ['め', 'ぬ'], ['あ', 'お'], ['お', 'あ'], ['さ', 'ち'], ['わ', 'ね'], ['い', 'り'], ['ウ', 'ワ']]
      .filter(([x, y]) => evaluateTrace(exact(refsOf(y)), refsOf(x)).passed)
      .map(([x, y]) => x + y);
    expect(bad).toEqual([]);
  });

  it('4. 亂塗：隨機直線、Z 字形、大圓、單點都失敗', () => {
    const rand = rng(42);
    const line = (a: Point, b: Point): Stroke => Array.from({ length: 11 }, (_, i) => ({ x: a.x + ((b.x - a.x) * i) / 10, y: a.y + ((b.y - a.y) * i) / 10 }));
    const circle: Stroke = Array.from({ length: 41 }, (_, i) => ({ x: 54.5 + 45 * Math.cos((i / 40) * 2 * Math.PI), y: 54.5 + 45 * Math.sin((i / 40) * 2 * Math.PI) }));
    const zig: Stroke[] = [line({ x: 20, y: 20 }, { x: 90, y: 20 }), line({ x: 90, y: 20 }, { x: 20, y: 90 }), line({ x: 20, y: 90 }, { x: 90, y: 90 })];
    const dot: Stroke = [{ x: 50, y: 50 }, { x: 50.2, y: 50.1 }];
    const zigPassed: string[] = [];
    for (const c of chars) {
      const rp = () => ({ x: 10 + rand() * 90, y: 10 + rand() * 90 });
      const randomLines = [line(rp(), rp()), line(rp(), rp()), line(rp(), rp())];
      expect(evaluateTrace(randomLines, refsOf(c)).passed).toBe(false);
      expect(evaluateTrace([circle], refsOf(c)).passed).toBe(false);
      if (evaluateTrace(zig, refsOf(c)).passed) zigPassed.push(c);
      expect(evaluateTrace([dot], refsOf(c)).passed).toBe(false);
      expect(evaluateTrace([], refsOf(c)).passed).toBe(false);
    }
    // ニ 的兩條橫線就在 Z 字的上下，多出的斜線在容許範圍內，這個字的標準寫法本身就包含在 Z 裡
    expect(zigPassed).toEqual(['ニ']);
  });

  it('5. 漏一筆：≤4 筆失敗且 missing 指出那一筆；≥5 筆通過', () => {
    for (const c of chars) {
      const refs = refsOf(c);
      for (let drop = 0; drop < refs.length; drop++) {
        const strokes = exact(refs).filter((_, i) => i !== drop);
        const r = evaluateTrace(strokes, refs);
        if (refs.length <= 4) {
          expect(r.passed).toBe(false);
          expect(r.missing).toContain(drop);
        } else {
          expect(r.passed).toBe(true);
        }
      }
    }
  });

  it('6. 反向畫（起終點互換）失敗', () => {
    let tested = 0;
    for (const c of chars) {
      const refs = refsOf(c);
      const reversed = exact(refs).map((s) => [...s].reverse());
      // 封閉形（起終點幾乎重合）反向仍會沿線，無法判斷；全部都是開口筆畫的字整字反向必須失敗
      const allOpen = refs.every((d) => {
        const p = samplePath(d);
        return Math.hypot(p[0].x - p[p.length - 1].x, p[0].y - p[p.length - 1].y) > 15;
      });
      if (!allOpen) continue;
      tested++;
      expect(evaluateTrace(reversed, refs).passed).toBe(false);
    }
    expect(tested).toBeGreaterThan(40);
  });

  it('7. 多畫超過 2 筆失敗；多畫 2 筆仍通過', () => {
    const extraLine = (i: number): Stroke => [
      { x: 10 + i * 5, y: 100 },
      { x: 100 - i * 5, y: 102 },
    ];
    for (const c of chars) {
      const refs = refsOf(c);
      const base = exact(refs);
      const allowed = maxExtraFor(refs.length);
      expect(evaluateTrace([...base, ...[0, 1].slice(0, allowed).map(extraLine)], refs).passed).toBe(true);
      const r = evaluateTrace([...base, ...[0, 1, 2].slice(0, allowed + 1).map(extraLine)], refs);
      expect(r.passed).toBe(false);
      expect(r.reason).toBe('too-many');
    }
  });

  it('沒有標準筆畫資料（拗音）時直接通過', () => {
    expect(evaluateTrace([], []).passed).toBe(true);
  });
});
