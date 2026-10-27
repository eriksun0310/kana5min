import { allWords, loanwords, seionOrder, wordById, type Word } from '../../data';
import {
  buildLoanwordQuestion,
  isReadableLoanword,
  LOANWORD_OPTION_COUNT,
  loanwordFeedback,
  loanwordQuestionToDraft,
  mixLoanwordDrafts,
  pickLoanwordDrafts,
  readableLoanwords,
} from '../loanword';
import { seededRng } from './testUtils';

const id = (...chars: string[]) => chars.map((c) => `k-${c}`);
const allSeionIds = seionOrder('katakana').map((k) => k.id);

describe('isReadableLoanword', () => {
  it('コーヒー：只學了 コ ヒ 就可讀（ー 一律可讀）', () => {
    expect(isReadableLoanword('コーヒー', id('ko', 'hi'))).toBe(true);
  });

  it('含未學字時不可讀', () => {
    expect(isReadableLoanword('コーヒー', id('ko'))).toBe(false);
    expect(isReadableLoanword('カメラ', id('ka', 'me'))).toBe(false);
    expect(isReadableLoanword('カメラ', id('ka', 'me', 'ra'))).toBe(true);
  });

  it('只有 ー 或空字串的處理', () => {
    expect(isReadableLoanword('ー', [])).toBe(true);
    expect(isReadableLoanword('', id('a'))).toBe(false);
  });

  it('濁音／半濁音：其清音已學就可讀', () => {
    expect(isReadableLoanword('ガス', id('ka', 'su'))).toBe(true);
    expect(isReadableLoanword('ガス', id('su'))).toBe(false);
    expect(isReadableLoanword('パン', id('ha', 'n'))).toBe(true);
    expect(isReadableLoanword('パン', id('n'))).toBe(false);
    expect(isReadableLoanword('ペン', id('he', 'n'))).toBe(true);
    // ヂ→チ、ヅ→ツ、ジ→シ
    expect(isReadableLoanword('ヂ', id('chi'))).toBe(true);
    expect(isReadableLoanword('ヅ', id('chi'))).toBe(false);
    expect(isReadableLoanword('ジ', id('shi'))).toBe(true);
  });

  it('濁音本身（k-ga）被學過不代表清音已學', () => {
    expect(isReadableLoanword('ガス', ['k-ga', 'k-su'])).toBe(false);
  });

  it('小字：對應的大字已學才可讀（ャ→ヤ、ッ→ツ、ァ→ア）', () => {
    expect(isReadableLoanword('シャツ', id('shi', 'tsu'))).toBe(false); // ャ 對應 ヤ 未學
    expect(isReadableLoanword('シャツ', id('shi', 'tsu', 'ya'))).toBe(true);
    expect(isReadableLoanword('ベッド', id('he', 'to'))).toBe(false); // ッ 對應 ツ 未學
    expect(isReadableLoanword('ベッド', id('he', 'to', 'tsu'))).toBe(true);
    expect(isReadableLoanword('ソファ', id('so', 'fu'))).toBe(false);
    expect(isReadableLoanword('ソファ', id('so', 'fu', 'a'))).toBe(true);
    expect(isReadableLoanword('ジュース', id('shi', 'yu', 'su'))).toBe(true);
    expect(isReadableLoanword('ジュース', id('shi', 'su'))).toBe(false);
  });

  it('不認得的字元（平假名、ヴ、英文）不可讀', () => {
    expect(isReadableLoanword('かめら', allSeionIds)).toBe(false);
    expect(isReadableLoanword('ヴ', allSeionIds)).toBe(false);
    expect(isReadableLoanword('カメラA', allSeionIds)).toBe(false);
  });

  it('清音全學完時，詞庫每個詞都可讀', () => {
    for (const w of allWords.filter((x) => x.script === 'katakana')) {
      expect({ id: w.id, ok: isReadableLoanword(w.text, allSeionIds) }).toEqual({ id: w.id, ok: true });
    }
  });
});

