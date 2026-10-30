// 「作弊測試」：完全不認識假名的人，不能靠猜或排除法答對。
// 做法：把題目轉成「不認識假名的人看得到的樣子」（字形只剩「第幾種」的代號、聲音只剩「哪幾個一樣」的型態），
// 再用各種不看假名的策略去答，答對率不應該顯著高於機率。

import { byId, loanwords } from '../../data';
import { confusableGroupById } from '../../data/confusables';
import { allKana } from '../../data';
import { buildFindAllQuestion, buildReadSeqQuestion, buildSeqQuestion } from '../groupGames';
import { shuffle, type QuizDraft } from '../session';
import {
  buildWordReadQuestion,
  composeRomaji,
  moraFrequency,
  splitMorae,
  wordReadable,
} from '../wordRead';
import { seededRng } from './testUtils';

const group = (id: string) => confusableGroupById(id)!;
const N = 4000;
/** 抽樣時的容許誤差（N 夠大，4 個標準差以內） */
const tol = (p: number, n: number) => 4 * Math.sqrt((p * (1 - p)) / n) + 0.01;

/** 字形 → 第幾種（依第一次出現的順序）。不認識假名的人只看得到這個。 */
function classesOf(ids: readonly string[]): number[] {
  const seen = new Map<string, number>();
  return ids.map((id) => {
    if (!seen.has(id)) seen.set(id, seen.size);
    return seen.get(id)!;
  });
}

const ALL_GROUPS = ['nume', 'ruro', 'wanere', 'shitsu', 'son'];
const learnedOf = (id: string) => new Set(group(id).members);

describe('作弊測試：找出所有（findall）', () => {
  const qs = (idList = ALL_GROUPS) => {
    const out: QuizDraft[] = [];
    for (let i = 0; i < N; i++) {
      const id = idList[i % idList.length];
      // 固定用原本 5 組（片假名只湊得出 2 對）才有 4、6 兩種字形數可以比對
      out.push(buildFindAllQuestion(group(id), learnedOf(id), seededRng(i + 1), new Set(), { groups: ALL_GROUPS.map(group) })!);
    }
    return out;
  };

  it('每種字形出現的次數都一樣：不能靠「出現最多（或最少）次」猜', () => {
    for (const q of qs()) {
      const cls = classesOf(q.cells!);
      const counts = new Map<number, number>();
      for (const c of cls) counts.set(c, (counts.get(c) ?? 0) + 1);
      expect(new Set(counts.values()).size).toBe(1);
    }
  });

  it('答案字形在第幾種（依出現順序）是均勻的：固定猜第 k 種的答對率 ≈ 1/種類數', () => {
    for (const kinds of [4, 6]) {
      const own = qs().filter((q) => new Set(q.cells).size === kinds);
      expect(own.length).toBeGreaterThan(500);
      const hits = new Array<number>(kinds).fill(0);
      for (const q of own) hits[classesOf(q.cells!)[q.cells!.indexOf(q.answerId)]]++;
      for (const h of hits) expect(Math.abs(h / own.length - 1 / kinds)).toBeLessThan(tol(1 / kinds, own.length));
    }
  });

  it('答案不會在特定格子：第 0 格、最後一格的字形是答案的機率 ≈ 1/種類數', () => {
    const own = qs();
    let first = 0;
    let last = 0;
    let expected = 0;
    for (const q of own) {
      const kinds = new Set(q.cells).size;
      expected += 1 / kinds;
      if (q.cells![0] === q.answerId) first++;
      if (q.cells![q.cells!.length - 1] === q.answerId) last++;
    }
    expect(Math.abs(first - expected) / own.length).toBeLessThan(tol(0.2, own.length));
    expect(Math.abs(last - expected) / own.length).toBeLessThan(tol(0.2, own.length));
  });

  it('答案字形的數量（1 或 2 格）和其他字形完全一樣，且與目標是哪一組無關', () => {
    for (const id of ALL_GROUPS) {
      const own = qs([id]).slice(0, 600);
      const twos = own.filter((q) => q.targetIndexes!.length === 2).length / own.length;
      expect(Math.abs(twos - 0.5)).toBeLessThan(tol(0.5, own.length));
    }
  });

  it('每個字形都有一個「長得像的另一個」：不能靠「只有相似字才是答案」猜', () => {
    for (const q of qs().slice(0, 800)) {
      const kinds = new Set(q.cells);
      for (const pair of q.clusters!) for (const id of pair) expect(kinds.has(id)).toBe(true);
      // 所有字形都在某一對裡，答案和干擾都一樣
      expect(q.clusters!.flat().sort()).toEqual([...kinds].sort());
    }
  });

  it('隨機勾一種字形的答對率 ≈ 1/種類數；亂勾格子幾乎不可能全對', () => {
    const own = qs();
    const rng = seededRng(99);
    let ok = 0;
    let expected = 0;
    let randomCells = 0;
    for (const q of own) {
      const kinds = [...new Set(q.cells)];
      expected += 1 / kinds.length;
      if (kinds[Math.floor(rng() * kinds.length)] === q.answerId) ok++;
      const sel = q.cells!.map((_, i) => i).filter(() => rng() < 0.5);
      const t = new Set(q.targetIndexes);
      if (sel.length === t.size && sel.every((i) => t.has(i))) randomCells++;
    }
    expect(Math.abs(ok - expected) / own.length).toBeLessThan(tol(0.2, own.length));
    expect(randomCells / own.length).toBeLessThan(0.05);
  });
});

