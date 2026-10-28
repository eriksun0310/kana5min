import { compensatedMargins, glyphPadding } from '../glyphBox';

describe('glyphPadding', () => {
  it('依字級計算上下補償（上方比下方多）', () => {
    expect(glyphPadding(190)).toEqual({ top: 48, bottom: 23 });
    expect(glyphPadding(22)).toEqual({ top: 6, bottom: 3 });
  });
});

describe('compensatedMargins', () => {
  const pad = { top: 10, bottom: 4 };

  it('沒有自己的 margin：只放抵銷用的負值', () => {
    expect(compensatedMargins(pad, {})).toEqual({ marginTop: -10, marginBottom: -4 });
  });

  it('保留呼叫端的 marginTop／marginBottom，再加上抵銷', () => {
    expect(compensatedMargins(pad, { marginTop: 2 })).toEqual({ marginTop: -8, marginBottom: -4 });
    expect(compensatedMargins(pad, { marginBottom: 6 })).toEqual({ marginTop: -10, marginBottom: 2 });
  });

  it('marginVertical、margin 簡寫也要算進去；個別邊的值優先', () => {
    expect(compensatedMargins(pad, { marginVertical: 8 })).toEqual({ marginTop: -2, marginBottom: 4 });
    expect(compensatedMargins(pad, { margin: 5 })).toEqual({ marginTop: -5, marginBottom: 1 });
    expect(compensatedMargins(pad, { margin: 5, marginTop: 1 })).toEqual({ marginTop: -9, marginBottom: 1 });
  });
});
