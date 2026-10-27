import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { useTheme } from '../theme/useTheme';

export interface TianGridProps {
  /** 邊長，設計檔為 260 */
  size?: number;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  testID?: string;
}

/** 田字格：surface 底、line 邊、radius 20，中央虛線十字（guide 色）。children 置中疊在上面。 */
export function TianGrid({ size = 260, style, children, testID }: TianGridProps) {
  const t = useTheme();
  return (
    <View
      testID={testID}
      style={[
        styles.box,
        { width: size, height: size, backgroundColor: t.surface, borderColor: t.line },
        style,
      ]}
    >
      <Svg width={size} height={size} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Line
          x1={size / 2}
          y1={0}
          x2={size / 2}
          y2={size}
          stroke={t.guide}
          strokeWidth={1}
          strokeDasharray="4 4"
        />
        <Line
          x1={0}
          y1={size / 2}
          x2={size}
          y2={size / 2}
          stroke={t.guide}
          strokeWidth={1}
          strokeDasharray="4 4"
        />
      </Svg>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
