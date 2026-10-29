import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { KanaText } from './KanaText';
import { optionColors, type OptionStatus } from './QuizOption';

export interface QuizGridCellProps {
  char: string;
  status: OptionStatus;
  onPress: () => void;
  /** 作答後提示「漏掉的正確格」：綠色虛線框 */
  dashed?: boolean;
  disabled?: boolean;
  testID?: string;
  /** 一列幾格：預設 3（找不同），找出所有用 4 */
  columns?: 3 | 4;
}

/** 找不同／找出所有的格子：方形字卡，狀態顏色同其他測驗選項。 */
export function QuizGridCell({
  char,
  status,
  onPress,
  dashed,
  disabled,
  testID,
  columns = 3,
}: QuizGridCellProps) {
  const t = useTheme();
  const c = optionColors(t, status);
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={char}
      accessibilityState={{ selected: status === 'selected' }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.cell,
        columns === 4 ? styles.cell4 : styles.cell3,
        {
          borderColor: dashed ? t.correct : c.border,
          borderStyle: dashed ? 'dashed' : 'solid',
          backgroundColor: c.bg,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <KanaText size={columns === 4 ? 34 : 44} lineHeightRatio={1.2}>
        {char}
      </KanaText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cell: {
    borderRadius: 18,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 寬度：(螢幕寬 - 左右 24 - 格間距) / 欄數，用百分比近似（flexWrap 下含 gap 10）
  cell3: { width: '31%', aspectRatio: 1 },
  cell4: { width: '22.5%', aspectRatio: 1 },
});
