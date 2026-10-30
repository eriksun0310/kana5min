import { createMemoryRepository } from '../../db/memoryRepository';
import { DAY_MS, MINUTE_MS } from '../../logic/srs';
import { createProgressStore } from '../progressStore';

const NOW = 1_800_000_000_000;

describe('progressStore', () => {
  it('提交一輪結果後更新進度並寫入 repository', async () => {
    const repo = createMemoryRepository();
    const store = createProgressStore();
    await store.getState().load(repo);
    expect(store.getState().loaded).toBe(true);

    const { before, after } = await store.getState().commitRound({ 'h-a': [true, true], 'h-i': [true, false] }, NOW);
    expect(before).toEqual([]);
    expect(after).toHaveLength(2);

    const a = store.getState().progress['h-a'];
    expect(a.level).toBe(1);
    expect(a.nextReviewAt).toBe(NOW + DAY_MS);
    expect(a.learnedAt).toBe(NOW);
    const i = store.getState().progress['h-i'];
    expect(i.level).toBe(0);
    expect(i.nextReviewAt).toBe(NOW + 10 * MINUTE_MS);
    expect(i.wrongCount).toBe(1);

    expect(await repo.getAll()).toHaveLength(2);
  });

  it('關閉 App 再打開：用同一份 repository 重新載入，進度還在', async () => {
    const repo = createMemoryRepository();
    const first = createProgressStore();
    await first.getState().load(repo);
    await first.getState().commitRound({ 'h-a': [true], 'h-ka': [true, true] }, NOW);

    const second = createProgressStore(); // 模擬重新啟動
    await second.getState().load(repo);
    expect(second.getState().progress).toEqual(first.getState().progress);
    expect(second.getState().progress['h-ka'].correctStreak).toBe(2);
  });

  it('第二輪累積：連續答對與等級會延續', async () => {
    const store = createProgressStore();
    await store.getState().load(createMemoryRepository());
    await store.getState().commitRound({ 'h-a': [true, true] }, NOW);
    const { before } = await store.getState().commitRound({ 'h-a': [true] }, NOW + 2 * DAY_MS);
    expect(before[0].level).toBe(1);
    const a = store.getState().progress['h-a'];
    expect(a.level).toBe(2);
    expect(a.correctStreak).toBe(3);
    expect(a.learnedAt).toBe(NOW);
  });

  it('易混淆字答錯時，作答當下就累計該字組的答錯次數（不必等一輪結束）', async () => {
    const repo = createMemoryRepository();
    const store = createProgressStore();
    await store.getState().load(repo);
    await store.getState().recordWrongAnswer('h-nu', NOW);
    await store.getState().recordWrongAnswer('h-me', NOW + 1); // 同一組
    await store.getState().recordWrongAnswer('h-a', NOW); // あ 不屬於任何組
    const confusions = store.getState().confusions;
    expect(confusions).toHaveLength(1);
    expect(confusions[0]).toEqual({ groupId: 'nume', wrongCount: 2, updatedAt: NOW + 1 });
    expect(await repo.getConfusions()).toEqual(confusions);

    // 重新啟動後讀得回來；commitRound 不會重複累計
    const second = createProgressStore();
    await second.getState().load(repo);
    expect(second.getState().confusions[0].wrongCount).toBe(2);
    await second.getState().commitRound({ 'h-nu': [false, true] }, NOW);
    expect(second.getState().confusions[0].wrongCount).toBe(2);
  });

  it('わ・ね・れ 三個字共用同一組的答錯次數', async () => {
    const store = createProgressStore();
    await store.getState().load(createMemoryRepository());
    for (const id of ['h-wa', 'h-ne', 'h-re']) await store.getState().recordWrongAnswer(id, NOW);
    expect(store.getState().confusions).toEqual([{ groupId: 'wanere', wrongCount: 3, updatedAt: NOW }]);
  });

  it('reset 清空記憶與 repository', async () => {
    const repo = createMemoryRepository();
    const store = createProgressStore();
    await store.getState().load(repo);
    await store.getState().commitRound({ 'h-a': [true] }, NOW);
    await store.getState().reset();
    expect(store.getState().progress).toEqual({});
    expect(await repo.getAll()).toEqual([]);
  });

  it('replaceAll 取代全部進度、清空易混淆紀錄並寫入 repository', async () => {
    const repo = createMemoryRepository();
    const store = createProgressStore();
    await store.getState().load(repo);
    await store.getState().commitRound({ 'h-a': [true] }, NOW);
    await store.getState().recordWrongAnswer('h-nu', NOW);
    const next = [
      { kanaId: 'h-i', level: 3, nextReviewAt: NOW, correctStreak: 3, wrongCount: 0, learnedAt: NOW },
    ];
    await store.getState().replaceAll(next);
    expect(Object.keys(store.getState().progress)).toEqual(['h-i']);
    expect(store.getState().confusions).toEqual([]);
    expect(await repo.getAll()).toEqual(next);
    expect(await repo.getConfusions()).toEqual([]);
  });

  it('沒 load 就提交會丟出明確的錯', async () => {
    const store = createProgressStore();
    await expect(store.getState().commitRound({ 'h-a': [true] }, NOW)).rejects.toThrow('repository');
  });
});

