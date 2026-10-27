// 易混淆字組（練習用）：spec 5.6 的 5 組。docs/architecture.md 第 9 節。
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
];

export function confusableGroupById(id: string | undefined): ConfusableGroup | undefined {
  return id === undefined ? undefined : confusableGroups.find((g) => g.id === id);
}
