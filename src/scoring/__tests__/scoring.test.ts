import { createMemoryRepository } from '../../db/memoryRepository';
import { useProgressStore } from '../../store/progressStore';
import { confusedWith, recordConfusion, recordKanaResult } from '..';

describe('計分介面（掉字遊戲與題型引擎共用）', () => {
  beforeEach(async () => {
    await useProgressStore.getState().load(createMemoryRepository());
  });

  it('recordKanaResult／recordConfusion 寫進 progressStore，confusedWith 依次數由多到少', async () => {
    await recordKanaResult('h-nu', false, 1);
    await recordConfusion('h-nu', 'h-me', 1);
    await recordConfusion('h-nu', 'h-me', 2);
    await recordConfusion('h-nu', 'h-ne', 3);
    expect(useProgressStore.getState().kanaStats['h-nu'].wrongCount).toBe(1);
    expect(confusedWith('h-nu')).toEqual([
      { pickedId: 'h-me', count: 2 },
      { pickedId: 'h-ne', count: 1 },
    ]);
    expect(confusedWith('h-a')).toEqual([]);
  });
});
