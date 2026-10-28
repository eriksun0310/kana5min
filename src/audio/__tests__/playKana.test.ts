const mockPlayers: { play: jest.Mock; pause: jest.Mock; remove: jest.Mock; source: unknown }[] = [];

jest.mock('expo-audio', () => ({
  setAudioModeAsync: jest.fn(() => Promise.resolve()),
  createAudioPlayer: jest.fn((source: unknown) => {
    const p = { play: jest.fn(), pause: jest.fn(), remove: jest.fn(), source };
    mockPlayers.push(p);
    return p;
  }),
}));

jest.mock('../audioMap', () => ({
  audioMap: {
    'h-a': { normal: 'a.mp3', slow: 'a.slow.mp3' },
    'h-i': { normal: 'i.mp3' },
  },
}));

import { playKana, stopKana } from '../playKana';

beforeEach(() => {
  mockPlayers.length = 0;
  stopKana();
});

describe('playKana', () => {
  it('每次播放都建立新的播放器並播放', async () => {
    await playKana('h-a');
    expect(mockPlayers).toHaveLength(1);
    expect(mockPlayers[0].source).toBe('a.mp3');
    expect(mockPlayers[0].play).toHaveBeenCalledTimes(1);
  });

  it('再播一次：先暫停並釋放上一個播放器', async () => {
    await playKana('h-a');
    await playKana('h-i');
    expect(mockPlayers).toHaveLength(2);
    expect(mockPlayers[0].pause).toHaveBeenCalled();
    expect(mockPlayers[0].remove).toHaveBeenCalled();
    expect(mockPlayers[1].play).toHaveBeenCalledTimes(1);
  });

  it('慢速用慢速檔；沒有慢速檔時退回一般速度', async () => {
    await playKana('h-a', { slow: true });
    await playKana('h-i', { slow: true });
    expect(mockPlayers[0].source).toBe('a.slow.mp3');
    expect(mockPlayers[1].source).toBe('i.mp3');
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

  it('stopKana 會釋放目前的播放器', async () => {
    await playKana('h-a');
    stopKana();
    expect(mockPlayers[0].remove).toHaveBeenCalled();
  });
});
