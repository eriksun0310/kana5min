import { buildShareCard, splitPun } from '../shareCard';
import { themes } from '../../theme/tokens';

describe('buildShareCard', () => {
  it('平假名亮色：大字、讀音、強調字切分、配色取自 token', () => {
    const c = buildShareCard('h-ku', 'light')!;
    expect(c.char).toBe('く');
    expect(c.romaji).toBe('ku');
    expect(c.segments.map((s) => s.text).join('')).toBe('你是在く（哭）喔？ 🥹');
    expect(c.segments.filter((s) => s.highlight)).toEqual([{ text: 'く', highlight: true }]);
    expect(c.colors.bg).toBe(themes.light.bg);
    expect(c.colors.accent).toBe(themes.light.accent);
  });
  it('暗色用暗色 token', () => {
    const c = buildShareCard('h-ku', 'dark')!;
    expect(c.colors).toEqual({
      bg: themes.dark.bg,
      text: themes.dark.text,
      muted: themes.dark.muted,
      accent: themes.dark.accent,
    });
  });
  it('片假名：大字與句中對應字都是片假名', () => {
    const c = buildShareCard('k-ku', 'light')!;
    expect(c.char).toBe('ク');
    expect(c.segments.find((s) => s.highlight)?.text).toBe('ク');
    expect(c.segments.map((s) => s.text).join('')).toContain('你是在ク（哭）喔？');
  });
  it('沒有諧音句的字回傳 undefined', () => {
    for (const id of ['h-ke', 'h-tsu', 'h-hi', 'h-he', 'h-ga', 'h-kya', 'nope']) {
      expect(buildShareCard(id, 'light')).toBeUndefined();
    }
  });
});

describe('splitPun', () => {
  it('句首、句中、找不到', () => {
    expect(splitPun('あ！', 'あ')).toEqual([
      { text: 'あ', highlight: true },
      { text: '！', highlight: false },
    ]);
    expect(splitPun('我的か麻', 'か')).toEqual([
      { text: '我的', highlight: false },
      { text: 'か', highlight: true },
      { text: '麻', highlight: false },
    ]);
    expect(splitPun('abc', 'x')).toEqual([{ text: 'abc', highlight: false }]);
  });
});
