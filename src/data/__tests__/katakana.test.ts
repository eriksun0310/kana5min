import {
  allKana,
  allWords,
  byId,
  exampleWordOf,
  hiraganaOf,
  kanaOfKind,
  loanwords,
  seionGrid,
  seionOrder,
  wordById,
} from '..';
import { strokesOf } from '../strokes';

const kata = allKana.filter((k) => k.script === 'katakana');
const hira = allKana.filter((k) => k.script === 'hiragana');

describe('片假名資料', () => {
  it('清音 46、濁音半濁音 25、拗音 33', () => {
    expect(kanaOfKind('seion', 'katakana')).toHaveLength(46);
    expect(kanaOfKind('dakuon', 'katakana')).toHaveLength(25);
    expect(kanaOfKind('youon', 'katakana')).toHaveLength(33);
    expect(kata).toHaveLength(104);
  });

  it('清音順序為五十音順序，起頭アイウエオ、結尾ヲン', () => {
    expect(seionOrder('katakana').map((k) => k.char).join('')).toBe(
      'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン',
    );
  });

  it('id 唯一，符合 k-<romaji>（ヂ k-di、ヅ k-du 例外），不與平假名重複', () => {
    const ids = allKana.map((k) => k.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const k of kata) {
      if (k.id === 'k-di') expect(k.romaji).toBe('ji');
      else if (k.id === 'k-du') expect(k.romaji).toBe('zu');
      else expect(k.id).toBe(`k-${k.romaji}`);
    }
    expect(byId('k-di')?.char).toBe('ヂ');
    expect(byId('k-du')?.char).toBe('ヅ');
  });

  it('每個片假名的 hiraganaId 都存在，且讀音、種類、行都與平假名一致', () => {
    for (const k of kata) {
      expect(k.hiraganaId).toBeDefined();
      const h = hiraganaOf(k);
      expect(h).toBeDefined();
      expect(h!.script).toBe('hiragana');
      expect(h!.romaji).toBe(k.romaji);
      expect(h!.kind).toBe(k.kind);
      expect(h!.row).toBe(k.row);
    }
    // 每個平假名恰好被一個片假名對應
    expect(new Set(kata.map((k) => k.hiraganaId)).size).toBe(hira.length);
  });

  it('每個片假名都有 diffNote（一句話）', () => {
    for (const k of kata) {
      expect(k.diffNote && k.diffNote.length).toBeGreaterThan(5);
      expect(k.diffNote).not.toContain('\n');
    }
    expect(byId('k-ka')?.diffNote).toContain('か');
  });

  it('筆畫數等於 strokes.json（拗音 = 兩字相加），平假名與片假名都檢查', () => {
    for (const k of allKana) {
      const total = [...k.char].reduce((sum, c) => {
        const data = strokesOf(c);
        expect(data).toBeDefined();
        return sum + data!.strokes.length;
      }, 0);
      expect({ id: k.id, strokes: k.strokes }).toEqual({ id: k.id, strokes: total });
    }
  });

  it('易混淆：シ↔ツ、ソ↔ン 互相指向，其他沒有', () => {
    expect(byId('k-shi')?.confusableWith).toEqual(['k-tsu']);
    expect(byId('k-tsu')?.confusableWith).toEqual(['k-shi']);
    expect(byId('k-so')?.confusableWith).toEqual(['k-n']);
    expect(byId('k-n')?.confusableWith).toEqual(['k-so']);
    const others = kata.filter((k) => !['k-shi', 'k-tsu', 'k-so', 'k-n'].includes(k.id));
    expect(others.every((k) => !k.confusableWith?.length)).toBe(true);
  });

  it('特殊字：ヲ 顯示 wo、ン 在 wa 行', () => {
    expect(byId('k-wo')?.romaji).toBe('wo');
    expect(byId('k-n')?.row).toBe('wa');
  });

  it('清音排版 55 格與平假名相同，id 為 k-', () => {
    const grid = seionGrid('katakana');
    expect(grid).toHaveLength(55);
    expect(grid.filter(Boolean)).toHaveLength(46);
    expect(grid.filter(Boolean).every((id) => byId(id!)?.script === 'katakana')).toBe(true);
    expect(grid[0]).toBe('k-a');
    expect(grid[36]).toBeNull();
    expect(grid[49]).toBe('k-wo');
    expect(grid[50]).toBe('k-n');
    // 平假名排版不受影響
    expect(seionGrid()[0]).toBe('h-a');
  });
});

