import React from 'react';
import { View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import { useTheme } from '../theme/useTheme';

export interface ScreenProps extends Omit<ViewProps, 'style'> {
  style?: StyleProp<ViewStyle>;
}

/** 整個畫面的容器：套主題背景、撐滿。 */
export function Screen({ style, children, ...rest }: ScreenProps) {
  const t = useTheme();
  return (
    <View {...rest} style={[{ flex: 1, backgroundColor: t.bg }, style]}>
      {children}
    </View>
  );
}
