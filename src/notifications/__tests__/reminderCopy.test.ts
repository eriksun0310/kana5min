import { buildRecall7Copy, buildReminderCopy, GENERIC_BODY } from '../reminderCopy';

describe('buildReminderCopy', () => {
  it('有待複習字：優先於連續天數', () => {
    expect(buildReminderCopy({ dueCount: 5, streak: 9 })).toEqual({
      title: '諧音五十音',
      body: '有 5 個字快忘了，回來複習 3 分鐘',
    });
  });
  it('沒有待複習、連續 ≥2 天', () => {
    expect(buildReminderCopy({ dueCount: 0, streak: 3 }).body).toBe('連續 3 天了，今天別中斷');
    expect(buildReminderCopy({ dueCount: 0, streak: 2 }).body).toBe('連續 2 天了，今天別中斷');
  });
  it('其他：通用文案（連續 1 天也不提）', () => {
    expect(buildReminderCopy({ dueCount: 0, streak: 1 }).body).toBe(GENERIC_BODY);
    expect(buildReminderCopy({ dueCount: 0, streak: 0 }).body).toBe('今天的五十音練習還沒做喔，5 分鐘就好');
  });
});

describe('buildRecall7Copy', () => {
  it('用已學字數；0 時改通用句', () => {
    expect(buildRecall7Copy(12).body).toBe('你已經學了 12 個字，只差一點點，回來繼續吧');
    expect(buildRecall7Copy(0).body).toBe('回來看看，今天只要 3 分鐘');
  });
});
