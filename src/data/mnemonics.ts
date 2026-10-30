// 「你可以這樣記」：易混淆組每個字的記法。內容審核表在 mnemonics-batch2.md，
// 句子還沒定的組用 pending: true，畫面會顯示「這組的記法還在整理中」。
// 標記座標用 KanjiVG 的 viewBox（109）。

/** 紅色標記：描出某幾筆，或在字上圈一個橢圓 */
export type MnemonicMark =
  | { kind: 'strokes'; indexes: number[] }
  | { kind: 'ellipse'; cx: number; cy: number; rx: number; ry: number };

export interface MnemonicMember {
  /** Kana id，例如 'h-ru' */
  id: string;
  /** 一句話記法 */
  line: string;
  /** 紅色標記，沒有就只顯示字 */
  marks?: MnemonicMark[];
}

export interface GroupMnemonic {
  /** 對應 confusables 的 group id */
  groupId: string;
  /** 記法還沒定 */
  pending?: boolean;
  members: MnemonicMember[];
  /** 一句話怎麼分 */
  howToTell: string;
}

export const mnemonics: GroupMnemonic[] = [
  {
    groupId: 'ruro',
    members: [
      {
        id: 'h-ru',
        line: 'る ＝ 滷肉飯：下面那圈是滷肉飯的碗，滷汁在碗裡繞一圈。',
        marks: [{ kind: 'ellipse', cx: 60, cy: 73, rx: 28, ry: 23 }],
      },
      { id: 'h-ro', line: 'ろ ＝ 路：只有一條彎路，沒有圈。' },
    ],
    howToTell: '有圈圈的是滷肉飯（る），沒圈的是路（ろ）。',
  },
  {
    groupId: 'nume',
    members: [
      {
        id: 'h-nu',
        line: 'ぬ ＝ 麵：尾巴捲一圈，像麵條纏起來。',
        marks: [{ kind: 'ellipse', cx: 76, cy: 75, rx: 20, ry: 13 }],
      },
      { id: 'h-me', line: 'め ＝ 眼：長得像一顆眼睛，沒有尾巴那一圈。' },
    ],
    howToTell: '尾巴有圈、像麵條纏起來的是ぬ，像眼睛的是め。',
  },
  {
    groupId: 'wanere',
    members: [
      { id: 'h-wa', line: 'わ ＝ 碗：尾巴往裡收，像一個碗。' },
      {
        id: 'h-ne',
        line: 'ね ＝ 貓：尾巴捲一個圈，像貓尾巴捲起來。',
        marks: [{ kind: 'ellipse', cx: 76, cy: 77, rx: 20, ry: 12 }],
      },
      { id: 'h-re', line: 'れ ＝ 腳：尾巴往外踢出去，像伸出去的腳。' },
    ],
    howToTell: '尾巴收進來是わ，捲一個圈是ね，往外踢是れ。',
  },
  {
    groupId: 'shitsu',
    members: [
      {
        id: 'k-shi',
        line: 'シ：兩點在左邊，長筆由左下往右上挑，像水珠往旁邊濺。',
        marks: [{ kind: 'strokes', indexes: [0, 1, 2] }],
      },
      {
        id: 'k-tsu',
        line: 'ツ：兩點在上面，長筆由上往左下撇，像頭上有兩點、身體往下垂。',
        marks: [{ kind: 'strokes', indexes: [0, 1, 2] }],
      },
    ],
    howToTell: '看長筆的方向：シ 由下往上挑，ツ 由上往下撇。',
  },
  {
    groupId: 'son',
    pending: true,
    members: [
      { id: 'k-so', line: '' },
      { id: 'k-n', line: '' },
    ],
    howToTell: '',
  },
];

export function mnemonicOf(groupId: string): GroupMnemonic | undefined {
  return mnemonics.find((m) => m.groupId === groupId);
}
