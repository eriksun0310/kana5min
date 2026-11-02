type Listener = (st: { isLoaded?: boolean; playing?: boolean; didJustFinish?: boolean }) => void;
interface MockPlayer {
  play: jest.Mock;
  pause: jest.Mock;
  remove: jest.Mock;
  seekTo: jest.Mock;
  addListener: jest.Mock;
  source: unknown;
  emit: Listener;
}
const mockPlayers: MockPlayer[] = [];

jest.mock('expo-audio', () => ({
  setAudioModeAsync: jest.fn(() => Promise.resolve()),
  createAudioPlayer: jest.fn((source: unknown) => {
    let listener: Listener = () => {};
    const p: MockPlayer = {
      play: jest.fn(),
      pause: jest.fn(),
      remove: jest.fn(),
      seekTo: jest.fn(() => Promise.resolve()),
      addListener: jest.fn((_ev: string, cb: Listener) => {
        listener = cb;
        return { remove: jest.fn() };
      }),
      source,
      emit: (st) => listener(st),
    };
    mockPlayers.push(p);
    return p;
  }),
}));

jest.mock('../audioMap', () => ({
  audioMap: {
    'h-a': { normal: 'a.mp3', slow: 'a.slow.mp3' },
    'h-i': { normal: 'i.mp3' },
    'h-u': { normal: 'u.mp3' },
    ...Object.fromEntries(Array.from({ length: 40 }, (_, i) => [`x${i}`, { normal: `x${i}.mp3` }])),
  },
}));

import { MAX_PLAYERS, playKana, preloadKana, releaseAllKana, stopKana } from '../playKana';

beforeEach(() => {
  releaseAllKana();
  mockPlayers.length = 0;
});

describe('playKana', () => {
  it('第一次播放：建立播放器並呼叫 play', async () => {
    await playKana('h-a');
    expect(mockPlayers).toHaveLength(1);
    expect(mockPlayers[0].source).toBe('a.mp3');
    expect(mockPlayers[0].play).toHaveBeenCalledTimes(1);
  });

  it('預載：只建立播放器、不播放；之後第一次點直接用預載好的播放器', async () => {
    preloadKana(['h-a', 'h-i', 'h-u']);
    expect(mockPlayers).toHaveLength(3);
    for (const p of mockPlayers) expect(p.play).not.toHaveBeenCalled();
    await playKana('h-i');
    expect(mockPlayers).toHaveLength(3); // 沒有再建新的
    expect(mockPlayers[1].play).toHaveBeenCalledTimes(1);
  });

  it('預載找不到音檔的 id 時略過，不丟錯', () => {
    expect(() => preloadKana(['nope', 'h-a'])).not.toThrow();
    expect(mockPlayers).toHaveLength(1);
  });

  it('點第一個、再點第二個：兩個都有播，第二個播之前先停掉第一個（使用者回報的情境）', async () => {
    preloadKana(['h-a', 'h-i']);
    await playKana('h-a');
    await playKana('h-i');
    expect(mockPlayers[0].play).toHaveBeenCalledTimes(1);
    expect(mockPlayers[0].pause).toHaveBeenCalled();
    expect(mockPlayers[1].play).toHaveBeenCalledTimes(1);
  });

  it('預載還沒載入完就點：先 play，載入完成時再補一次（不會因為太早點而沒聲音）', async () => {
    preloadKana(['h-a']);
    await playKana('h-a');
    expect(mockPlayers[0].play).toHaveBeenCalledTimes(1);
    mockPlayers[0].emit({ isLoaded: true, playing: false });
    expect(mockPlayers[0].play).toHaveBeenCalledTimes(2);
    // 開始播之後不再補
    mockPlayers[0].emit({ isLoaded: true, playing: true });
    mockPlayers[0].emit({ isLoaded: true, playing: false });
    expect(mockPlayers[0].play).toHaveBeenCalledTimes(2);
  });

  it('只是預載、沒有人要播：載入完成不會自己出聲', async () => {
    preloadKana(['h-a']);
    mockPlayers[0].emit({ isLoaded: true, playing: false });
    expect(mockPlayers[0].play).not.toHaveBeenCalled();
  });

  it('同一個聲音再點一次：已載入的播放器先回到開頭再播', async () => {
    await playKana('h-a');
    mockPlayers[0].emit({ isLoaded: true, playing: true });
    mockPlayers[0].emit({ isLoaded: true, didJustFinish: true });
    await playKana('h-a');
    expect(mockPlayers).toHaveLength(1);
    expect(mockPlayers[0].seekTo).toHaveBeenCalledWith(0);
    expect(mockPlayers[0].play).toHaveBeenCalledTimes(2);
  });

  it('慢速用慢速檔；沒有慢速檔時退回一般速度；快慢各有自己的播放器', async () => {
    await playKana('h-a', { slow: true });
    await playKana('h-i', { slow: true });
    await playKana('h-a');
    expect(mockPlayers.map((p) => p.source)).toEqual(['a.slow.mp3', 'i.mp3', 'a.mp3']);
  });

  it('連續快速點兩下：只播最後一次，前一次放棄（不會兩個同時播）', async () => {
    const first = playKana('h-a');
    const second = playKana('h-i');
    await Promise.all([first, second]);
    expect(mockPlayers).toHaveLength(1);
    expect(mockPlayers[0].source).toBe('i.mp3');
    expect(mockPlayers[0].play).toHaveBeenCalledTimes(1);
  });

  it('找不到音檔時安靜略過，不建立播放器', async () => {
    await playKana('no-such-id');
    expect(mockPlayers).toHaveLength(0);
  });

  it('stopKana 暫停目前的聲音，但保留播放器，下次點還是有聲音', async () => {
    await playKana('h-a');
    stopKana();
    expect(mockPlayers[0].pause).toHaveBeenCalled();
    expect(mockPlayers[0].remove).not.toHaveBeenCalled();
    await playKana('h-a');
    expect(mockPlayers).toHaveLength(1);
    expect(mockPlayers[0].play).toHaveBeenCalledTimes(2);
  });

  it('播放器數量有上限：超過時釋放最久沒用的，不釋放正在播的', async () => {
    await playKana('x0'); // 正在播的，雖然最舊也不能被釋放
    const ids = Array.from({ length: MAX_PLAYERS + 5 }, (_, i) => `x${i + 1}`);
    preloadKana(ids);
    const removed = mockPlayers.filter((p) => p.remove.mock.calls.length > 0);
    // 建了 1 + MAX_PLAYERS + 5 個，保留 MAX_PLAYERS 個，所以釋放 6 個
    expect(removed).toHaveLength(6);
    expect(mockPlayers[0].remove).not.toHaveBeenCalled();
    expect(mockPlayers[1].remove).toHaveBeenCalled();
  });
});
