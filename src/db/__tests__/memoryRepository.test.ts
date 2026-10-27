import type { Progress } from '../../data/types';
import { createMemoryRepository } from '../memoryRepository';

const p = (kanaId: string, over: Partial<Progress> = {}): Progress => ({
  kanaId,
  level: 1,
  nextReviewAt: 1000,
  correctStreak: 2,
  wrongCount: 0,
  learnedAt: 500,
  ...over,
});

describe('記憶體 ProgressRepository（進度保存）', () => {
  it('存入後讀回內容一致，包含沒有 learnedAt 的進度', async () => {
    const repo = createMemoryRepository();
    const items = [p('h-a'), p('h-i', { learnedAt: undefined, level: 0 })];
    await repo.upsertMany(items);
    const all = await repo.getAll();
    expect(all).toHaveLength(2);
    expect(all).toEqual(expect.arrayContaining(items));
  });

  it('同一個 kanaId 再存是覆蓋，不會新增', async () => {
    const repo = createMemoryRepository();
    await repo.upsertMany([p('h-a', { level: 1 })]);
    await repo.upsertMany([p('h-a', { level: 4, wrongCount: 2 })]);
    const all = await repo.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].level).toBe(4);
    expect(all[0].wrongCount).toBe(2);
  });

  it('讀出的是複本，改它不會動到儲存的內容', async () => {
    const repo = createMemoryRepository();
    await repo.upsertMany([p('h-a')]);
    const [first] = await repo.getAll();
    first.level = 5;
    const [again] = await repo.getAll();
    expect(again.level).toBe(1);
  });

  it('存入後改原物件，不會影響已儲存的內容', async () => {
    const repo = createMemoryRepository();
    const item = p('h-a');
    await repo.upsertMany([item]);
    item.level = 5;
    expect((await repo.getAll())[0].level).toBe(1);
  });

  it('reset 清空進度與易混淆紀錄', async () => {
    const repo = createMemoryRepository();
    await repo.upsertMany([p('h-a')]);
    await repo.addConfusion('h-nu|h-me', 1000);
    await repo.reset();
    expect(await repo.getAll()).toEqual([]);
    expect(await repo.getConfusions()).toEqual([]);
  });

  it('易混淆字組答錯次數會累加並記錄最後時間', async () => {
    const repo = createMemoryRepository();
    await repo.addConfusion('h-nu|h-me', 1000);
    await repo.addConfusion('h-nu|h-me', 2000, 2);
    await repo.addConfusion('h-ro|h-ru', 3000);
    const list = await repo.getConfusions();
    expect(list.find((c) => c.groupId === 'h-nu|h-me')).toEqual({
      groupId: 'h-nu|h-me',
      wrongCount: 3,
      updatedAt: 2000,
    });
    expect(list).toHaveLength(2);
  });
});
