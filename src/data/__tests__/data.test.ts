import {
  allKana,
  allWords,
  byId,
  byRow,
  confusionGroupId,
  exampleWordOf,
  hintFor,
  kanaOfKind,
  newlyReadableWords,
  ROW_ORDER,
  seionGrid,
  seionOrder,
  wordById,
  wordsReadableWith,
} from '..';

describe('kana 資料', () => {
  it('平假名清音 46、濁音 25、拗音 33（片假名見 katakana.test.ts）', () => {
    expect(kanaOfKind('seion')).toHaveLength(46);
    expect(kanaOfKind('dakuon')).toHaveLength(25);
    expect(kanaOfKind('youon')).toHaveLength(33);
    expect(allKana.filter((k) => k.script === 'hiragana')).toHaveLength(104);
  });

  it('平假名 id 不重複，且符合 h-<romaji> 規則（ぢ、づ 例外）', () => {
    const hira = allKana.filter((k) => k.script === 'hiragana');
    const ids = hira.map((k) => k.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const k of hira) {
      if (k.id === 'h-di') expect(k.romaji).toBe('ji');
      else if (k.id === 'h-du') expect(k.romaji).toBe('zu');
      else expect(k.id).toBe(`h-${k.romaji}`);
    }
  });

  it('清音順序為五十音順序，起頭あいうえお、結尾をん', () => {
    const chars = seionOrder().map((k) => k.char).join('');
    expect(chars).toBe('あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん');
  });

  it('特殊字：し shi、ち chi、つ tsu、ふ fu、を wo、ん n', () => {
    expect(byId('h-shi')?.char).toBe('し');
    expect(byId('h-chi')?.char).toBe('ち');
    expect(byId('h-tsu')?.char).toBe('つ');
    expect(byId('h-fu')?.char).toBe('ふ');
    expect(byId('h-wo')?.char).toBe('を');
    expect(byId('h-wo')?.romaji).toBe('wo');
    expect(byId('h-n')?.row).toBe('wa');
  });

  it('各行的字數：5 5 5 5 5 5 5 3 5 3', () => {
    expect(ROW_ORDER.map((r) => byRow(r).length)).toEqual([5, 5, 5, 5, 5, 5, 5, 3, 5, 3]);
  });

  it('筆畫數合理（1–9）且常見字正確', () => {
    for (const k of allKana) expect(k.strokes).toBeGreaterThanOrEqual(1);
    const strokes = (id: string) => byId(id)!.strokes;
    expect([strokes('h-a'), strokes('h-i'), strokes('h-u'), strokes('h-e'), strokes('h-o')]).toEqual([3, 2, 2, 2, 3]);
    expect([strokes('h-ka'), strokes('h-ki'), strokes('h-ku'), strokes('h-ke'), strokes('h-ko')]).toEqual([3, 4, 1, 3, 2]);
    expect(strokes('h-ga')).toBe(5); // か 3 + 濁點 2
    expect(strokes('h-pa')).toBe(4); // は 3 + 半濁點 1
  });

  it('每個字都有存在的例字', () => {
    for (const k of allKana) {
      expect(k.exampleWordId).toBeDefined();
      const w = exampleWordOf(k);
      expect(w).toBeDefined();
      expect(w!.text.length).toBeGreaterThan(0);
      expect(w!.meaning.length).toBeGreaterThan(0);
    }
    expect(exampleWordOf(byId('h-ki')!)?.text).toBe('きく');
  });

  it('單字 id 不重複', () => {
    const ids = allWords.map((w) => w.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(wordById('w-kao')?.meaning).toBe('臉');
  });

  it('易混淆字組互相對應，且 id 都存在', () => {
    for (const k of allKana) {
      for (const other of k.confusableWith ?? []) {
        const o = byId(other);
        expect(o).toBeDefined();
        expect(o!.confusableWith ?? []).toContain(k.id);
      }
    }
    expect(byId('h-nu')?.confusableWith).toEqual(['h-me']);
    expect(byId('h-ru')?.confusableWith).toEqual(['h-ro']);
    expect(byId('h-wa')?.confusableWith).toEqual(['h-ne', 'h-re']);
  });

  it('confusionGroupId：組內每個字得到同一個 id', () => {
    expect(confusionGroupId('h-wa')).toBe(confusionGroupId('h-ne'));
    expect(confusionGroupId('h-wa')).toBe(confusionGroupId('h-re'));
    expect(confusionGroupId('h-nu')).toBe(confusionGroupId('h-me'));
    expect(confusionGroupId('h-a')).toBeUndefined();
  });

  it('五十音表清音排版 55 格，空格位置照設計檔', () => {
    const grid = seionGrid();
    expect(grid).toHaveLength(55);
    expect(grid.filter(Boolean)).toHaveLength(46);
    expect(grid[35]).toBe('h-ya');
    expect(grid[36]).toBeNull();
    expect(grid[37]).toBe('h-yu');
    expect(grid[40]).toBe('h-ra');
    expect(grid[45]).toBe('h-wa');
    expect(grid.slice(46, 49)).toEqual([null, null, null]);
    expect(grid[49]).toBe('h-wo');
    expect(grid[50]).toBe('h-n');
    expect(grid.slice(51)).toEqual([null, null, null, null]);
  });
});

describe('單字與「一行學完」', () => {
  const learnedUpTo = (row: string) => {
    const idx = ROW_ORDER.indexOf(row as (typeof ROW_ORDER)[number]);
    return ROW_ORDER.slice(0, idx + 1).flatMap((r) => byRow(r).map((k) => k.char));
  };

  it.each(ROW_ORDER.map((r) => [r]))('%s 行學完後，至少 4 個含該行新字、且只由已學字組成的單字', (row) => {
    const rowChars = new Set(byRow(row).map((k) => k.char));
    const words = newlyReadableWords(
      learnedUpTo(row).filter((c) => !rowChars.has(c)),
      learnedUpTo(row),
    );
    expect(words.length).toBeGreaterThanOrEqual(4);
    for (const w of words) expect([...w.text].some((c) => rowChars.has(c))).toBe(true);
  });

  it('か行完：設計檔的 かお、あき、いけ、こえ 都能讀', () => {
    const texts = wordsReadableWith(learnedUpTo('ka')).map((w) => w.text);
    for (const t of ['かお', 'あき', 'いけ', 'こえ']) expect(texts).toContain(t);
  });

  it('只學了あ行時，不會出現含か行字的單字', () => {
    const texts = wordsReadableWith(learnedUpTo('a')).map((w) => w.text);
    expect(texts).toContain('あい');
    expect(texts).not.toContain('かお');
  });
});

describe('記憶小提示', () => {
  it('あ行、か行有提示（kana-puns.md 標 ❌ 的け除外），其他行沒有', () => {
    const rejected = new Set(['h-ke']);
    for (const r of ['a', 'ka'])
      for (const k of byRow(r)) {
        if (rejected.has(k.id)) expect(hintFor(k.id)).toBeUndefined();
        else expect(hintFor(k.id)).toBeTruthy();
      }
    for (const r of ROW_ORDER.slice(2)) for (const k of byRow(r)) expect(hintFor(k.id)).toBeUndefined();
    expect(hintFor('h-ku')).toBe('你是在く（哭）喔？');
  });
});
