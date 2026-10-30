// 「你可以這樣記」：對比頁面板的資料。每個字顯示：紅色標記（圈出或描出差異）、一句差異提示（cue），
// 以及好笑記憶包現有的諧音句（由面板即時取用，這裡不重寫諧音）。標記座標用 KanjiVG 的 viewBox（109）。

/** 紅色標記：描出某幾筆、圈一個橢圓，或畫一段自訂路徑（近似位置，用來補充說明） */
export type MnemonicMark =
  | { kind: 'strokes'; indexes: number[] }
  | { kind: 'ellipse'; cx: number; cy: number; rx: number; ry: number }
  | { kind: 'path'; d: string };

export interface MnemonicMember {
  /** Kana id，例如 'h-ru' */
  id: string;
  /** 一句差異提示，顯示在字旁邊（例如「尾巴有圈」） */
  cue?: string;
  /** 紅色標記，沒有就只顯示字 */
  marks?: MnemonicMark[];
}

export interface GroupMnemonic {
  /** 對應 confusables 的 group id */
  groupId: string;
  members: MnemonicMember[];
  /** 一句話怎麼分 */
  howToTell: string;
}

export const mnemonics: GroupMnemonic[] = [
  {
    groupId: 'ruro',
    members: [
      { id: 'h-ru', cue: '底部有圈', marks: [{ kind: 'ellipse', cx: 60, cy: 73, rx: 28, ry: 23 }] },
      { id: 'h-ro', cue: '底部沒有圈' },
    ],
    howToTell: '有圈圈的是る，沒圈的是ろ。',
  },
  {
    groupId: 'nume',
    members: [
      { id: 'h-nu', cue: '尾巴有圈', marks: [{ kind: 'ellipse', cx: 76, cy: 75, rx: 20, ry: 13 }] },
      { id: 'h-me', cue: '尾巴沒有圈' },
    ],
    howToTell: '尾巴有圈的是ぬ，沒有圈的是め。',
  },
  {
    groupId: 'wanere',
    members: [
      { id: 'h-wa', cue: '尾巴往裡收' },
      { id: 'h-ne', cue: '尾巴捲一個圈', marks: [{ kind: 'ellipse', cx: 76, cy: 77, rx: 20, ry: 12 }] },
      { id: 'h-re', cue: '尾巴往外踢' },
    ],
    howToTell: '尾巴收進來是わ，捲一個圈是ね，往外踢是れ。',
  },
  {
    groupId: 'shitsu',
    members: [
      { id: 'k-shi', cue: '長筆由下往上挑', marks: [{ kind: 'strokes', indexes: [0, 1, 2] }] },
      { id: 'k-tsu', cue: '長筆由上往下撇', marks: [{ kind: 'strokes', indexes: [0, 1, 2] }] },
    ],
    howToTell: '看長筆的方向：シ 由下往上挑，ツ 由上往下撇。',
  },
  {
    groupId: 'son',
    members: [
      {
        id: 'k-so',
        cue: '長筆由上往下；下面補一個彎，就是昭和寫法的 そ',
        marks: [
          { kind: 'strokes', indexes: [1] },
          { kind: 'path', d: 'M62,52 C76,47 92,46 95,52 C88,58 56,64 54,82 C53,96 70,102 86,96' },
        ],
      },
      { id: 'k-n', cue: '長筆由下往上挑', marks: [{ kind: 'strokes', indexes: [1] }] },
    ],
    howToTell: '看長筆的方向：ソ 由上往下撇，ン 由下往上挑。',
  },
];

export function mnemonicOf(groupId: string): GroupMnemonic | undefined {
  return mnemonics.find((m) => m.groupId === groupId);
}