describe('每個假名各自計分與混淆對（recordKanaResult／recordConfusion）', () => {
  it('累計對錯與「把 X 當成 Y」，寫入 repository，重新載入還在', async () => {
    const repo = createMemoryRepository();
    const store = createProgressStore();
    await store.getState().load(repo);
    await store.getState().recordKanaResult('h-nu', true, NOW);
    await store.getState().recordKanaResult('h-nu', false, NOW + 1);
    await store.getState().recordKanaResult('h-nu', false, NOW + 2);
    await store.getState().recordConfusion('h-nu', 'h-me', NOW);
    await store.getState().recordConfusion('h-nu', 'h-me', NOW + 5);
    await store.getState().recordConfusion('h-me', 'h-nu', NOW);
    expect(store.getState().kanaStats['h-nu']).toMatchObject({ correctCount: 1, wrongCount: 2, updatedAt: NOW + 2 });

    const again = createProgressStore();
    await again.getState().load(repo);
    expect(again.getState().kanaStats['h-nu']).toMatchObject({ correctCount: 1, wrongCount: 2 });
    const pairs = again.getState().confusionPairs;
    expect(pairs.find((p) => p.truthId === 'h-nu' && p.pickedId === 'h-me')?.count).toBe(2);
    expect(pairs.find((p) => p.truthId === 'h-me' && p.pickedId === 'h-nu')?.count).toBe(1);
  });

  it('相同的字、空字串不記；不影響 SRS 進度與組層級的 confusion', async () => {
    const repo = createMemoryRepository();
    const store = createProgressStore();
    await store.getState().load(repo);
    await store.getState().recordConfusion('h-nu', 'h-nu');
    await store.getState().recordConfusion('', 'h-me');
    expect(store.getState().confusionPairs).toEqual([]);
    await store.getState().recordKanaResult('h-nu', false, NOW);
    expect(store.getState().progress).toEqual({});
    expect(store.getState().confusions).toEqual([]);
  });

  it('reset 與 replaceAll 會一起清掉計分與混淆對；repository 尚未載入時只更新記憶體不丟錯', async () => {
    const early = createProgressStore();
    await expect(early.getState().recordKanaResult('h-a', true, NOW)).resolves.toBeUndefined();
    expect(early.getState().kanaStats['h-a'].correctCount).toBe(1);

    const repo = createMemoryRepository();
    const store = createProgressStore();
    await store.getState().load(repo);
    await store.getState().recordKanaResult('h-a', true, NOW);
    await store.getState().recordConfusion('h-a', 'h-o', NOW);
    await store.getState().reset();
    expect(store.getState().kanaStats).toEqual({});
    expect(store.getState().confusionPairs).toEqual([]);
    expect(await repo.getKanaStats()).toEqual([]);
    expect(await repo.getConfusionPairs()).toEqual([]);
  });
});
