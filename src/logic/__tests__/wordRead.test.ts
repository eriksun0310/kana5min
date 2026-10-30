import { loanwords, wordById } from '../../data';
import { readableLoanwords } from '../loanword';
import {
  buildWordReadQuestion,
  composeRomaji,
  pickWordReadDrafts,
  pickWordReadDraftsExact,
  splitMorae,
  substitutablePositions,
  wordReadable,
  wordReadFeedback,
  wordReadPool,
} from '../wordRead';
import { seededRng } from './testUtils';

describe('splitMorae／composeRomaji', () => {
  it('音節切分：拗音、促音、長音、小母音', () => {
    expect(splitMorae('キャット')!.map((m) => m.text)).toEqual(['キャ', 'ッ', 'ト']);
    expect(splitMorae('コーヒー')!.map((m) => m.text)).toEqual(['コ', 'ー', 'ヒ', 'ー']);
    expect(splitMorae('ソファ')!.map((m) => m.text)).toEqual(['ソ', 'ファ']);
    expect(splitMorae('xx')).toBeNull();
  });

  it('組出的拼音與詞庫的 romaji 一致（只有已知的例外：ギョウザ 的 ウ 長音寫成 ō）', () => {
    const bad = loanwords().filter((w) => composeRomaji(splitMorae(w.text) ?? []) !== w.romaji);
    expect(bad.map((w) => w.text)).toEqual(['ギョウザ']);
  });

  it('ッ 讓下一個子音重複、ー 加長音符', () => {
    expect(composeRomaji(splitMorae('ベッド')!)).toBe('beddo');
    expect(composeRomaji(splitMorae('コーヒー')!)).toBe('kōhī');
  });

  it('可替換的位置不含 ッ、ー、小母音組合', () => {
    const m = splitMorae('ソファ')!;
    expect(substitutablePositions(m)).toEqual([0]);
    expect(substitutablePositions(splitMorae('ベッド')!)).toEqual([0, 2]);
  });
});

describe('buildWordReadQuestion', () => {
  it('每個可出題的詞都能出題：選項 4 個、答案在選項裡', () => {
    for (const w of loanwords().filter(wordReadable)) {
      const q = buildWordReadQuestion(w, seededRng(7))!;
      expect(q.options).toHaveLength(4);
      expect(q.options[q.correctIndex]).toBe(w.romaji);
    }
  });

  it('草稿格式：沒有對應假名、answerId 是正確的拼音', () => {
    const [d] = pickWordReadDraftsExact(['k-a', 'k-i', 'k-u', 'k-e', 'k-o', 'k-ka', 'k-ki', 'k-ku', 'k-ke', 'k-ko'], seededRng(1), 1);
    expect(d.type).toBe('wordread');
    expect(d.kanaId).toBe('');
    expect(d.answerId).toBe(wordById(d.wordId!)!.romaji);
    expect(d.options).toContain(d.answerId);
  });

  it('沒有可讀詞時 pick 回傳空陣列且不消耗 rng', () => {
    let calls = 0;
    const rng = () => (calls++, 0.5);
    expect(pickWordReadDrafts(['h-a', 'k-a'], rng)).toEqual([]);
    expect(pickWordReadDraftsExact(['k-a'], rng, 2)).toEqual([]);
    expect(calls).toBe(0);
  });

  it('每日練習：1～2 題，只抽目前可讀的詞，prefer 的字優先', () => {
    const learned = ['k-a', 'k-i', 'k-u', 'k-e', 'k-o', 'k-ka', 'k-ki', 'k-ku', 'k-ke', 'k-ko', 'k-sa', 'k-shi', 'k-su'];
    const readable = new Set(readableLoanwords(learned).map((w) => w.id));
    expect(wordReadPool(learned).every((w) => readable.has(w.id))).toBe(true);
    for (let seed = 1; seed <= 30; seed++) {
      const ds = pickWordReadDrafts(learned, seededRng(seed), ['k-sa']);
      expect(ds.length).toBeGreaterThanOrEqual(1);
      expect(ds.length).toBeLessThanOrEqual(2);
      for (const d of ds) expect(readable.has(d.wordId!)).toBe(true);
    }
  });

  it('回饋文案：答完才有意思', () => {
    const w = wordById('w-kohi')!;
    expect(wordReadFeedback(w, true)).toContain(w.meaning);
    expect(wordReadFeedback(w, false)).toContain(w.romaji);
    expect(wordReadFeedback(w, false)).toContain(w.meaning);
  });
});
