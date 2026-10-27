import { resolveTheme } from '../resolve';
import { dark, light } from '../tokens';

describe('主題 token', () => {
  it('亮暗兩組鍵名一致', () => {
    expect(Object.keys(dark).sort()).toEqual(Object.keys(light).sort());
  });

  it('spec 第 7 節的 11 個 token 數值正確', () => {
    expect(dark).toMatchObject({
      bg: '#15171B', surface: '#1F2228', line: '#2C3038', text: '#F1EFEA', muted: '#A9A59D', track: '#2C3038',
      chip: '#262A31', accentText: '#F2B54A', accentSoft: '#3A3020', correct: '#7FC8A9', wrong: '#F28C7A',
    });
    expect(light).toMatchObject({
      bg: '#F7F5F1', surface: '#FFFFFF', line: '#E7E3DC', text: '#1C1E22', muted: '#5F5B54', track: '#E5E1DA',
      chip: '#F0EDE7', accentText: '#8A5F0E', accentSoft: '#FBEFD6', correct: '#2F8A63', wrong: '#D9644F',
    });
  });

  it('accent 與 onAccent 兩主題相同', () => {
    expect(dark.accent).toBe('#F2B54A');
    expect(light.accent).toBe('#F2B54A');
    expect(dark.onAccent).toBe('#15171B');
    expect(light.onAccent).toBe('#15171B');
  });
});

describe('resolveTheme', () => {
  it('system 跟隨系統，系統未知時用亮色', () => {
    expect(resolveTheme('system', 'dark')).toBe('dark');
    expect(resolveTheme('system', 'light')).toBe('light');
    expect(resolveTheme('system', null)).toBe('light');
  });
  it('明確設定時覆蓋系統', () => {
    expect(resolveTheme('light', 'dark')).toBe('light');
    expect(resolveTheme('dark', 'light')).toBe('dark');
  });
});
