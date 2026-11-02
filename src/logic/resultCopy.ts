// 結果頁的文字與「再練」按鈕：依剛做完的練習種類，次要連結寫清楚再練什麼。純函式。

import { byId } from '../data';
import { confusableGroupById } from '../data/confusables';
import type { Progress } from '../data/types';
import { justLearnedIds } from './justLearned';

export type ResultMode = 'daily' | 'auto' | 'confuse' | 'focus';

export type AgainTarget =
  | { mode: 'auto' }
  | { mode: 'focus' }
  | { mode: 'confuse'; group: string };

export interface ResultCopy {
  /** 標題：今天的學習才寫「今天完成了」，其他練習寫「練習完成」 */
  title: string;
  /** 「練剛學的字」入口：只有今天的學習學了新字時才有 */
  focus: { label: string } | null;
  /** 次要連結：文字與去向 */
  again: { label: string; target: AgainTarget };
}

export function resultCopy(input: {
  mode: ResultMode;
  groupId: string | null;
  newCount: number;
  after: readonly Progress[];
  now: number;
}): ResultCopy {
  const { mode, groupId, newCount, after, now } = input;
  const recent = justLearnedIds(after, now);
  const chars = recent.map((id) => byId(id)?.char).filter((c): c is string => !!c);

  if (mode === 'confuse' && groupId) {
    const g = confusableGroupById(groupId);
    return {
      title: '練習完成',
      focus: null,
      again: { label: g ? `再練一次這一組（${g.label}）` : '再練一次這一組', target: { mode: 'confuse', group: groupId } },
    };
  }
  if (mode === 'focus') {
    return {
      title: '練習完成',
      focus: null,
      again: { label: `再練一次這 ${recent.length} 個字`, target: { mode: 'focus' } },
    };
  }
  if (mode === 'daily') {
    return {
      title: '今天完成了',
      focus: newCount > 0 && chars.length > 0 ? { label: `練剛學的字（${chars.join(' ')}）` } : null,
      again: { label: '做一份自動練習（10 題）', target: { mode: 'auto' } },
    };
  }
  return { title: '練習完成', focus: null, again: { label: '再做一份自動練習', target: { mode: 'auto' } } };
}
