import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { KanaText, Screen } from '../../src/components';
import { availableGroups, confusionCounts, sortGroupsByMisses } from '../../src/logic/confusion';
import { isLearned } from '../../src/logic/srs';
import { progressList, useProgressStore } from '../../src/store';
import { useTopPad } from '../../src/theme/layout';
import { useTheme } from '../../src/theme/useTheme';

const SIDE = 24;
const GAP = 8;

const SPECIAL = [
  { key: 'long', kana: 'おばあさん', label: '長音', href: '/special/long' },
  { key: 'sokuon', kana: 'きって', label: '促音', href: '/special/sokuon' },
  { key: 'youon', kana: 'きゃ', label: '拗音', href: '/special/youon' },
] as const;

/** C2-13 練習入口：自動練習、最近常搞混（依答錯次數）、特殊音入口。 */
export default function PracticeScreen() {
  const t = useTheme();
  const router = useRouter();
  const top = useTopPad(56);
  const { width } = useWindowDimensions();
  const progress = useProgressStore((s) => s.progress);
  const confusions = useProgressStore((s) => s.confusions);
  const hasLearned = useMemo(() => Object.values(progress).some(isLearned), [progress]);

  const counts = useMemo(() => confusionCounts(confusions), [confusions]);
  const groups = useMemo(
    () => sortGroupsByMisses(availableGroups(progressList(progress)), counts),
    [progress, counts],
  );

  const gridWidth = width - SIDE * 2;
  const pairWidth = (gridWidth - GAP) / 2;
  const specialWidth = (gridWidth - GAP * 2) / 3;

  return (
    <Screen>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, { paddingTop: top }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={{ fontSize: 24, fontWeight: '700', color: t.text }}>練習</Text>
          <Text style={{ fontSize: 14, color: t.muted }}>系統會依照你答錯的紀錄出題</Text>
        </View>

        <View style={styles.cardWrap}>
          <Pressable
            testID="start-auto-practice"
            accessibilityRole="button"
            accessibilityState={{ disabled: !hasLearned }}
            disabled={!hasLearned}
            onPress={() => router.push({ pathname: '/quiz', params: { mode: 'auto' } })}
            style={({ pressed }) => [
              styles.card,
              { backgroundColor: t.surface, borderColor: t.line, opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <Text style={{ fontSize: 19, fontWeight: '700', color: t.text }}>自動練習</Text>
            <Text style={{ fontSize: 14, lineHeight: 21, color: t.muted }}>
              聽音選字、看字選音、易混淆字混合出題，10 題
            </Text>
            <View style={[styles.start, { backgroundColor: hasLearned ? t.accent : t.track }]}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: hasLearned ? t.onAccent : t.muted }}>
                開始
              </Text>
            </View>
            {!hasLearned ? (
              <Text testID="practice-empty-hint" style={{ fontSize: 13, color: t.muted }}>
                先學幾個字再來練習
              </Text>
            ) : null}
          </Pressable>
        </View>

        <View style={styles.sectionHead}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: t.text }}>最近常搞混</Text>
          <Text style={{ fontSize: 12, color: t.muted }}>點一組單獨練</Text>
        </View>
        <View style={styles.grid}>
          {groups.map((g) => {
            const n = counts[g.id] ?? 0;
            return (
              <Pressable
                key={g.id}
                testID={`group-${g.id}`}
                accessibilityRole="button"
                accessibilityLabel={`${g.label}，錯 ${n} 次`}
                onPress={() => router.push({ pathname: '/confuse/[id]', params: { id: g.id } })}
                style={({ pressed }) => [
                  styles.pair,
                  {
                    width: pairWidth,
                    backgroundColor: t.surface,
                    borderColor: t.line,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                <KanaText size={22} lineHeightRatio={1.2} style={styles.pairKana}>
                  {g.label.replace(/・/g, '')}
                </KanaText>
                <Text style={{ fontSize: 12, color: n > 0 ? t.accentText : t.muted }}>錯 {n} 次</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.sectionTitle, { color: t.text }]}>特殊音</Text>
        <View style={styles.grid}>
          {SPECIAL.map((s) => (
            <Pressable
              key={s.key}
              testID={`special-${s.key}`}
              accessibilityRole="button"
              accessibilityLabel={`${s.label}：${s.kana}`}
              onPress={() => router.push(s.href)}
              style={({ pressed }) => [
                styles.special,
                {
                  width: specialWidth,
                  backgroundColor: t.surface,
                  borderColor: t.line,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              {/* おばあさん 5 字在 3 欄格內放不下 22px，單行自動縮小以免折行 */}
              <KanaText
                size={22}
                lineHeightRatio={1.2}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
                style={styles.specialKana}
              >
                {s.kana}
              </KanaText>
              <Text style={{ fontSize: 12, color: t.muted }}>{s.label}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingBottom: 24 },
  header: { paddingHorizontal: SIDE, gap: 4 },
  cardWrap: { paddingHorizontal: SIDE, paddingTop: 16 },
  card: { borderWidth: 1, borderRadius: 22, padding: 20, gap: 12 },
  start: {
    alignSelf: 'flex-start',
    minHeight: 44,
    paddingHorizontal: 20,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHead: {
    paddingTop: 18,
    paddingBottom: 8,
    paddingHorizontal: SIDE,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  sectionTitle: {
    paddingTop: 18,
    paddingBottom: 8,
    paddingHorizontal: SIDE,
    fontSize: 15,
    fontWeight: '700',
  },
  grid: { paddingHorizontal: SIDE, flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  pair: {
    minHeight: 54,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  pairKana: { letterSpacing: 4 },
  specialKana: { maxWidth: '100%', paddingHorizontal: 6 },
  special: {
    minHeight: 72,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
});
