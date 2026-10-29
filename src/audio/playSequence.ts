import { playKana } from './playKana';

/** 兩個字之間的間隔（毫秒）：一般速度 900、慢速 1400，比單字音檔長一點，聽起來是一個一個念。 */
export function sequenceGapMs(slow: boolean): number {
  return slow ? 1400 : 900;
}

let timers: ReturnType<typeof setTimeout>[] = [];

/** 停掉還沒播完的序列。 */
export function stopSequence(): void {
  for (const t of timers) clearTimeout(t);
  timers = [];
}

/** 依序播放一串假名（聽音選字串用）；再次呼叫會先停掉上一串。回傳全部播完的預估時間（毫秒）。 */
export function playSequence(ids: readonly string[], opts: { slow?: boolean } = {}): number {
  stopSequence();
  const gap = sequenceGapMs(!!opts.slow);
  ids.forEach((id, i) => {
    timers.push(setTimeout(() => void playKana(id, { slow: opts.slow }), i * gap));
  });
  return ids.length * gap;
}
