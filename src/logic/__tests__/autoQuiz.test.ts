import { AUTO_QUIZ_SIZE, buildAutoSession } from '../autoQuiz';
import { buildQuiz } from '../session';
import { prog, seededRng } from './testUtils';

const ids = (n: number) => ['h-a', 'h-i', 'h-u', 'h-e', 'h-o', 'h-ka', 'h-ki', 'h-ku', 'h-ke', 'h-ko', 'h-sa', 'h-shi'].slice(0, n);

describe('buildAutoSession', () => {
  it('沒有已學字：null', () => {
    expect(buildAutoSession([], seededRng(1))).toBeNull();
    expect(buildAutoSession([{ ...prog('h-a'), learnedAt: undefined }], seededRng(1))).toBeNull();
  });

  it('已學字足夠：10 個不同的字各 1 題', () => {
    const s = buildAutoSession(ids(12).map((i) => prog(i)), seededRng(2))!;
    expect(s.newKanaIds).toEqual([]);
    expect(new Set(s.reviewKanaIds).size).toBe(AUTO_QUIZ_SIZE);
    expect(buildQuiz(s, seededRng(3))).toHaveLength(AUTO_QUIZ_SIZE);
  });

  it('已學字不足：兩種題型都出，湊到 10 題（最多 2×字數）', () => {
    const six = buildAutoSession(ids(6).map((i) => prog(i)), seededRng(4))!;
    expect(buildQuiz(six, seededRng(5))).toHaveLength(10);
    const three = buildAutoSession(ids(3).map((i) => prog(i)), seededRng(4))!;
    const qs = buildQuiz(three, seededRng(5));
    expect(qs).toHaveLength(6);
    // 同一個字的兩題題型不同，且每題 4 個選項、答案在選項裡
    for (const q of qs) {
      expect(q.options).toHaveLength(4);
      expect(q.options).toContain(q.answerId);
    }
  });
});
