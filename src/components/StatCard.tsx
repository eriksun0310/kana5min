import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../theme/useTheme';

export interface StatCardProps {
  value: string;
  /** 數字後面的小字單位，例如 ' / 46' */
  unit?: string;
  label: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** 統計卡（首頁、結果頁）：surface 底、line 邊、radius 16、padding 12/14。 */
export function StatCard({ value, unit, label, style, testID }: StatCardProps) {
  const t = useTheme();
  return (
    <View
      testID={testID}
      style={[styles.card, { backgroundColor: t.surface, borderColor: t.line }, style]}
    >
      <Text style={[styles.value, { color: t.text }]}>
        {value}
        {unit ? <Text style={[styles.unit, { color: t.muted }]}>{unit}</Text> : null}
      </Text>
      <Text style={[styles.label, { color: t.muted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 2,
  },
  value: { fontSize: 22, fontWeight: '700' },
  unit: { fontSize: 13, fontWeight: '400' },
  label: { fontSize: 12 },
});
