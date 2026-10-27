import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTopPad } from '../theme/layout';
import { useTheme } from '../theme/useTheme';
import { Icon } from './Icon';

export interface BackHeaderProps {
  title: string;
  onBack: () => void;
  testID?: string;
}

/** 返回鈕 + 標題（設計檔 C2-04）。 */
export function BackHeader({ title, onBack, testID = 'back' }: BackHeaderProps) {
  const t = useTheme();
  const top = useTopPad(52);
  return (
    <View style={[styles.row, { paddingTop: top }]}>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel="返回"
        onPress={onBack}
        style={styles.back}
      >
        <Icon name="back" size={24} color={t.text} />
      </Pressable>
      <Text style={[styles.title, { color: t.text }]}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 4 },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '700' },
});
