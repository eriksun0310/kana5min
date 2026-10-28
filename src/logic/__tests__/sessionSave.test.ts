import { toDateKey } from '../progressStats';
import type { QuizQuestion } from '../session';
import {
  hasSessionProgress,
  newQuestionsFirst,
  parseSavedSession,
  serializeSession,
  SESSION_SAVE_VERSION,
  type SavedSession,
} from '../sessionSave';

const NOW = new Date(2026, 9, 28, 10, 0, 0).getTime();

function q(i: number, kanaId: string): QuizQuestion {
  return { id: `q-${i}`, kanaId, type: 'see', options: [kanaId], answerId: kanaId };
}

function saved(over: Partial<SavedSession> = {}): SavedSession {
  return {
    version: SESSION_SAVE_VERSION,
    day: toDateKey(NOW),
    savedAt: NOW,
    mode: 'daily',
    groupId: null,
    phase: 'quiz',
    newKanaIds: [],
    reviewKanaIds: ['h-a'],
    learnedIds: ['h-a'],
    newIndex: 0,
    questions: [q(0, 'h-a')],
    qIndex: 0,
    answers: {},
    loanwordAnswers: [],
    startedAt: NOW,
    usedMs: 1000,
    limitMs: 60_000,
    ...over,
  };
}

describe('sessionSave', () => {
  it('序列化後可以原樣還原', () => {
    const s = saved({ answers: { 'h-a': [true] } });
    expect(parseSavedSession(serializeSession(s), NOW)).toEqual(s);
  });

  it('隔天（本地日期變了）的存檔作廢', () => {
    const raw = serializeSession(saved());
    const tomorrow = new Date(2026, 9, 29, 0, 5, 0).getTime();
    expect(parseSavedSession(raw, tomorrow)).toBeNull();
    // 同一天晚上還在
    expect(parseSavedSession(raw, new Date(2026, 9, 28, 23, 59, 0).getTime())).not.toBeNull();
  });

  it('壞掉的內容、舊版本、缺欄位都回傳 null', () => {
    expect(parseSavedSession(null, NOW)).toBeNull();
    expect(parseSavedSession('not json', NOW)).toBeNull();
    expect(parseSavedSession(JSON.stringify({ ...saved(), version: 99 }), NOW)).toBeNull();
    expect(parseSavedSession(JSON.stringify({ ...saved(), questions: undefined }), NOW)).toBeNull();
  });

  it('hasSessionProgress：什麼都沒做不存；答過題、學過新字、進了測驗才存', () => {
    const none: Parameters<typeof hasSessionProgress>[0] = {
      mode: 'daily',
      phase: 'learn',
      newKanaIds: ['h-a'],
      newIndex: 0,
      answers: {},
      loanwordAnswers: [],
    };
    expect(hasSessionProgress(none)).toBe(false);
    expect(hasSessionProgress({ ...none, newIndex: 1 })).toBe(true);
    expect(hasSessionProgress({ ...none, phase: 'quiz' })).toBe(true);
    // 只有複習、一題都還沒答：沒有進度
    expect(hasSessionProgress({ ...none, phase: 'quiz', newKanaIds: [] })).toBe(false);
    expect(hasSessionProgress({ ...none, answers: { 'h-a': [true] } })).toBe(true);
    expect(hasSessionProgress({ ...none, loanwordAnswers: [false] })).toBe(true);
    // 自動練習剛開始就離開：沒有進度
    expect(hasSessionProgress({ ...none, mode: 'auto', phase: 'quiz' })).toBe(false);
  });

  it('newQuestionsFirst：只動 from 之後的題目，新字題穩定排到前面', () => {
    const qs = [q(0, 'r1'), q(1, 'n1'), q(2, 'r2'), q(3, 'n2'), q(4, 'r3')];
    const r = newQuestionsFirst(qs, 1, new Set(['n1', 'n2']));
    expect(r.hasNew).toBe(true);
    expect(r.questions.map((x) => x.kanaId)).toEqual(['r1', 'n1', 'n2', 'r2', 'r3']);
    const none = newQuestionsFirst(qs, 4, new Set(['n1', 'n2']));
    expect(none.hasNew).toBe(false);
    expect(none.questions).toEqual(qs);
  });
});