describe('外來語詞庫', () => {
  const kataWords = allWords.filter((w) => w.script === 'katakana');

  /** 詞庫可處理的字元：片假名清音、濁音、小字、長音 */
  const allowed = new Set([
    ...kata.filter((k) => k.kind !== 'youon').map((k) => k.char),
    ...'ャュョッァィゥェォー',
  ]);

  it('至少 40 個外來語（不含只當例字用的詞）', () => {
    expect(loanwords().length).toBeGreaterThanOrEqual(40);
    expect(loanwords().every((w) => !w.exampleOnly)).toBe(true);
  });

  it('單字 id 唯一、有 romaji 與中文意思', () => {
    const ids = allWords.map((w) => w.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const w of kataWords) {
      expect(w.romaji.length).toBeGreaterThan(0);
      expect(w.meaning.length).toBeGreaterThan(0);
    }
  });

  it('外來語每個詞的字元都在可處理的集合內', () => {
    for (const w of kataWords) {
      for (const c of w.text) expect({ id: w.id, c, ok: allowed.has(c) }).toEqual({ id: w.id, c, ok: true });
    }
  });

  it('外來語 romaji 表記一致：長音用 ā ī ū ē ō，不用 aa／ii／uu／ee／oo', () => {
    for (const w of kataWords) {
      expect(w.romaji).not.toMatch(/aa|ii|uu|ee|oo/);
      expect(w.romaji).toMatch(/^[a-zāīūēō]+$/);
      if (w.text.includes('ー')) expect(w.romaji).toMatch(/[āīūēō]/);
    }
    expect(wordById('w-kohi')?.romaji).toBe('kōhī');
  });

  it('含「ー」的詞有說明長音的 note', () => {
    for (const w of kataWords.filter((x) => x.text.includes('ー'))) {
      expect(w.note).toContain('長音');
    }
    expect(wordById('w-kohi')?.note).toBe('「ー」是長音。');
  });

  it('每個片假名都有存在的例字（script 為 katakana），且例字含此字', () => {
    for (const k of kata) {
      const w = exampleWordOf(k);
      expect({ id: k.id, found: w !== undefined }).toEqual({ id: k.id, found: true });
      expect(w!.script).toBe('katakana');
      expect({ id: k.id, contains: w!.text.includes(k.char) }).toEqual({ id: k.id, contains: true });
    }
    expect(exampleWordOf(byId('k-ka')!)?.text).toBe('カメラ');
  });

  it('清音每個字都至少出現在一個外來語詞裡（ヲ 除外，用 exampleOnly 的 ヲタク）', () => {
    const texts = loanwords().map((w) => w.text);
    for (const k of seionOrder('katakana')) {
      if (k.char === 'ヲ') continue;
      expect({ c: k.char, used: texts.some((t) => t.includes(k.char)) }).toEqual({ c: k.char, used: true });
    }
  });

  it('exampleOnly 的詞都確實被當成某個假名的例字；ヲ 的例字是 ヲタク', () => {
    const exampleIds = new Set(kata.map((k) => k.exampleWordId));
    for (const w of kataWords.filter((x) => x.exampleOnly)) expect(exampleIds.has(w.id)).toBe(true);
    expect(byId('k-wo')?.exampleWordId).toBe('w-otaku');
    expect(wordById('w-otaku')?.exampleOnly).toBe(true);
  });
});
