import { resolveTheme } from '../resolve';
import { dark, light } from '../tokens';

describe('主題 token', () => {
  it('亮暗兩組鍵名一致', () => {
    expect(Object.keys(dark).sort()).toEqual(Object.keys(light).sort());
  });

  it('spec 第 7 節的 token 數值正確', () => {
    expect(dark).toMatchObject({
      bg: '#1C1B18', surface: '#28261F', line: '#3A382F', text: '#F0EEE6', muted: '#9A978A', track: '#3A382F',
      chip: '#2F2D25', accentText: '#E8734F', accentSoft: '#3A2A22', correct: '#6BBF7D', wrong: '#E8734F',
      accent: '#E8734F', onAccent: '#1C1B18',
    });
    expect(light).toMatchObject({
      bg: '#FAFAF7', surface: '#FFFFFF', line: '#D6D6D2', text: '#1A1A1A', muted: '#6A6964', track: '#E4E4E0',
      chip: '#F1F1ED', accentText: '#A83A28', accentSoft: '#FDF0EC', correct: '#4A9A5A', wrong: '#C44830',
      accent: '#C44830', onAccent: '#FFFFFF',
    });
  });

  // WCAG 相對亮度對比；spec 要求文字對比至少 4.5:1
  const luminance = (hex: string) => {
    const [r, g, b] = [1, 3, 5]
      .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const contrast = (a: string, b: string) => {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };

  it.each([
    ['dark', dark],
    ['light', light],
  ] as const)('%s 主題的文字對比至少 4.5:1', (_name, t) => {
    expect(contrast(t.onAccent, t.accent)).toBeGreaterThanOrEqual(4.5);
    for (const bg of [t.bg, t.surface]) {
      expect(contrast(t.text, bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(t.muted, bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(t.accentText, bg)).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrast(t.accentText, t.accentSoft)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(t.correctText, t.correctSoft)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(t.wrongText, t.wrongSoft)).toBeGreaterThanOrEqual(4.5);
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
