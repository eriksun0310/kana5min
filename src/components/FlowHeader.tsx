import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTopPad } from '../theme/layout';
import { useTheme } from '../theme/useTheme';
import { Icon } from './Icon';

export interface FlowHeaderProps {
  /** 0–1 */
  progress: number;
  /** 右側計數，例如 '1/3' */
  countLabel?: string;
  onClose: () => void;
  closeTestID?: string;
}

/** 學習／測驗流程上方：關閉鈕 44×44 + 6px 進度條 + 右側計數（設計檔 C2-05）。 */
export function FlowHeader({ progress, countLabel, onClose, closeTestID = 'flow-close' }: FlowHeaderProps) {
  const t = useTheme();
  const top = useTopPad(52);
  const pct = Math.round(Math.min(Math.max(progress, 0), 1) * 100);
  return (
    <View style={[styles.row, { paddingTop: top }]}>
      <Pressable
        testID={closeTestID}
        accessibilityRole="button"
        accessibilityLabel="結束"
        onPress={onClose}
        style={styles.close}
      >
        <Icon name="close" size={22} color={t.muted} />
      </Pressable>
      <View style={[styles.track, { backgroundColor: t.track }]}>
        <View style={{ width: `${pct}%`, height: '100%', backgroundColor: t.accent }} />
      </View>
      <Text style={[styles.count, { color: t.muted }]}>{countLabel ?? ''}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  track: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  count: { width: 44, textAlign: 'center', fontSize: 13 },
});
