import { audioMap } from '../../audio/audioMap';
import { wordById } from '..';
import {
  buildSpecialQuestions,
  moraText,
  SPECIAL_KINDS,
  SPECIAL_QUIZ_LENGTH,
  specialSounds,
  YOUON_GRID,
  type SpecialWord,
} from '../specialSounds';

function allSpecialWords(): { kind: string; word: SpecialWord }[] {
  return SPECIAL_KINDS.flatMap((kind) =>
    specialSounds[kind].pairs.flatMap((p) => [
      { kind, word: p.plain },
      { kind, word: p.special },
    ]),
  );
}

/** 固定種子的簡單亂數，讓測試可重現 */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

describe('specialSounds 資料', () => {
  it('每類有 3 組對立詞，兩個詞不同', () => {
    for (const kind of SPECIAL_KINDS) {
      const { pairs } = specialSounds[kind];
      expect(pairs).toHaveLength(3);
      for (const p of pairs) {
        expect(p.plain.wordId).not.toBe(p.special.wordId);
        expect(moraText(p.plain)).not.toBe(moraText(p.special));
        const a = wordById(p.plain.wordId);
        const b = wordById(p.special.wordId);
        expect(a?.meaning).toBeTruthy();
        expect(a?.meaning).not.toBe(b?.meaning);
      }
    }
  });

  it('每個詞都在 words.json，拍陣列串起來等於詞的文字', () => {
    for (const { word } of allSpecialWords()) {
      const w = wordById(word.wordId);
      expect(w).toBeDefined();
      expect(moraText(word)).toBe(w!.text);
    }
  });

  it('每個詞都有一般與慢速音檔', () => {
    for (const { word } of allSpecialWords()) {
      // audioMap 由 gen-audio.mjs 依實際存在的 mp3 產生，有登錄就代表檔案存在
      const entry = audioMap[word.wordId];
      expect(entry?.normal).toBeDefined();
      expect(entry?.slow).toBeDefined();
    }
  });

  it('特殊拍的種類與該類別相符，一般版本沒有特殊拍', () => {
    const expected = { long: 'long', sokuon: 'sokuon', youon: 'youon' } as const;
    for (const kind of SPECIAL_KINDS) {
      for (const p of specialSounds[kind].pairs) {
        expect(p.plain.moras.every((m) => m.type === 'normal')).toBe(true);
        expect(p.special.moras.filter((m) => m.type !== 'normal').map((m) => m.type)).toEqual([
          expected[kind],
        ]);
      }
    }
  });

  it('詞 id 在所有類別中不重複', () => {
    const ids = allSpecialWords().map((x) => x.word.wordId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('拗音 9 格表照設計檔，每格有音檔', () => {
    expect(YOUON_GRID.map((g) => g.char)).toEqual([
      'きゃ', 'きゅ', 'きょ', 'しゃ', 'しゅ', 'しょ', 'ちゃ', 'ちゅ', 'ちょ',
    ]);
    for (const g of YOUON_GRID) {
      expect(audioMap[g.kanaId]?.normal).toBeDefined();
    }
  });
});

describe('buildSpecialQuestions', () => {
  it('每類 6 題，3 對各出正反兩題', () => {
    for (const kind of SPECIAL_KINDS) {
      const qs = buildSpecialQuestions(kind, seeded(7));
      expect(qs).toHaveLength(SPECIAL_QUIZ_LENGTH);
      const answers = qs.map((q) => q.answer.wordId).sort();
      const expected = specialSounds[kind].pairs
        .flatMap((p) => [p.plain.wordId, p.special.wordId])
        .sort();
      expect(answers).toEqual(expected);
    }
  });

  it('選項為同一對的兩個詞，correctIndex 指向答案', () => {
    for (let seed = 1; seed <= 20; seed++) {
      for (const kind of SPECIAL_KINDS) {
        for (const q of buildSpecialQuestions(kind, seeded(seed))) {
          expect(q.options[q.correctIndex].wordId).toBe(q.answer.wordId);
          const pair = specialSounds[kind].pairs.find((p) => p.plain.wordId === q.answer.wordId || p.special.wordId === q.answer.wordId)!;
          expect(q.options.map((o) => o.wordId).sort()).toEqual(
            [pair.plain.wordId, pair.special.wordId].sort(),
          );
          expect(q.answerIsSpecial).toBe(q.answer.wordId === pair.special.wordId);
        }
      }
    }
  });

  it('題序會打散，且盡量不讓同一對連續出現', () => {
    const orders = new Set<string>();
    for (let seed = 1; seed <= 30; seed++) {
      const qs = buildSpecialQuestions('long', seeded(seed));
      orders.add(qs.map((q) => q.answer.wordId).join(','));
      const pairOf = (id: string) =>
        specialSounds.long.pairs.findIndex((p) => p.plain.wordId === id || p.special.wordId === id);
      for (let i = 1; i < qs.length; i++) {
        expect(pairOf(qs[i].answer.wordId)).not.toBe(pairOf(qs[i - 1].answer.wordId));
      }
    }
    expect(orders.size).toBeGreaterThan(5);
  });

  it('正確答案的左右位置兩邊都會出現', () => {
    const positions = new Set<number>();
    for (let seed = 1; seed <= 10; seed++) {
      for (const q of buildSpecialQuestions('sokuon', seeded(seed))) positions.add(q.correctIndex);
    }
    expect(positions).toEqual(new Set([0, 1]));
  });
});
