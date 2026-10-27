jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { createMemoryRepository } from '../../db/memoryRepository';
import { DAY_MS, MINUTE_MS } from '../../logic/srs';
import { seededRng } from '../../logic/__tests__/testUtils';
import { useProgressStore } from '../progressStore';
import { seionOrder } from '../../data';
import { currentProgressList, MAX_REVIEW_PER_ROUND, useSessionStore } from '../sessionStore';
import { useSettingsStore } from '../settingsStore';

const NOW = new Date(2026, 9, 27, 10, 0, 0).getTime();

async function freshProgress() {
  await useProgressStore.getState().load(createMemoryRepository());
}

/** 把整輪都答完（全對或指定某題答錯），回傳提交後的結果 */
async function playQuiz(wrongKanaIds: string[] = []) {
  const s = useSessionStore.getState();
  for (const q of s.questions) {
    useSessionStore.getState().recordAnswer(q.kanaId, !wrongKanaIds.includes(q.kanaId));
  }
  return useSessionStore.getState().finish(NOW + 4 * MINUTE_MS);
}

describe('sessionStore（每日練習狀態）', () => {
  beforeEach(async () => {
    await freshProgress();
    useSettingsStore.getState().resetSettings();
    useSessionStore.getState().clear();
  });

  it('第一次練習：3 個新字，依序走完後建立 6 題（每字 2 題）', async () => {
    const out = useSessionStore.getState().startDaily(currentProgressList(), NOW, seededRng(1));
    expect(out).toBe('learn');
    const s = useSessionStore.getState();
    expect(s.newKanaIds).toEqual(['h-a', 'h-i', 'h-u']);
    expect(s.phase).toBe('learn');
    expect(s.questions).toHaveLength(0);

    expect(useSessionStore.getState().advanceNew(seededRng(2))).toBe('next');
    expect(useSessionStore.getState().advanceNew(seededRng(2))).toBe('next');
    expect(useSessionStore.getState().newIndex).toBe(2);
    expect(useSessionStore.getState().advanceNew(seededRng(2))).toBe('quiz');
    const after = useSessionStore.getState();
    expect(after.phase).toBe('quiz');
    expect(after.questions).toHaveLength(6);
  });

  it('全對提交：新字升到 1 級、記錄練習日、結果頁資料正確', async () => {
    useSessionStore.getState().startDaily(currentProgressList(), NOW, seededRng(1));
    useSessionStore.getState().advanceNew(seededRng(2));
    useSessionStore.getState().advanceNew(seededRng(2));
    useSessionStore.getState().advanceNew(seededRng(2));
    const result = await playQuiz();

    expect(result.summary.correct).toBe(6);
    expect(result.summary.total).toBe(6);
    expect(result.summary.newCount).toBe(3);
    expect(result.summary.reviewCount).toBe(0);
    expect(result.summary.items.every((i) => i.label === '新學會' && i.when === '明天')).toBe(true);
    expect(result.completedRows).toEqual([]);

    const p = useProgressStore.getState().progress['h-a'];
    expect(p.level).toBe(1);
    expect(p.learnedAt).toBeDefined();
    expect(p.nextReviewAt).toBe(NOW + 4 * MINUTE_MS + DAY_MS);
    expect(useSettingsStore.getState().practiceDates).toHaveLength(1);
  });

  it('有答錯：該字回 0 級，10 分鐘後再出現，結果頁用答錯文案', async () => {
    useSessionStore.getState().startDaily(currentProgressList(), NOW, seededRng(3));
    for (let i = 0; i < 3; i++) useSessionStore.getState().advanceNew(seededRng(4));
    const result = await playQuiz(['h-i']);
    const item = result.summary.items.find((i) => i.kanaId === 'h-i')!;
    expect(item.label).toBe('答錯 2 次');
    expect(item.tone).toBe('wrong');
    expect(item.when).toBe('10 分鐘後');
    expect(useProgressStore.getState().progress['h-i'].level).toBe(0);
  });

  it('一輪湊滿一行：あ行學完（第 2 輪的 え お か）', async () => {
    const repo = createMemoryRepository();
    await useProgressStore.getState().load(repo);
    await useProgressStore.getState().commitRound({ 'h-a': [true], 'h-i': [true], 'h-u': [true] }, NOW - 2 * DAY_MS);
    // 這時あ行還差 え お
    const out = useSessionStore.getState().startDaily(currentProgressList(), NOW, seededRng(5));
    expect(out).toBe('learn');
    expect(useSessionStore.getState().newKanaIds).toEqual(['h-e', 'h-o', 'h-ka']);
    for (let i = 0; i < 3; i++) useSessionStore.getState().advanceNew(seededRng(6));
    const result = await playQuiz();
    expect(result.completedRows).toEqual(['a']);
    // 複習字 あ い う 已到期，會混在題目裡
    expect(result.summary.reviewCount).toBe(3);
  });

  it('新字都學完：有到期複習就直接進測驗（最多 20 題複習）；沒有到期則回報 empty', async () => {
    const allIds = seionOrder('hiragana').map((k) => k.id);
    const answers = Object.fromEntries(allIds.map((id) => [id, [true]]));
    // 全部在 2 天前學完（1 級 → 1 天後到期，現在都已到期）
    await useProgressStore.getState().commitRound(answers, NOW - 2 * DAY_MS);
    expect(useSessionStore.getState().startDaily(currentProgressList(), NOW, seededRng(1))).toBe('quiz');
    const s = useSessionStore.getState();
    expect(s.phase).toBe('quiz');
    expect(s.newKanaIds).toEqual([]);
    expect(s.questions).toHaveLength(MAX_REVIEW_PER_ROUND);

    // 剛學完、還沒到期：沒有新字也沒有複習
    await freshProgress();
    await useProgressStore.getState().commitRound(answers, NOW);
    expect(useSessionStore.getState().startDaily(currentProgressList(), NOW, seededRng(1))).toBe('empty');
  });

  it('自動練習：沒有已學字回傳 false；有已學字建立題目且不當作新字', async () => {
    expect(useSessionStore.getState().startAuto(currentProgressList(), NOW, seededRng(1))).toBe(false);
    await useProgressStore
      .getState()
      .commitRound({ 'h-a': [true], 'h-i': [true], 'h-u': [true], 'h-e': [true], 'h-o': [true] }, NOW - DAY_MS);
    expect(useSessionStore.getState().startAuto(currentProgressList(), NOW, seededRng(1))).toBe(true);
    const s = useSessionStore.getState();
    expect(s.mode).toBe('auto');
    expect(s.newKanaIds).toEqual([]);
    expect(s.questions).toHaveLength(10);
    const result = await playQuiz(['h-a']);
    expect(result.summary.newCount).toBe(0);
    expect(result.summary.total).toBe(10);
    expect(result.summary.items.find((i) => i.kanaId === 'h-a')?.tone).toBe('wrong');
  });

  it('finish 只提交一次（重複呼叫回傳同一份結果）', async () => {
    useSessionStore.getState().startDaily(currentProgressList(), NOW, seededRng(1));
    for (let i = 0; i < 3; i++) useSessionStore.getState().advanceNew(seededRng(2));
    const first = await playQuiz();
    const again = await useSessionStore.getState().finish(NOW + 99 * MINUTE_MS);
    expect(again).toBe(first);
  });
});
