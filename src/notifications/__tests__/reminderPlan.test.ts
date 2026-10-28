import { toDateKey } from '../../logic/progressStats';
import { planDailyReminders, planRecalls, shouldAskReminder } from '../reminderPlan';

const at = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m - 1, d, h, min).getTime();
const keys = (slots: { date: Date }[]) => slots.map((s) => toDateKey(s.date.getTime()));

describe('planDailyReminders（要排哪幾天）', () => {
  it('現在還沒到提醒時間且今天沒練：從今天起 7 天', () => {
    const slots = planDailyReminders({ now: at(2026, 10, 28, 9), time: '20:00', practiceDates: [] });
    expect(keys(slots)).toEqual([
      '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02', '2026-11-03',
    ]);
    expect(slots[0].id).toBe('kana5min-reminder-20261028');
    expect(slots[0].date.getHours()).toBe(20);
  });

  it('今天已練習：不排今天，改排明天起 7 天', () => {
    const slots = planDailyReminders({ now: at(2026, 10, 28, 9), time: '20:00', practiceDates: ['2026-10-28'] });
    expect(keys(slots)[0]).toBe('2026-10-29');
    expect(slots).toHaveLength(7);
  });

  it('現在已超過提醒時間：不排今天', () => {
    const slots = planDailyReminders({ now: at(2026, 10, 28, 21), time: '20:00', practiceDates: [] });
    expect(keys(slots)[0]).toBe('2026-10-29');
    // 剛好等於提醒時間也已經過了
    expect(keys(planDailyReminders({ now: at(2026, 10, 28, 20, 0), time: '20:00', practiceDates: [] }))[0]).toBe(
      '2026-10-29',
    );
  });

  it('跨月與跨年', () => {
    const month = planDailyReminders({ now: at(2026, 10, 29, 9), time: '20:30', practiceDates: [], days: 4 });
    expect(keys(month)).toEqual(['2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01']);
    const year = planDailyReminders({ now: at(2026, 12, 30, 21), time: '20:00', practiceDates: [], days: 3 });
    expect(keys(year)).toEqual(['2026-12-31', '2027-01-01', '2027-01-02']);
    expect(year[1].id).toBe('kana5min-reminder-20270101');
  });

  it('只有今天練過才跳過今天；昨天練過不影響', () => {
    const slots = planDailyReminders({ now: at(2026, 10, 28, 9), time: '20:00', practiceDates: ['2026-10-27'] });
    expect(keys(slots)[0]).toBe('2026-10-28');
  });

  it('excludeKeys 的日子讓位給召回，仍湊滿天數', () => {
    const slots = planDailyReminders({
      now: at(2026, 10, 28, 9), time: '20:00', practiceDates: [], days: 3, excludeKeys: ['2026-10-29'],
    });
    expect(keys(slots)).toEqual(['2026-10-28', '2026-10-30', '2026-10-31']);
  });

  it('時間格式錯誤：不排', () => {
    expect(planDailyReminders({ now: at(2026, 10, 28, 9), time: 'abc', practiceDates: [] })).toEqual([]);
  });
});

describe('planRecalls', () => {
  it('3 天後與 7 天後，用提醒時間', () => {
    const slots = planRecalls({ now: at(2026, 10, 28, 9), time: '20:30' });
    expect(slots.map((s) => s.id)).toEqual(['kana5min-recall-3', 'kana5min-recall-7']);
    expect(slots[0].date.getTime()).toBe(at(2026, 10, 31, 20, 30));
    expect(slots[1].date.getTime()).toBe(at(2026, 11, 4, 20, 30));
  });
});

describe('shouldAskReminder', () => {
  it('沒問過且提醒未開才問', () => {
    expect(shouldAskReminder({ reminderAsked: false, enabled: false })).toBe(true);
    expect(shouldAskReminder({ reminderAsked: true, enabled: false })).toBe(false);
    expect(shouldAskReminder({ reminderAsked: false, enabled: true })).toBe(false);
  });
});
