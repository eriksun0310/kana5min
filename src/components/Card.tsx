import React from 'react';
import { View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import { useTheme } from '../theme/useTheme';

export interface CardProps extends Omit<ViewProps, 'style'> {
  style?: StyleProp<ViewStyle>;
}

/** 卡片：surface 底、line 邊、radius 20、padding 16/18。 */
export function Card({ style, children, ...rest }: CardProps) {
  const t = useTheme();
  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: t.surface,
          borderColor: t.line,
          borderWidth: 1,
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
