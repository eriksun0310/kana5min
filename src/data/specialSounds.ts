// 特殊音（長音、促音、拗音）的教學與練習資料（spec 5.6、docs/architecture.md 第 9 節）。
// 每個詞對應 words.json 的 id，並把詞拆成「拍」，供拍數方塊顯示。

export type SpecialKind = 'long' | 'sokuon' | 'youon';

export const SPECIAL_KINDS: SpecialKind[] = ['long', 'sokuon', 'youon'];

/** 拍的種類：normal 一般、long 長音延長拍、sokuon 促音停頓拍、youon 拗音小字 */
export type MoraType = 'normal' | 'long' | 'sokuon' | 'youon';

export interface Mora {
  char: string;
  type: MoraType;
}

export interface SpecialWord {
  /** words.json 的 id */
  wordId: string;
  /** 依序串起來等於詞的文字 */
  moras: Mora[];
}

/** 一組最小對立詞：plain 是沒有特殊音的版本，special 是有特殊音的版本 */
export interface SpecialPair {
  plain: SpecialWord;
  special: SpecialWord;
}

export interface SpecialInfo {
  kind: SpecialKind;
  /** 分頁上的短標籤 */
  label: string;
  title: string;
  description: string;
  /** 教學頁底部按鈕 */
  practiceLabel: string;
  /** 3 組最小對立詞；第 1 組同時是教學頁的對照組 */
  pairs: SpecialPair[];
  /** 答錯回饋裡「剛剛聽到的是有特殊音的詞」時的補充 */
  specialHint: string;
  /** 答錯回饋裡「剛剛聽到的是沒有特殊音的詞」時的補充 */
  plainHint: string;
}

/**
 * 用簡寫建立拍陣列：以空白分隔每一拍，拍後面可加 `:long`、`:sokuon`、`:youon` 標記種類。
 * 例：mora('お ば あ:long さ ん')
 */
function mora(spec: string): Mora[] {
  return spec.split(' ').map((part) => {
    const [char, type] = part.split(':');
    return { char, type: (type as MoraType | undefined) ?? 'normal' };
  });
}

function word(wordId: string, spec: string): SpecialWord {
  return { wordId, moras: mora(spec) };
}

export const specialSounds: Record<SpecialKind, SpecialInfo> = {
  long: {
    kind: 'long',
    label: '長音',
    title: '長音：把母音拉長一拍',
    description: '每一格是一拍。多一拍，意思就完全不一樣。',
    practiceLabel: '練習聽出長音',
    specialHint: '多了一拍',
    plainHint: '沒有拉長',
    pairs: [
      {
        plain: word('w-obasan', 'お ば さ ん'),
        special: word('w-obaasan', 'お ば あ:long さ ん'),
      },
      {
        plain: word('w-ojisan', 'お じ さ ん'),
        special: word('w-ojiisan', 'お じ い:long さ ん'),
      },
      {
        plain: word('w-yuki', 'ゆ き'),
        special: word('w-yuuki', 'ゆ う:long き'),
      },
    ],
  },
  sokuon: {
    kind: 'sokuon',
    label: '促音',
    title: '促音：小小的 っ，停一拍',
    description: 'っ 不發音，但要停頓一拍再念下一個字。',
    practiceLabel: '練習聽出促音',
    specialHint: '中間多停了一拍',
    plainHint: '中間沒有停頓',
    pairs: [
      {
        plain: word('w-kite', 'き て'),
        special: word('w-kitte', 'き っ:sokuon て'),
      },
      {
        plain: word('w-oto', 'お と'),
        special: word('w-otto', 'お っ:sokuon と'),
      },
      {
        plain: word('w-kako', 'か こ'),
        special: word('w-kakko', 'か っ:sokuon こ'),
      },
    ],
  },
  youon: {
    kind: 'youon',
    label: '拗音',
    title: '拗音：兩個字合成一拍',
    description: 'ゃ ゅ ょ 寫小一點，跟前面的字一起念。',
    practiceLabel: '練習聽出拗音',
    specialHint: '前面的字和小字合成一拍',
    plainHint: '兩個字各念一拍',
    pairs: [
      {
        plain: word('w-biyouin', 'び よ う い ん'),
        special: word('w-byouin', 'び ょ:youon う い ん'),
      },
      {
        plain: word('w-jiyuu', 'じ ゆ う'),
        special: word('w-juu', 'じ ゅ:youon う'),
      },
      {
        plain: word('w-riyou', 'り よ う'),
        special: word('w-ryou', 'り ょ:youon う'),
      },
    ],
  },
};

export function isSpecialKind(v: unknown): v is SpecialKind {
  return v === 'long' || v === 'sokuon' || v === 'youon';
}

/** 拗音頁的 9 格表：[顯示的字, 羅馬拼音, 音檔 id]（照設計檔 C2-17） */
export const YOUON_GRID: { char: string; romaji: string; kanaId: string }[] = [
  ['きゃ', 'kya'],
  ['きゅ', 'kyu'],
  ['きょ', 'kyo'],
  ['しゃ', 'sha'],
  ['しゅ', 'shu'],
  ['しょ', 'sho'],
  ['ちゃ', 'cha'],
  ['ちゅ', 'chu'],
  ['ちょ', 'cho'],
].map(([char, romaji]) => ({ char, romaji, kanaId: `h-${romaji}` }));

/** 拍陣列串成文字 */
export function moraText(w: SpecialWord): string {
  return w.moras.map((m) => m.char).join('');
}

// ---- 練習題 ----

export const SPECIAL_QUIZ_LENGTH = 6;

export interface SpecialQuestion {
  /** 題號（同一輪內唯一） */
  id: string;
  kind: SpecialKind;
  /** 該題播放的詞（正確答案） */
  answer: SpecialWord;
  /** 兩個選項，順序已打散 */
  options: [SpecialWord, SpecialWord];
  /** 正確答案在 options 的位置 */
  correctIndex: 0 | 1;
  /** 正確答案是不是有特殊音的那個詞 */
  answerIsSpecial: boolean;
}

function shuffle<T>(list: T[], rng: () => number): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * 產生一輪 6 題：3 對 × 正反，題序打散（盡量不讓同一對連續出現），選項左右也隨機。
 * rng 可注入以便測試。
 */
export function buildSpecialQuestions(
  kind: SpecialKind,
  rng: () => number = Math.random,
): SpecialQuestion[] {
  const pairs = specialSounds[kind].pairs;
  const all = pairs.flatMap((pair, p) => [
    { p, pair, special: false },
    { p, pair, special: true },
  ]);

  let order = shuffle(all, rng);
  for (let attempt = 0; attempt < 30; attempt++) {
    if (order.every((q, i) => i === 0 || order[i - 1].p !== q.p)) break;
    order = shuffle(all, rng);
  }

  return order.map((q, i) => {
    const answer = q.special ? q.pair.special : q.pair.plain;
    const other = q.special ? q.pair.plain : q.pair.special;
    const correctFirst = rng() < 0.5;
    return {
      id: `${kind}-${i}`,
      kind,
      answer,
      options: correctFirst ? [answer, other] : [other, answer],
      correctIndex: correctFirst ? 0 : 1,
      answerIsSpecial: q.special,
    };
  });
}
