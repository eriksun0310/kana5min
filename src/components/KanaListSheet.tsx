import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useBottomPad } from '../theme/layout';
import { useTheme } from '../theme/useTheme';
import { PrimaryButton } from './Buttons';
import { Icon } from './Icon';
import { KanaText } from './KanaText';

export interface KanaListItem {
  id: string;
  char: string;
  /** 字下面的小字（到期時間、羅馬拼音） */
  caption: string;
  /** 小字是否用主色強調（今天到期） */
  accent?: boolean;
}

export interface KanaListSheetProps {
  visible: boolean;
  title: string;
  subtitle: string;
  items: KanaListItem[];
  /** 主按鈕文字 */
  actionLabel: string;
  onAction: () => void;
  onClose: () => void;
  testID?: string;
}

/** 首頁統計點開的面板：列出一組字（待複習、今天新字），下面一顆主按鈕。 */
export function KanaListSheet({
  visible,
  title,
  subtitle,
  items,
  actionLabel,
  onAction,
  onClose,
  testID,
}: KanaListSheetProps) {
  const t = useTheme();
  const bottom = useBottomPad(24);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.root} accessibilityViewIsModal>
        {/* 遮罩：不分主題都用黑色半透明，不屬於主題 token（同 HomeHelpSheet） */}
        <Pressable
          accessibilityLabel="關閉"
          testID={testID ? `${testID}-backdrop` : undefined}
          style={[StyleSheet.absoluteFill, styles.scrim]}
          onPress={onClose}
        />
        <View
          testID={testID}
          style={[styles.sheet, { backgroundColor: t.surface, borderColor: t.line, paddingBottom: bottom }]}
        >
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: t.text }]}>{title}</Text>
            <Pressable
              testID={testID ? `${testID}-close` : undefined}
              accessibilityRole="button"
              accessibilityLabel="關閉"
              onPress={onClose}
              style={styles.close}
            >
              <Icon name="close" size={20} color={t.muted} />
            </Pressable>
          </View>
          <Text style={[styles.subtitle, { color: t.muted }]}>{subtitle}</Text>
          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            <View style={styles.grid}>
              {items.map((item) => (
                <View key={item.id} style={[styles.chip, { backgroundColor: t.flat }]}>
                  <KanaText size={30} lineHeightRatio={1.2}>
                    {item.char}
                  </KanaText>
                  <Text style={{ fontSize: 11, color: item.accent ? t.accentText : t.muted }}>
                    {item.caption}
                  </Text>
                </View>
              ))}
            </View>
          </ScrollView>
          <PrimaryButton testID={testID ? `${testID}-action` : undefined} label={actionLabel} onPress={onAction} />
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
    maxHeight: '75%',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 17, fontWeight: '700' },
  close: { width: 44, height: 44, marginRight: -12, alignItems: 'center', justifyContent: 'center' },
  subtitle: { fontSize: 13, marginTop: -4, marginBottom: 12 },
  scroll: { flexGrow: 0, marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    width: '23%',
    minHeight: 72,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 2,
  },
});
