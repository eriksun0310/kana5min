import React from 'react';
import { View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import { useTheme } from '../theme/useTheme';

export interface CardProps extends Omit<ViewProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  /** 資訊卡：無邊框、flat 底色，看起來不能按（能按的元素才用 surface＋邊框） */
  flat?: boolean;
}

/** 卡片：surface 底、line 邊、radius 20、padding 16/18；flat 時改成無邊框的 flat 底色。 */
export function Card({ style, children, flat, ...rest }: CardProps) {
  const t = useTheme();
  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: flat ? t.flat : t.surface,
          borderColor: t.line,
          borderWidth: flat ? 0 : 1,
          borderRadius: 20,
          paddingVertical: 16,
          paddingHorizontal: 18,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