describe('readableLoanwords', () => {
  it('什麼都沒學：空', () => {
    expect(readableLoanwords([])).toEqual([]);
  });

  it('只學 コ ヒ：コーヒー 可讀，カメラ 不可讀', () => {
    const texts = readableLoanwords(id('ko', 'hi')).map((w) => w.text);
    expect(texts).toContain('コーヒー');
    expect(texts).not.toContain('カメラ');
  });

  it('不含 exampleOnly 的詞（例如 ヲタク）', () => {
    const list = readableLoanwords(allSeionIds);
    expect(list.map((w) => w.text)).not.toContain('ヲタク');
    expect(list).toHaveLength(loanwords().length);
    expect(list.every((w) => !w.exampleOnly && w.script === 'katakana')).toBe(true);
  });

  it('學得越多，可讀的詞只增不減', () => {
    let prev = 0;
    const learned: string[] = [];
    for (const id of allSeionIds) {
      learned.push(id);
      const n = readableLoanwords(learned).length;
      expect(n).toBeGreaterThanOrEqual(prev);
      prev = n;
    }
  });
});

describe('buildLoanwordQuestion', () => {
  const coffee = wordById('w-kohi')!;
  const pool = loanwords();

  it('4 個選項，含正解，不重複，correctIndex 指向正解', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const q = buildLoanwordQuestion(coffee, pool, seededRng(seed));
      expect(q.type).toBe('loanword');
      expect(q.word.id).toBe(coffee.id);
      expect(q.options).toHaveLength(LOANWORD_OPTION_COUNT);
      expect(new Set(q.options).size).toBe(LOANWORD_OPTION_COUNT);
      expect(q.options).toContain('咖啡');
      expect(q.options[q.correctIndex]).toBe('咖啡');
    }
  });

  it('干擾項來自 pool 其他詞的意思', () => {
    const small: Word[] = ['w-kamera', 'w-terebi', 'w-keki', 'w-kohi'].map((i) => wordById(i)!).filter(Boolean);
    expect(small.length).toBeGreaterThanOrEqual(3);
    const q = buildLoanwordQuestion(coffee, small, seededRng(7));
    const meanings = new Set(small.map((w) => w.meaning));
    for (const o of q.options) expect(meanings.has(o)).toBe(true);
  });

  it('意思相同的詞不會同時出現在選項（正解的意思不會被當成干擾項）', () => {
    const dup: Word = { ...wordById('w-kamera')!, id: 'w-dup', meaning: '咖啡' };
    for (let seed = 1; seed <= 30; seed++) {
      const q = buildLoanwordQuestion(coffee, [dup, ...pool], seededRng(seed));
      expect(q.options.filter((o) => o === '咖啡')).toHaveLength(1);
      expect(new Set(q.options).size).toBe(q.options.length);
    }
  });

  it('pool 太小時從整個詞庫補足 4 個選項', () => {
    const q = buildLoanwordQuestion(coffee, [coffee], seededRng(3));
    expect(q.options).toHaveLength(4);
    expect(new Set(q.options).size).toBe(4);
    expect(q.options).toContain('咖啡');
  });

  it('相同種子結果相同；正解位置會隨亂數變動', () => {
    const a = buildLoanwordQuestion(coffee, pool, seededRng(11));
    const b = buildLoanwordQuestion(coffee, pool, seededRng(11));
    expect(a).toEqual(b);
    const positions = new Set<number>();
    for (let seed = 1; seed <= 60; seed++) positions.add(buildLoanwordQuestion(coffee, pool, seededRng(seed)).correctIndex);
    expect(positions.size).toBeGreaterThan(1);
  });
});

