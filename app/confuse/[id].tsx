import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { playKana } from '../../src/audio/playKana';
import { BackHeader, Card, Icon, KanaText, MnemonicSheet, PrimaryButton, Screen, SecondaryButton } from '../../src/components';
import { mustById, seionOrder } from '../../src/data';
import { mnemonicOf } from '../../src/data/mnemonics';
import { availableGroups, confusionCounts, resolvedMembers } from '../../src/logic/confusion';
import { learnedSyllables, presetForGroup } from '../../src/logic/dropGame';
import { isLearned } from '../../src/logic/srs';
import { progressList, useProgressStore, useSettingsStore } from '../../src/store';
import { useBottomPad } from '../../src/theme/layout';
import { useTheme } from '../../src/theme/useTheme';

const SIDE = 24;
const GAP = 12;

/** C2-14 易混淆字對比：字組切換、並排大字卡、差在哪裡、最近答錯次數、快速辨識 10 題。 */
export default function ConfuseScreen() {
  const t = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const bottom = useBottomPad(44);
  const { id } = useLocalSearchParams<{ id?: string }>();
  const progress = useProgressStore((s) => s.progress);
  const confusions = useProgressStore((s) => s.confusions);
  const slow = useSettingsStore((s) => s.audioSpeed) === 'slow';

  const counts = useMemo(() => confusionCounts(confusions), [confusions]);
  const learnedSet = useMemo(
    () =>
      new Set(
        learnedSyllables(
          Object.values(progress).filter(isLearned).map((p) => p.kanaId),
          seionOrder('hiragana').map((k) => k.id),
        ),
      ),
    [progress],
  );
  // 切換膠囊只列可用的組（片假名組在解鎖前不出現），維持預設順序，切換時位置不會跳動
  const groups = useMemo(() => availableGroups(progressList(progress)), [progress]);
  // 切換用本地狀態；路由帶進來的組不可用（例如片假名還沒解鎖）就退回第一個可用組
  const [picked, setPicked] = useState<string | undefined>(id);
  const [mnemonicOpen, setMnemonicOpen] = useState(false);
  const group =
    groups.find((g) => g.id === picked) ?? groups.find((g) => g.id === id) ?? groups[0];

  if (!group) {
    return (
      <Screen>
        <BackHeader title="長得很像的字" onBack={() => router.back()} />
      </Screen>
    );
  }

  const members = resolvedMembers(group).map(mustById);
  const three = members.length >= 3;
  const cardWidth = (width - SIDE * 2 - GAP * (members.length - 1)) / members.length;
  const misses = counts[group.id] ?? 0;
  const dropPlay = presetForGroup(group.id, learnedSet);

  return (
    <Screen>
      <BackHeader title="長得很像的字" onBack={() => router.back()} />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pills}>
          {groups.map((g) => {
            const on = g.id === group.id;
            return (
              <Pressable
                key={g.id}
                testID={`pill-${g.id}`}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                hitSlop={{ top: 1, bottom: 1 }}
                onPress={() => setPicked(g.id)}
                style={[
                  styles.pill,
                  { borderColor: on ? t.text : t.line, backgroundColor: on ? t.text : t.surface },
                ]}
              >
                <KanaText size={18} lineHeightRatio={1.2} color={on ? t.bg : t.text}>
                  {g.label}
                </KanaText>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.cards}>
          {members.map((k) => (
            <Pressable
              key={k.id}
              testID={`confuse-card-${k.id}`}
              accessibilityRole="button"
              accessibilityLabel={`${k.char}，${k.romaji}，點一下聽發音`}
              onPress={() => playKana(k.id, { slow })}
              style={({ pressed }) => [
                styles.kanaCard,
                {
                  width: cardWidth,
                  backgroundColor: t.surface,
                  borderColor: t.line,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <KanaText size={three ? 68 : 104} lineHeightRatio={1.1}>
                {k.char}
              </KanaText>
              <Text style={{ fontSize: 15, color: t.muted }}>{k.romaji}</Text>
              <View style={styles.cardSpeaker}>
                <Icon name="speakerSmall" size={18} color={t.accentText} />
              </View>
            </Pressable>
          ))}
        </View>

        <View style={styles.block}>
          <Card flat testID="confuse-tip">
            <Text style={{ fontSize: 12, fontWeight: '700', color: t.accentText }}>差在哪裡</Text>
            <Text style={{ fontSize: 15, lineHeight: 23, color: t.text, marginTop: 4 }}>{group.tip}</Text>
          </Card>
        </View>

        <View style={styles.blockSmall}>
          <Pressable
            testID="open-mnemonic"
            accessibilityRole="button"
            onPress={() => setMnemonicOpen(true)}
            style={({ pressed }) => [
              styles.mnemonicRow,
              { backgroundColor: t.surface, borderColor: t.line, opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <Text style={{ fontSize: 15, fontWeight: '700', color: t.text }}>你可以這樣記</Text>
            <Icon name="chevronRight" size={16} color={t.muted} />
          </Pressable>
        </View>

        <View style={styles.blockSmall}>
          <Card flat testID="confuse-misses">
            <View style={styles.missRow}>
              <Text style={{ fontSize: 14, color: t.muted }}>最近在這組答錯</Text>
              <Text style={{ fontSize: 15, fontWeight: '700', color: t.text }}>{misses} 次</Text>
            </View>
          </Card>
        </View>
      </ScrollView>

      <MnemonicSheet
        testID="mnemonic-sheet"
        visible={mnemonicOpen}
        mnemonic={mnemonicOf(group.id)}
        onClose={() => setMnemonicOpen(false)}
      />

      <View style={[styles.bottom, { paddingBottom: bottom }]}>
        {dropPlay ? (
          <SecondaryButton
            testID="play-drop"
            label="用這一組玩掉字"
            onPress={() => router.push({ pathname: '/drop/play', params: { sel: dropPlay.selection.join(',') } })}
            style={styles.dropBtn}
          />
        ) : null}
        <PrimaryButton
          testID="quick-confuse"
          label="快速辨識 10 題"
          onPress={() => router.push({ pathname: '/quiz', params: { mode: 'confuse', group: group.id } })}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cardSpeaker: { position: 'absolute', right: 10, top: 10 },
  flex: { flex: 1 },
  content: { paddingBottom: 12 },
  pills: { paddingTop: 12, paddingHorizontal: SIDE, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    minHeight: 42,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cards: { paddingTop: 18, paddingHorizontal: SIDE, flexDirection: 'row', gap: GAP },
  kanaCard: {
    borderWidth: 1,
    borderRadius: 24,
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 6,
  },
  block: { paddingTop: 12, paddingHorizontal: SIDE },
  blockSmall: { paddingTop: 10, paddingHorizontal: SIDE },
  mnemonicRow: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  missRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bottom: { paddingHorizontal: SIDE, paddingTop: 12 },
  dropBtn: { marginBottom: 10 },
});
