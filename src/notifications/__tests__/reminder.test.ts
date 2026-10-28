import * as Notifications from 'expo-notifications';
import { syncReminders, type ReminderSyncInput } from '../reminder';

const mocked = Notifications as unknown as {
  getPermissionsAsync: jest.Mock;
  requestPermissionsAsync: jest.Mock;
  getAllScheduledNotificationsAsync: jest.Mock;
  cancelScheduledNotificationAsync: jest.Mock;
  scheduleNotificationAsync: jest.Mock;
};

const base: ReminderSyncInput = {
  now: new Date(2026, 9, 28, 9, 0).getTime(),
  enabled: true,
  time: '20:00',
  practiceDates: [],
  dueCount: 4,
  streak: 3,
  learnedCount: 12,
};

const scheduled = () => mocked.scheduleNotificationAsync.mock.calls.map((c) => c[0]);

beforeEach(() => {
  jest.clearAllMocks();
  mocked.getPermissionsAsync.mockResolvedValue({ granted: true });
  mocked.getAllScheduledNotificationsAsync.mockResolvedValue([]);
});

describe('syncReminders', () => {
  it('先取消所有舊的提醒、召回與舊版固定通知，其他通知不動', async () => {
    mocked.getAllScheduledNotificationsAsync.mockResolvedValue([
      { identifier: 'kana5min-daily-reminder' },
      { identifier: 'kana5min-reminder-20261001' },
      { identifier: 'kana5min-recall-3' },
      { identifier: 'something-else' },
    ]);
    await syncReminders({ ...base, enabled: false });
    const ids = mocked.cancelScheduledNotificationAsync.mock.calls.map((c) => c[0]).sort();
    expect(ids).toEqual(['kana5min-daily-reminder', 'kana5min-recall-3', 'kana5min-reminder-20261001']);
    expect(mocked.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('沒開提醒：不排任何東西（也不召回）', async () => {
    await syncReminders({ ...base, enabled: false });
    expect(mocked.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('沒有通知權限：不排，也絕不請求權限', async () => {
    mocked.getPermissionsAsync.mockResolvedValue({ granted: false });
    await syncReminders(base);
    expect(mocked.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(mocked.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('有開：每日提醒＋3、7 天召回；只有最近一則用即時文案；召回日讓位', async () => {
    await syncReminders(base);
    const calls = scheduled();
    const ids = calls.map((c) => c.identifier);
    // 10/28 起 7 天，但 10/31（+3）與 11/4（+7）讓位給召回
    expect(ids).toEqual([
      'kana5min-reminder-20261028',
      'kana5min-reminder-20261029',
      'kana5min-reminder-20261030',
      'kana5min-reminder-20261101',
      'kana5min-reminder-20261102',
      'kana5min-reminder-20261103',
      'kana5min-reminder-20261105',
      'kana5min-recall-3',
      'kana5min-recall-7',
    ]);
    expect(calls[0].content.body).toBe('有 4 個字快忘了，回來複習 3 分鐘');
    expect(calls[1].content.body).toBe('今天的五十音練習還沒做喔，5 分鐘就好');
    expect(calls[7].content.body).toContain('好久不見');
    expect(calls[8].content.body).toBe('你已經學了 12 個字，只差一點點，回來繼續吧');
    expect(calls[0].trigger.type).toBe('date');
  });

  it('今天已練：最近一則是明天，文案用連續天數', async () => {
    await syncReminders({ ...base, dueCount: 0, practiceDates: ['2026-10-28'] });
    const calls = scheduled();
    expect(calls[0].identifier).toBe('kana5min-reminder-20261029');
    expect(calls[0].content.body).toBe('連續 3 天了，今天別中斷');
  });
});