describe('pickLoanwordDrafts（練習中加入的讀外來語題）', () => {
  const learned10 = ['a', 'i', 'u', 'e', 'o', 'ka', 'ki', 'ku', 'ke', 'ko'].map((c) => `k-${c}`);

  it('沒有可讀詞時回傳空陣列，而且不消耗 rng', () => {
    let calls = 0;
    const rng = () => {
      calls++;
      return 0.5;
    };
    expect(pickLoanwordDrafts([], rng)).toEqual([]);
    // 只有平假名已學：片假名 id 以外的會被忽略
    expect(pickLoanwordDrafts(['h-a', 'h-ka', 'h-ko'], rng)).toEqual([]);
    expect(calls).toBe(0);
  });

  it('1～2 題；題目都是可讀詞，不含 exampleOnly；格式為 loanword 草稿', () => {
    const readable = new Map(readableLoanwords(learned10).map((w) => [w.id, w]));
    expect(readable.size).toBeGreaterThanOrEqual(2);
    const counts = new Set<number>();
    for (let seed = 1; seed <= 80; seed++) {
      const drafts = pickLoanwordDrafts(learned10, seededRng(seed));
      counts.add(drafts.length);
      expect(drafts.length).toBeGreaterThanOrEqual(1);
      expect(drafts.length).toBeLessThanOrEqual(2);
      expect(new Set(drafts.map((d) => d.wordId)).size).toBe(drafts.length);
      for (const d of drafts) {
        expect(d.type).toBe('loanword');
        expect(d.kanaId).toBe('');
        const w = readable.get(d.wordId!);
        expect(w).toBeDefined();
        expect(w!.exampleOnly).toBeFalsy();
        expect(d.options).toHaveLength(4);
        expect(d.answerId).toBe(w!.meaning);
        expect(d.options).toContain(d.answerId);
      }
    }
    expect([...counts].sort()).toEqual([1, 2]);
  });

  it('全部清音都學過時，詞庫裡的 exampleOnly（ヲタク 等）也不會被抽到', () => {
    for (let seed = 1; seed <= 200; seed++) {
      for (const d of pickLoanwordDrafts(allSeionIds, seededRng(seed))) {
        expect(wordById(d.wordId!)!.exampleOnly).toBeFalsy();
      }
    }
  });

  it('可讀詞只有 1 個時只出 1 題', () => {
    // 只學 キ ウ イ：可讀的只有 キウイ
    const ids = ['k-ki', 'k-u', 'k-i'];
    expect(readableLoanwords(ids).map((w) => w.text)).toEqual(['キウイ']);
    for (let seed = 1; seed <= 20; seed++) {
      expect(pickLoanwordDrafts(ids, seededRng(seed))).toHaveLength(1);
    }
  });

  it('prefer：含今天新字的詞優先（ケ 是新字 → 先出 ケーキ）', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const drafts = pickLoanwordDrafts(learned10, seededRng(seed), ['k-ke']);
      expect(drafts.map((d) => d.wordId)).toContain('w-keki');
    }
  });

  it('loanwordQuestionToDraft：answerId 是正確意思、wordId 是詞 id', () => {
    const q = buildLoanwordQuestion(wordById('w-kohi')!, loanwords(), seededRng(1));
    const d = loanwordQuestionToDraft(q);
    expect(d).toMatchObject({ type: 'loanword', kanaId: '', wordId: 'w-kohi', answerId: '咖啡' });
    expect(d.options).toBe(q.options);
  });

  it('mixLoanwordDrafts：插在隨機位置、保留原題順序、重新編號', () => {
    const base = ['a', 'b', 'c', 'd'].map((k) => ({
      kanaId: `h-${k}`,
      type: 'see' as const,
      options: [],
      answerId: `h-${k}`,
    }));
    const drafts = pickLoanwordDrafts(learned10, seededRng(5));
    const positions = new Set<number>();
    for (let seed = 1; seed <= 40; seed++) {
      const out = mixLoanwordDrafts(base, drafts, seededRng(seed));
      expect(out).toHaveLength(base.length + drafts.length);
      expect(out.map((q) => q.id)).toEqual(out.map((_, i) => `q-${i}`));
      expect(out.filter((q) => q.type !== 'loanword').map((q) => q.kanaId)).toEqual(base.map((b) => b.kanaId));
      positions.add(out.findIndex((q) => q.type === 'loanword'));
    }
    expect(positions.size).toBeGreaterThan(1);
  });
});

describe('loanwordFeedback（C2-20 回饋文案）', () => {
  it('答對：コーヒー 讀作 kōhī，「ー」是長音。', () => {
    expect(loanwordFeedback(wordById('w-kohi')!, true)).toBe('答對了！コーヒー 讀作 kōhī，「ー」是長音。');
  });

  it('答錯：コーヒー 是咖啡，讀作 kōhī，「ー」是長音。', () => {
    expect(loanwordFeedback(wordById('w-kohi')!, false)).toBe('コーヒー 是咖啡，讀作 kōhī，「ー」是長音。');
  });

  it('沒有 note 的詞不接 note，句號收尾', () => {
    const kamera = wordById('w-kamera')!;
    expect(kamera.note).toBeUndefined();
    expect(loanwordFeedback(kamera, true)).toBe('答對了！カメラ 讀作 kamera。');
    expect(loanwordFeedback(kamera, false)).toBe('カメラ 是相機，讀作 kamera。');
  });
});
