import React from 'react';
import { StyleSheet, Text, type StyleProp, type TextProps, type TextStyle } from 'react-native';
import { compensatedMargins, glyphPadding } from '../logic/glyphBox';
import { useTheme } from '../theme/useTheme';

/** Klee One 600（由根 layout 載入）。 */
export const KANA_FONT = 'KleeOne_600SemiBold';

export interface KanaTextProps extends Omit<TextProps, 'style'> {
  size: number;
  /** 行高倍率，預設 1.05（設計檔大字用 1.05，小字可傳 1） */
  lineHeightRatio?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
}

/** 顯示假名／日文單字用的文字元件。 */
export function KanaText({
  size,
  lineHeightRatio = 1.05,
  color,
  style,
  children,
  ...rest
}: KanaTextProps) {
  const t = useTheme();
  // 字形可能超出行高（き、ぎ 的濁點等）：文字框上下撐大再用負 margin 抵銷，位置不變、字不被裁掉
  const pad = glyphPadding(size);
  const own = StyleSheet.flatten(style) ?? {};
  const num = (v: unknown) => (typeof v === 'number' ? v : undefined);
  const margins = compensatedMargins(pad, {
    marginTop: num(own.marginTop),
    marginBottom: num(own.marginBottom),
    marginVertical: num(own.marginVertical),
    margin: num(own.margin),
  });
  return (
    <Text
      {...rest}
      style={[
        {
          fontFamily: KANA_FONT,
          fontSize: size,
          lineHeight: Math.round(size * lineHeightRatio),
          color: color ?? t.text,
          paddingTop: pad.top,
          paddingBottom: pad.bottom,
        },
        style,
        margins,
      ]}
    >
      {children}
    </Text>
  );
}
