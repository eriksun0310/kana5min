import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useBottomPad } from '../theme/layout';
import { useTheme } from '../theme/useTheme';
import { Icon } from './Icon';

export interface SheetOption {
  value: string;
  label: string;
  /** 右側小字說明 */
  sub?: string;
}

export interface OptionSheetProps {
  visible: boolean;
  title: string;
  options: SheetOption[];
  selected?: string;
  onSelect: (value: string) => void;
  onClose: () => void;
  /** 每個選項的 testID 為 `${testIDPrefix}-${value}` */
  testIDPrefix?: string;
}

/** 底部選單：簡單的單選清單，選項多時可捲動（用於每日目標、發音速度、提醒時間）。 */
export function OptionSheet({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
  testIDPrefix = 'option',
}: OptionSheetProps) {
  const t = useTheme();
  const bottom = useBottomPad(24);
  const { height } = useWindowDimensions();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
        {/* 遮罩：不分主題都用黑色半透明，不屬於主題 token */}
        <Pressable
          accessibilityLabel="關閉"
          testID={`${testIDPrefix}-backdrop`}
          style={[StyleSheet.absoluteFill, styles.scrim]}
          onPress={onClose}
        />
        <View
          style={[
            styles.sheet,
            { backgroundColor: t.surface, borderColor: t.line, paddingBottom: bottom, maxHeight: height * 0.7 },
          ]}
        >
          <Text style={[styles.title, { color: t.text }]}>{title}</Text>
          <ScrollView>
            {options.map((o, i) => {
              const on = o.value === selected;
              return (
                <Pressable
                  key={o.value}
                  testID={`${testIDPrefix}-${o.value}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  onPress={() => onSelect(o.value)}
                  style={[
                    styles.row,
                    { borderTopColor: t.line, borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth },
                  ]}
                >
                  <Text style={[styles.label, { color: on ? t.accentText : t.text, fontWeight: on ? '700' : '400' }]}>
                    {o.label}
                  </Text>
                  {o.sub ? <Text style={[styles.sub, { color: t.muted }]}>{o.sub}</Text> : null}
                  <View style={styles.check}>{on ? <Icon name="check" size={20} color={t.accentText} /> : null}</View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  scrim: { backgroundColor: 'black', opacity: 0.45 },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingTop: 18,
    paddingHorizontal: 24,
  },
  title: { fontSize: 17, fontWeight: '700', paddingBottom: 8 },
  row: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontSize: 16 },
  sub: { flex: 1, fontSize: 13 },
  check: { width: 24, marginLeft: 'auto', alignItems: 'flex-end' },
});
