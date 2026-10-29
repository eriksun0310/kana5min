import React from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { Icon } from './Icon';

export interface StatCardProps {
  value: string;
  /** 數字後面的小字單位，例如 ' / 46' */
  unit?: string;
  label: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  /** 有給才是可以點的磚塊（surface 底、邊框、右上角箭頭）；沒給就是純數字 */
  onPress?: () => void;
  accessibilityLabel?: string;
}

/**
 * 統計數字（首頁、結果頁）。沒有 onPress：純資訊，沒有卡片、邊框與底色，只有置中的大數字加小標籤；
 * 有 onPress：能點的磚塊，surface 底、line 邊、右上角箭頭，跟其他能點的磚塊一致。
 */
export function StatCard({ value, unit, label, style, testID, onPress, accessibilityLabel }: StatCardProps) {
  const t = useTheme();
  const body = (
    <>
      <Text style={[styles.value, { color: t.text }]}>
        {value}
        {unit ? <Text style={[styles.unit, { color: t.muted }]}>{unit}</Text> : null}
      </Text>
      <Text style={[styles.label, { color: t.muted }]}>{label}</Text>
    </>
  );
  if (!onPress) {
    return (
      <View testID={testID} style={[styles.plain, style]}>
        {body}
      </View>
    );
  }
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      // label 只放數字（Maestro 與 VoiceOver 都先讀到數字），標籤放 hint
      accessibilityLabel={accessibilityLabel ?? `${value}${unit ?? ''}`}
      accessibilityHint={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        { backgroundColor: t.surface, borderColor: t.line, opacity: pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {body}
      <View style={styles.arrow}>
        <Icon name="chevronRight" size={14} color={t.muted} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 2,
  },
  arrow: { position: 'absolute', right: 8, top: 10 },
  plain: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    gap: 2,
  },
  value: { fontSize: 22, fontWeight: '700' },
  unit: { fontSize: 13, fontWeight: '400' },
  label: { fontSize: 12 },
});
