import {
  allLearnTipsSeen,
  entryRoute,
  homeHelpItems,
  migrateTourFlags,
  noLearnTipsSeen,
  TOUR_PAGES,
} from '../tour';

describe('migrateTourFlags（舊資料遷移）', () => {
  it('沒有新欄位、已完成歡迎頁的老使用者：視為都看過', () => {
    expect(migrateTourFlags({ onboarded: true, theme: 'dark' })).toEqual({
      tourSeen: true,
      learnTipsSeen: allLearnTipsSeen(),
    });
  });
  it('沒有新欄位、還沒完成歡迎頁：維持預設（會進導覽）', () => {
    expect(migrateTourFlags({ onboarded: false })).toEqual({ tourSeen: false, learnTipsSeen: noLearnTipsSeen() });
    expect(migrateTourFlags(undefined)).toEqual({ tourSeen: false, learnTipsSeen: noLearnTipsSeen() });
  });
  it('已有欄位時沿用，缺的鍵補預設', () => {
    expect(
      migrateTourFlags({ onboarded: true, tourSeen: false, learnTipsSeen: { intro: true } }),
    ).toEqual({ tourSeen: false, learnTipsSeen: { intro: true, stroke: true, trace: true } });
    expect(migrateTourFlags({ onboarded: false, tourSeen: true, learnTipsSeen: { intro: true } })).toEqual({
      tourSeen: true,
      learnTipsSeen: { intro: true, stroke: false, trace: false },
    });
  });
});

describe('entryRoute', () => {
  it('首次開啟先進導覽，看完進歡迎頁，完成後進首頁', () => {
    expect(entryRoute({ onboarded: false, tourSeen: false })).toBe('tour');
    expect(entryRoute({ onboarded: false, tourSeen: true })).toBe('welcome');
    expect(entryRoute({ onboarded: true, tourSeen: false })).toBe('home');
    expect(entryRoute({ onboarded: true, tourSeen: true })).toBe('home');
  });
});

describe('首頁說明與導覽內容', () => {
  it('說明 5 項，最後一項帶入每日目標分鐘', () => {
    const items = homeHelpItems(10);
    expect(items.map((i) => i.key)).toEqual(['learned', 'due', 'new', 'rows', 'start']);
    expect(items[4].title).toBe('開始今天的 10 分鐘');
    expect(items[0].body).toContain('46');
    expect(items.every((i) => i.body.length > 0)).toBe(true);
  });
  it('導覽 3 頁', () => {
    expect(TOUR_PAGES).toHaveLength(3);
  });
});
