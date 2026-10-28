import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { homeHelpItems } from '../logic/tour';
import { useBottomPad } from '../theme/layout';
import { useTheme } from '../theme/useTheme';
import { Icon } from './Icon';

export interface HomeHelpSheetProps {
  visible: boolean;
  /** 每日目標分鐘數（最後一項「開始今天的 N 分鐘」） */
  goalMinutes: number;
  onClose: () => void;
}

/** 首頁「？」說明面板：用一句話解釋首頁的每個數字與按鈕。 */
export function HomeHelpSheet({ visible, goalMinutes, onClose }: HomeHelpSheetProps) {
  const t = useTheme();
  const bottom = useBottomPad(24);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
        {/* 遮罩：不分主題都用黑色半透明，不屬於主題 token（同 PunUnlockSheet） */}
        <Pressable
          accessibilityLabel="關閉"
          testID="home-help-backdrop"
          style={[StyleSheet.absoluteFill, styles.scrim]}
          onPress={onClose}
        />
        <View
          testID="home-help-sheet"
          style={[styles.sheet, { backgroundColor: t.surface, borderColor: t.line, paddingBottom: bottom }]}
        >
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: t.text }]}>首頁怎麼看</Text>
            <Pressable
              testID="home-help-close"
              accessibilityRole="button"
              accessibilityLabel="關閉"
              onPress={onClose}
              style={styles.close}
            >
              <Icon name="close" size={20} color={t.muted} />
            </Pressable>
          </View>
          <View style={styles.list}>
            {homeHelpItems(goalMinutes).map((item) => (
              <View key={item.key} style={styles.item}>
                <Text style={[styles.itemTitle, { color: t.accentText }]}>{item.title}</Text>
                <Text style={[styles.itemBody, { color: t.text }]}>{item.body}</Text>
              </View>
            ))}
          </View>
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
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 17, fontWeight: '700' },
  close: { width: 44, height: 44, marginRight: -12, alignItems: 'center', justifyContent: 'center' },
  list: { gap: 14, paddingTop: 4, paddingBottom: 8 },
  item: { gap: 2 },
  itemTitle: { fontSize: 14, fontWeight: '700' },
  itemBody: { fontSize: 15, lineHeight: 22 },
});
