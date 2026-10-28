import {
  allKana,
  allWords,
  byId,
  byRow,
  confusionGroupId,
  exampleWordOf,
  FREE_SOUNDS,
  hintFor,
  isFreeSound,
  kanaOfKind,
  newlyReadableWords,
  punFor,
  PUN_COUNT,
  PUNS,
  ROW_ORDER,
  seionGrid,
  seionOrder,
  soundOf,
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

describe('好笑記憶包諧音梗（puns）', () => {
  const sounds = Object.keys(PUNS);

  it('共 41 句：只收 kana-puns.md 標 ✅ 的讀音，け、つ、ひ、ふ、へ 不收', () => {
    expect(PUN_COUNT).toBe(41);
    expect(sounds).toHaveLength(41);
    for (const s of ['ke', 'tsu', 'hi', 'fu', 'he']) expect(PUNS[s]).toBeUndefined();
  });

  it('每個 key 都是清音讀音，且對應存在的平假名與片假名', () => {
    for (const s of sounds) {
      expect(byId(`h-${s}`)?.kind).toBe('seion');
      expect(byId(`k-${s}`)?.kind).toBe('seion');
    }
  });

  it('沒有 emoji、沒有半形括號、沒有頭尾與連續空白', () => {
    const emoji = /\p{Extended_Pictographic}/u;
    for (const [s, text] of Object.entries(PUNS)) {
      expect({ s, emoji: emoji.test(text) }).toEqual({ s, emoji: false });
      expect({ s, half: /[()]/.test(text) }).toEqual({ s, half: false });
      expect({ s, trim: text === text.trim() }).toEqual({ s, trim: true });
      expect({ s, multi: /\s{2,}/.test(text) }).toEqual({ s, multi: false });
      expect({ s, paren: text.includes('（') && text.includes('）') || !text.includes('（') }).toEqual({
        s,
        paren: true,
      });
    }
  });

  it('每句都含對應的平假名字元', () => {
    for (const s of sounds) expect(PUNS[s]).toContain(byId(`h-${s}`)!.char);
  });

  it('あ行與か行的讀音免費（け 沒有句子）', () => {
    expect(FREE_SOUNDS).toEqual(['a', 'i', 'u', 'e', 'o', 'ka', 'ki', 'ku', 'ke', 'ko']);
    for (const s of ['a', 'i', 'u', 'e', 'o', 'ka', 'ki', 'ku', 'ko']) expect(PUNS[s]).toBeTruthy();
    expect(PUNS.sa).toBeTruthy();
    expect(isFreeSound('ku')).toBe(true);
    expect(isFreeSound('sa')).toBe(false);
  });

  it('soundOf：清音回傳讀音，濁音、拗音與未知 id 沒有', () => {
    expect(soundOf('h-ku')).toBe('ku');
    expect(soundOf('k-ku')).toBe('ku');
    expect(soundOf('h-shi')).toBe('shi');
    expect(soundOf('k-wo')).toBe('wo');
    expect(soundOf('h-ga')).toBeUndefined();
    expect(soundOf('h-kya')).toBeUndefined();
    expect(soundOf('nope')).toBeUndefined();
  });

  it('punFor：平假名回傳原句，片假名把第一個對應字元換成片假名', () => {
    expect(punFor('h-ku')).toBe('你是在く（哭）喔？');
    expect(punFor('k-ku')).toBe('你是在ク（哭）喔？');
    expect(punFor('k-mo')).toBe('上班不要再 モ（摸）魚了！');
    expect(punFor('k-yu')).toBe('愛老虎ユ！');
    expect(punFor('h-ga')).toBeUndefined();
    expect(punFor('h-ke')).toBeUndefined();
    expect(punFor('h-tsu')).toBeUndefined();
  });

  it('片假名句子只有一個字元不同於平假名句，且沒有殘留的對應平假名', () => {
    for (const s of sounds) {
      const hira = punFor(`h-${s}`)!;
      const kata = punFor(`k-${s}`)!;
      expect(kata).not.toBe(hira);
      expect(kata).toContain(byId(`k-${s}`)!.char);
      expect([...kata].length).toBe([...hira].length);
    }
  });

  it('hintFor 改由 puns 供應：あ行、か行（除了け）有，さ行起也有（解鎖與否由 PunCard 決定）', () => {
    expect(hintFor('h-ku')).toBe('你是在く（哭）喔？');
    expect(hintFor('h-ke')).toBeUndefined();
    expect(hintFor('h-sa')).toBe('さ（殺）小？');
  });
});