describe('作弊測試：念出一串（readseq）', () => {
  it('鍵盤內容不隨題目變：相同的已學字，每一題的鍵都一樣', () => {
    const learned = new Set(['h-a', 'h-i', 'h-nu', 'h-me', 'h-ru', 'h-ro', 'h-wa', 'h-ne', 'h-re']);
    const sets = new Set<string>();
    for (let i = 0; i < 600; i++) {
      const id = ['nume', 'ruro', 'wanere'][i % 3];
      const q = buildReadSeqQuestion(group(id), learned, seededRng(i + 1))!;
      sets.add([...q.keyIds!].sort().join(','));
    }
    expect(sets.size).toBe(1);
  });

  it('亂按鍵盤的答對率接近 0；只看字串長度或重複型態也猜不到', () => {
    const learned = new Set(['h-a', 'h-i', 'h-u', 'h-nu', 'h-me', 'h-ru', 'h-ro']);
    const rng = seededRng(5);
    let ok = 0;
    for (let i = 0; i < N; i++) {
      const q = buildReadSeqQuestion(group('nume'), learned, seededRng(i + 1))!;
      const keys = q.keyIds!;
      const typed = q.sequence!.map(() => keys[Math.floor(rng() * keys.length)]);
      if (typed.every((id, j) => byId(id)!.romaji === byId(q.sequence![j])!.romaji)) ok++;
    }
    expect(ok / N).toBeLessThan(0.01);
  });

  it('作答前畫面上沒有任何聲音或拼音可以對照（引擎沒有把答案放進鍵盤以外的欄位）', () => {
    const q = buildReadSeqQuestion(group('nume'), new Set(['h-nu', 'h-me']), seededRng(1))!;
    // options 只是這串用到的字（給計分／出題去重用），畫面不顯示
    expect(q.options.every((id) => q.sequence!.includes(id))).toBe(true);
    expect(q.keyIds!.length).toBeGreaterThanOrEqual(2);
  });
});

describe('作弊測試：聽音選字串（seq）', () => {
  const qs = (n = N) => {
    const out: QuizDraft[] = [];
    for (let i = 0; i < n; i++) {
      const id = ALL_GROUPS[i % ALL_GROUPS.length];
      out.push(buildSeqQuestion(group(id), learnedOf(id), seededRng(i + 1))!);
    }
    return out;
  };
  const dist = (a: string[], b: string[]) => a.filter((x, i) => x !== b[i]).length;

  it('每個選項到其他選項的距離總和相同：沒有「和其他差最多／最少」的選項', () => {
    for (const q of qs(1000)) {
      const sums = q.seqOptions!.map((o) => q.seqOptions!.reduce((s, p) => s + dist(o, p), 0));
      expect(new Set(sums).size).toBe(1);
    }
  });

  it('聽到的聲音型態（哪幾個一樣）和每個選項的字形型態都一樣：不能用型態配對', () => {
    for (const q of qs(1000)) {
      const heard = classesOf(q.sequence!).join(',');
      for (const o of q.seqOptions!) expect(classesOf(o).join(',')).toBe(heard);
    }
  });

  it('答案在第幾個選項是均勻的；固定選第 k 個的答對率 ≈ 1/3', () => {
    const own = qs();
    const hits = [0, 0, 0];
    for (const q of own) hits[q.answerIndex!]++;
    for (const h of hits) expect(Math.abs(h / own.length - 1 / 3)).toBeLessThan(tol(1 / 3, own.length));
  });

  it('選項字串的組成都一樣（同一組字的排列），不能靠「哪個字特別多」猜', () => {
    for (const q of qs(500)) {
      const base = [...q.sequence!].sort().join(',');
      for (const o of q.seqOptions!) expect([...o].sort().join(',')).toBe(base);
    }
  });

  it('「三個選項都一樣的位置」在 4 個位置上均勻分布，答案字串第 0 個字不偏向', () => {
    const own = qs();
    const fixedAt = [0, 0, 0, 0];
    let firstMatchesMajority = 0;
    for (const q of own) {
      const o = q.seqOptions!;
      const same = [0, 1, 2, 3].filter((p) => o.every((s) => s[p] === o[0][p]));
      expect(same).toHaveLength(1);
      fixedAt[same[0]]++;
      // 策略：選「第 0 個字和多數選項相同」的那個
      const maj = o.filter((s) => o.filter((t) => t[0] === s[0]).length >= 2);
      if (maj.length === 1 && maj[0] === q.sequence) firstMatchesMajority++;
    }
    for (const c of fixedAt) expect(Math.abs(c / own.length - 0.25)).toBeLessThan(tol(0.25, own.length));
    expect(firstMatchesMajority / own.length).toBeLessThan(0.01); // 三個選項第 0 個字要嘛全同、要嘛全不同，不存在多數
  });
});

