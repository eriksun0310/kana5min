// 假名文字框的「字形溢出」補償：
// iOS 的文字框高度等於行高，Klee One 的某些字（き、ぎ 的濁點、ぱ 的半濁點、片假名的點）
// 筆畫會頂到或超出行高上緣，超出的部分會被文字框裁掉（真機上看起來像字頂被切平）。
// 作法：文字框上下各加 padding 撐大，再用相反的負 margin 抵銷，版面位置不變、字形不被裁。

/** 上方補償佔字級的比例（濁點、半濁點在最上方，需要最多） */
export const GLYPH_PAD_TOP = 0.25;
/** 下方補償佔字級的比例（う、ち 等下緣） */
export const GLYPH_PAD_BOTTOM = 0.12;

export interface GlyphPadding {
  top: number;
  bottom: number;
}

export function glyphPadding(size: number): GlyphPadding {
  return { top: Math.round(size * GLYPH_PAD_TOP), bottom: Math.round(size * GLYPH_PAD_BOTTOM) };
}

/** 呼叫端自己給的 margin（只看上下）加上抵銷用的負值。 */
export function compensatedMargins(
  pad: GlyphPadding,
  own: { marginTop?: number; marginBottom?: number; marginVertical?: number; margin?: number },
): { marginTop: number; marginBottom: number } {
  const top = own.marginTop ?? own.marginVertical ?? own.margin ?? 0;
  const bottom = own.marginBottom ?? own.marginVertical ?? own.margin ?? 0;
  return { marginTop: top - pad.top, marginBottom: bottom - pad.bottom };
}
