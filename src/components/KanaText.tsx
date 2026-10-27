import React from 'react';
import { Text, type StyleProp, type TextProps, type TextStyle } from 'react-native';
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
  return (
    <Text
      {...rest}
      style={[
        {
          fontFamily: KANA_FONT,
          fontSize: size,
          lineHeight: Math.round(size * lineHeightRatio),
          color: color ?? t.text,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
