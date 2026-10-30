import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { mustById, punFor, soundOf } from '../data';
import type { GroupMnemonic } from '../data/mnemonics';
import { punCardState } from '../logic/punUnlock';
import { useSettingsStore } from '../store/settingsStore';
import { useBottomPad } from '../theme/layout';
import { useTheme } from '../theme/useTheme';
import { Icon } from './Icon';
import { MnemonicGlyph } from './MnemonicGlyph';

export interface MnemonicSheetProps {
  visible: boolean;
  /** 這組的字（Kana id），沒有記法資料的組也會列出每個字與它的諧音句 */
  memberIds: string[];
  mnemonic: GroupMnemonic | undefined;
  /** 點未解鎖的諧音：由外面關掉這個面板並開解鎖面板 */
  onUnlock: (kanaId: string) => void;
  onClose: () => void;
  testID?: string;
}

/** 對比頁「你可以這樣記」：每個字一張卡（紅色動畫 + 一句話），最下面一句話講怎麼分。 */
export function MnemonicSheet({ visible, memberIds, mnemonic, onUnlock, onClose, testID }: MnemonicSheetProps) {
  const t = useTheme();
  const purchased = useSettingsStore((s) => s.punPackPurchased);
  const unlocked = useSettingsStore((s) => s.punUnlocked);
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
            {memberIds.map((id) => {
              const k = mustById(id);
              const m = mnemonic?.members.find((x) => x.id === id);
              const sound = soundOf(id);
              const pun = punFor(id);
              const open = sound ? punCardState(sound, { purchased, unlocked }) === 'unlocked' : false;
              return (
                <View key={id} testID={`mnemonic-${id}`} style={[styles.row, { backgroundColor: t.flat }]}>
                  <MnemonicGlyph char={k.char} marks={m?.marks} size={96} />
                  <View style={styles.text}>
                    {m?.cue ? <Text style={[styles.cue, { color: t.accentText }]}>{m.cue}</Text> : null}
                    {pun && open ? (
                      <Text testID={`mnemonic-pun-${id}`} style={[styles.line, { color: t.text }]}>
                        {pun}
                      </Text>
                    ) : null}
                    {pun && !open ? (
                      <Pressable
                        testID={`mnemonic-pun-locked-${id}`}
                        accessibilityRole="button"
                        accessibilityLabel="解鎖諧音"
                        onPress={() => onUnlock(id)}
                        style={[styles.lock, { backgroundColor: t.accentSoft }]}
                      >
                        <Icon name="lock" size={14} color={t.accentText} />
                        <Text style={{ color: t.accentText, fontSize: 14, fontWeight: '700' }}>解鎖諧音</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              );
            })}
            {mnemonic?.howToTell ? (
              <Text testID="mnemonic-how" style={[styles.how, { color: t.accentText }]}>
                {mnemonic.howToTell}
              </Text>
            ) : null}
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
  text: { flex: 1, gap: 6 },
  cue: { fontSize: 13, fontWeight: '700', lineHeight: 19 },
  line: { fontSize: 15, lineHeight: 23 },
  lock: { alignSelf: 'flex-start', minHeight: 36, borderRadius: 12, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  how: { fontSize: 15, fontWeight: '700', lineHeight: 23, marginTop: 4, marginBottom: 8 },
});
