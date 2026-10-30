// 易混淆字組（練習用）：spec 5.6 的 5 組＋批 6 新增的 13 組（審核表 confusable-groups-batch6.md）。docs/architecture.md 第 9 節。
// kana.json 裡額外的 き/さ、は/ほ 只給詳情頁「容易搞混」用，不在這裡。
// 這個檔只放資料；判斷「可用」「已學」等邏輯在 src/logic/confusion.ts。

import type { Script } from './types';

export interface ConfusableGroup {
  /** ascii group id，也是路由與 testID 用的 id */
  id: string;
  /** 顯示用，例如 'ぬ・め' */
  label: string;
  /** 組內的 Kana id（片假名的 id 要等第三階段資料加入後才查得到，使用端必須容忍查不到） */
  members: string[];
  script: Script;
  /** 「差在哪裡」說明 */
  tip: string;
}

/** 預設順序即「同分時」的排序順序。 */
export const confusableGroups: ConfusableGroup[] = [
  {
    id: 'nume',
    label: 'ぬ・め',
    members: ['h-nu', 'h-me'],
    script: 'hiragana',
    tip: 'ぬ 的尾巴多繞一個小圈；め 收尾直接撇出去，沒有圈。',
  },
  {
    id: 'ruro',
    label: 'る・ろ',
    members: ['h-ru', 'h-ro'],
    script: 'hiragana',
    tip: 'る 底部捲成一個圈；ろ 底部是開口，不打圈。',
  },
  {
    id: 'wanere',
    label: 'わ・ね・れ',
    members: ['h-wa', 'h-ne', 'h-re'],
    script: 'hiragana',
    tip: '三個字左邊都是一直線。わ 右邊是往內收的圓弧；ね 和 れ 右邊都往外撇，ね 的尾端多繞一個小圈，れ 沒有圈。',
  },
  {
    id: 'shitsu',
    label: 'シ・ツ',
    members: ['k-shi', 'k-tsu'],
    script: 'katakana',
    tip: 'シ 的點橫著排、長筆由下往上挑；ツ 的點直著排、長筆由上往下撇。',
  },
  {
    id: 'son',
    label: 'ソ・ン',
    members: ['k-so', 'k-n'],
    script: 'katakana',
    tip: 'ソ 的點在上方、長筆由上往下；ン 的點在左側、長筆由下往上挑。',
  },
  // ---- 批 6 新增（平假名） ----
  {
    id: 'hoha',
    label: 'は・ほ',
    members: ['h-ha', 'h-ho'],
    script: 'hiragana',
    tip: 'ほ 比 は 多一橫（は 3 筆，ほ 4 筆）。',
  },
  {
    id: 'kisa',
    label: 'き・さ',
    members: ['h-ki', 'h-sa'],
    script: 'hiragana',
    tip: 'き 有兩條橫線（4 筆），さ 只有一條（3 筆）。',
  },
  {
    id: 'koni',
    label: 'こ・に',
    members: ['h-ko', 'h-ni'],
    script: 'hiragana',
    tip: 'に 左邊多一條直線（に 3 筆，こ 2 筆）。',
  },
  {
    id: 'sumu',
    label: 'す・む',
    members: ['h-su', 'h-mu'],
    script: 'hiragana',
    tip: 'む 右邊多一點（む 3 筆，す 2 筆）。',
  },
  {
    id: 'mayo',
    label: 'ま・よ',
    members: ['h-ma', 'h-yo'],
    script: 'hiragana',
    tip: 'ま 有兩條橫線（3 筆），よ 只有一條橫線（2 筆）。',
  },
  {
    id: 'nome',
    label: 'の・め',
    members: ['h-no', 'h-me'],
    script: 'hiragana',
    tip: 'の 是一筆畫出來的圈，沒有交叉；め 是兩筆，中間有交叉。',
  },
  {
    id: 'tsuu',
    label: 'つ・う',
    members: ['h-tsu', 'h-u'],
    script: 'hiragana',
    tip: 'う 上面多一點、多一筆（う 2 筆，つ 1 筆）。',
  },
  {
    id: 'ao',
    label: 'あ・お',
    members: ['h-a', 'h-o'],
    script: 'hiragana',
    tip: '兩個字都是 3 筆。お 的右上角多一點；あ 沒有那一點。',
  },
  {
    id: 'haba',
    label: 'は・ば・ぱ',
    members: ['h-ha', 'h-ba', 'h-pa'],
    script: 'hiragana',
    tip: 'は 沒有記號；ば 右上是兩點（濁點）；ぱ 右上是一個小圈（半濁點）。ほ・ぼ・ぽ 也是同樣的差別。',
  },
  // ---- 批 6 新增（片假名） ----
  {
    id: 'uwafu',
    label: 'ウ・ワ・フ',
    members: ['k-u', 'k-wa', 'k-fu'],
    script: 'katakana',
    tip: 'ウ 上面有一點（3 筆）；ワ 沒有點，是兩筆；フ 只有一筆。',
  },
  {
    id: 'rure',
    label: 'ル・レ',
    members: ['k-ru', 'k-re'],
    script: 'katakana',
    tip: 'レ 只有一筆；ル 是兩筆，多了左邊一撇。',
  },
  {
    id: 'name',
    label: 'ナ・メ',
    members: ['k-na', 'k-me'],
    script: 'katakana',
    tip: '兩個字都是 2 筆。ナ 有一條橫線；メ 是兩條交叉的斜線，像一個叉。',
  },
  {
    id: 'koyu',
    label: 'コ・ユ',
    members: ['k-ko', 'k-yu'],
    script: 'katakana',
    tip: '兩個字都是 2 筆。ユ 的底線比 コ 長，往右多伸出一截。',
  },
];

export function confusableGroupById(id: string | undefined): ConfusableGroup | undefined {
  return id === undefined ? undefined : confusableGroups.find((g) => g.id === id);
}