describe('作弊測試：看詞選拼音（wordread）', () => {
  const words = loanwords().filter(wordReadable);
  const questions = () => {
    const out: ReturnType<typeof buildWordReadQuestion>[] = [];
    for (let i = 0; i < N; i++) out.push(buildWordReadQuestion(words[i % words.length], seededRng(i + 1)));
    return out.filter((q): q is NonNullable<typeof q> => q !== undefined);
  };

  it('4 個選項互不相同，只有同一個音節不一樣（兩兩距離都是 1）；恰好一個是正確拼音', () => {
    for (const q of questions().slice(0, 1500)) {
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options).size).toBe(4);
      expect(q.options[q.correctIndex]).toBe(q.word.romaji);
      const morae = splitMorae(q.word.text)!;
      // 把每個選項還原成「第 diffIndex 個音節換成誰」：除了這一個音節，其餘字元都一樣
      const kind = morae[q.diffIndex].kind;
      for (const opt of q.options) {
        const hit = allKana.find(
          (k) =>
            k.script === 'katakana' &&
            k.kind === kind &&
            composeRomaji(morae.map((m, i) => (i === q.diffIndex ? { ...m, kanaId: k.id, romaji: k.romaji } : m))) === opt,
        );
        expect(hit).toBeDefined();
      }
    }
  });

  it('答案在第幾個選項是均勻的', () => {
    const own = questions();
    const hits = [0, 0, 0, 0];
    for (const q of own) hits[q.correctIndex]++;
    for (const h of hits) expect(Math.abs(h / own.length - 0.25)).toBeLessThan(tol(0.25, own.length));
  });

  it('不看假名、只挑「詞庫裡比較常見的音節」的答對率不顯著高於 25%', () => {
    const own = questions();
    let ok = 0;
    for (const q of own) {
      const morae = splitMorae(q.word.text)!;
      const kind = morae[q.diffIndex].kind;
      const freq = q.options.map((opt) => {
        const k = allKana.find(
          (x) =>
            x.script === 'katakana' &&
            x.kind === kind &&
            composeRomaji(morae.map((m, i) => (i === q.diffIndex ? { ...m, kanaId: x.id, romaji: x.romaji } : m))) === opt,
        )!;
        return moraFrequency(k.id);
      });
      const best = Math.max(...freq);
      const top = freq.map((f, i) => (f === best ? i : -1)).filter((i) => i >= 0);
      // 同分時隨機挑
      const pick = top[Math.floor(seededRng(ok + 7)() * top.length)];
      if (pick === q.correctIndex) ok++;
    }
    expect(ok / own.length).toBeLessThan(0.25 + 0.08);
  });

  it('詞的音節數就是選項的音節數：不能靠長短猜（所有選項音節數相同）', () => {
    for (const q of questions().slice(0, 800)) {
      const n = splitMorae(q.word.text)!.length;
      expect(n).toBeGreaterThan(0);
      for (const opt of q.options) expect(opt.length).toBeGreaterThan(0);
    }
  });

  it('shuffle 本身不偏：位置 0 的元素在洗牌後落在各位置的機率相同（出題用的洗牌）', () => {
    const rng = seededRng(3);
    const pos = [0, 0, 0, 0];
    for (let i = 0; i < 8000; i++) pos[shuffle([0, 1, 2, 3], rng).indexOf(0)]++;
    for (const c of pos) expect(Math.abs(c / 8000 - 0.25)).toBeLessThan(0.03);
  });
});
