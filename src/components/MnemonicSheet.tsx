import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { GroupMnemonic } from '../data/mnemonics';
import { mustById } from '../data';
import { useBottomPad } from '../theme/layout';
import { useTheme } from '../theme/useTheme';
import { Icon } from './Icon';
import { MnemonicGlyph } from './MnemonicGlyph';

export interface MnemonicSheetProps {
  visible: boolean;
  mnemonic: GroupMnemonic | undefined;
  onClose: () => void;
  testID?: string;
}

/** 對比頁「你可以這樣記」：每個字一張卡（紅色動畫 + 一句話），最下面一句話講怎麼分。 */
export function MnemonicSheet({ visible, mnemonic, onClose, testID }: MnemonicSheetProps) {
  const t = useTheme();
  const bottom = useBottomPad(24);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.root} accessibilityViewIsModal>
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
            <Text style={[styles.title, { color: t.text }]}>你可以這樣記</Text>
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
          <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
            {!mnemonic || mnemonic.pending ? (
              <Text testID="mnemonic-pending" style={{ fontSize: 15, lineHeight: 23, color: t.muted }}>
                這組的記法還在整理中，先看上面的「差在哪裡」。
              </Text>
            ) : (
              <>
                {mnemonic.members.map((m) => {
                  const k = mustById(m.id);
                  return (
                    <View key={m.id} testID={`mnemonic-${m.id}`} style={[styles.row, { backgroundColor: t.flat }]}>
                      <MnemonicGlyph char={k.char} marks={m.marks} size={96} />
                      <Text style={[styles.line, { color: t.text }]}>{m.line}</Text>
                    </View>
                  );
                })}
                <Text testID="mnemonic-how" style={[styles.how, { color: t.accentText }]}>
                  {mnemonic.howToTell}
                </Text>
              </>
            )}
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
    maxHeight: '85%',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 17, fontWeight: '700' },
  close: { width: 44, height: 44, marginRight: -12, alignItems: 'center', justifyContent: 'center' },
  scroll: { flexGrow: 0, marginBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 18,
    padding: 12,
    marginBottom: 10,
  },
  line: { flex: 1, fontSize: 15, lineHeight: 23 },
  how: { fontSize: 15, fontWeight: '700', lineHeight: 23, marginTop: 4, marginBottom: 8 },
});
