import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BackHeader, DropHowTo, Icon, KanaText, PrimaryButton, Screen, TextLink } from '../../src/components';
import { seionOrder } from '../../src/data';
import { confusionCounts } from '../../src/logic/confusion';
import {
  MAX_PICK,
  MIN_PICK,
  canStart,
  faceOf,
  learnedSyllables,
  randomSelection,
  recommendedPresets,
  toggleSelection,
} from '../../src/logic/dropGame';
import { isLearned } from '../../src/logic/srs';
import { useProgressStore, useSettingsStore } from '../../src/store';
import { useBottomPad } from '../../src/theme/layout';
import { useTheme } from '../../src/theme/useTheme';

const SIDE = 24;
const ORDER = seionOrder('hiragana').map((k) => k.id);

/** 掉字歸類：選要練哪些字（推薦三組／自己選 3～6 個／隨機），選好進遊戲。 */
export default function DropSelectScreen() {
  const t = useTheme();
  const router = useRouter();
  const bottom = useBottomPad(24);
  const progress = useProgressStore((s) => s.progress);
  const confusions = useProgressStore((s) => s.confusions);
  const control = useSettingsStore((s) => s.dropControl);
  const [picked, setPicked] = useState<string[]>([]);
  const [howto, setHowto] = useState(false);

  const learned = useMemo(
    () => learnedSyllables(Object.values(progress).filter(isLearned).map((p) => p.kanaId), ORDER),
    [progress],
  );
  const learnedSet = useMemo(() => new Set(learned), [learned]);
  const counts = useMemo(() => confusionCounts(confusions), [confusions]);
  const recs = useMemo(() => recommendedPresets(learnedSet, counts, 3), [learnedSet, counts]);
  const locked = learned.length < MIN_PICK;

  const start = (selection: string[]) =>
    router.push({ pathname: '/drop/play', params: { sel: selection.join(',') } });

  return (
    <Screen>
      <BackHeader title="掉字歸類" onBack={() => router.back()} />
      <ScrollView style={styles.flex} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={{ fontSize: 15, lineHeight: 23, color: t.muted }}>
          字會從上面掉下來，把它放進對的籃子。練到不再搞混。
        </Text>
        <TextLink testID="drop-howto" label="怎麼玩" onPress={() => setHowto(true)} style={styles.link} />

        {locked ? (
          <Text testID="drop-locked" style={{ fontSize: 15, lineHeight: 23, color: t.text, paddingTop: 12 }}>
            先學會 {MIN_PICK} 個字就能玩（目前 {learned.length} 個）。
          </Text>
        ) : (
          <>
            {recs.length > 0 ? (
              <>
                <Text style={[styles.section, { color: t.text }]}>推薦</Text>
                <View style={[styles.list, { backgroundColor: t.surface, borderColor: t.line }]}>
                  {recs.map(({ preset, selection }, i) => (
                    <Pressable
                      key={preset.id}
                      testID={`drop-preset-${preset.id}`}
                      accessibilityRole="button"
                      onPress={() => start(selection)}
                      style={[
                        styles.row,
                        i < recs.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.line },
                      ]}
                    >
                      <KanaText size={20} lineHeightRatio={1.2}>
                        {selection.map((s) => faceOf(s, 'hiragana')).join('・')}
                      </KanaText>
                      <Icon name="chevronRight" size={16} color={t.muted} />
                    </Pressable>
                  ))}
                </View>
              </>
            ) : null}

            <Pressable
              testID="drop-random"
              accessibilityRole="button"
              onPress={() => start(randomSelection(learned, Math.random))}
              style={[styles.randomRow, { backgroundColor: t.surface, borderColor: t.line }]}
            >
              <View style={styles.flex}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: t.text }}>隨機</Text>
                <Text style={{ fontSize: 13, color: t.muted }}>從學過的字抽 4 個</Text>
              </View>
              <Icon name="chevronRight" size={16} color={t.muted} />
            </Pressable>
            <Text style={[styles.section, { color: t.text }]}>自己選</Text>
            <Text style={{ fontSize: 13, color: t.muted, paddingBottom: 8 }}>
              選 {MIN_PICK}～{MAX_PICK} 個字，已選 {picked.length} 個
            </Text>
            <View style={styles.grid}>
              {learned.map((id) => {
                const on = picked.includes(id);
                const char = faceOf(id, 'hiragana');
                return (
                  <Pressable
                    key={id}
                    testID={`drop-pick-${id}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={char}
                    onPress={() => setPicked((cur) => toggleSelection(cur, id))}
                    style={[
                      styles.chip,
                      { backgroundColor: on ? t.text : t.surface, borderColor: on ? t.text : t.line },
                    ]}
                  >
                    <KanaText size={24} lineHeightRatio={1.2} color={on ? t.bg : t.text}>
                      {char}
                    </KanaText>
                  </Pressable>
                );
              })}
            </View>

          </>
        )}
      </ScrollView>

      {locked ? null : (
        <View style={[styles.bottom, { paddingBottom: bottom }]}>
          <PrimaryButton
            testID="drop-start-custom"
            label={canStart(picked) ? `開始（${picked.length} 個字）` : `自己選 ${MIN_PICK}～${MAX_PICK} 個字`}
            disabled={!canStart(picked)}
            onPress={() => start(picked)}
          />
        </View>
      )}

      <Modal visible={howto} transparent animationType="fade" onRequestClose={() => setHowto(false)}>
        <View testID="drop-howto-sheet" style={[styles.modal, { backgroundColor: t.bg }]} accessibilityViewIsModal>
          <DropHowTo control={control} />
          <View style={styles.modalBtn}>
            <PrimaryButton testID="drop-howto-close" label="知道了" onPress={() => setHowto(false)} />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: SIDE, paddingTop: 12, paddingBottom: 16 },
  link: { alignSelf: 'flex-start', minHeight: 36, marginTop: 0 },
  section: { fontSize: 15, fontWeight: '700', paddingTop: 18, paddingBottom: 6 },
  list: { borderWidth: 1, borderRadius: 18, overflow: 'hidden' },
  row: { minHeight: 56, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { width: 56, height: 56, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  randomRow: {
    marginTop: 12,
    minHeight: 60,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bottom: { paddingHorizontal: SIDE, paddingTop: 12 },
  modal: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SIDE },
  modalBtn: { width: '100%', paddingTop: 16 },
});
