import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Icon, KanaText, Screen } from '../../src/components';
import { availableGroups, confusionCounts, sortGroupsByMisses } from '../../src/logic/confusion';
import { isLearned } from '../../src/logic/srs';
import { progressList, useProgressStore } from '../../src/store';
import { useTopPad } from '../../src/theme/layout';
import { useTheme } from '../../src/theme/useTheme';

const SIDE = 24;

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
  const progress = useProgressStore((s) => s.progress);
  const confusions = useProgressStore((s) => s.confusions);
  const hasLearned = useMemo(() => Object.values(progress).some(isLearned), [progress]);

  const counts = useMemo(() => confusionCounts(confusions), [confusions]);
  const groups = useMemo(
    () => sortGroupsByMisses(availableGroups(progressList(progress)), counts),
    [progress, counts],
  );

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
              {
                backgroundColor: t.surface,
                borderColor: t.line,
                opacity: pressed ? 0.9 : hasLearned ? 1 : 0.6,
              },
            ]}
          >
            <View style={styles.cardText}>
              <Text style={{ fontSize: 19, fontWeight: '700', color: t.text }}>自動練習</Text>
              <Text style={{ fontSize: 14, lineHeight: 21, color: t.muted }}>
                聽音選字、看字選音、易混淆字混合，10 題
              </Text>
            </View>
            <Icon name="chevronRight" size={20} color={hasLearned ? t.accentText : t.muted} />
          </Pressable>
          {!hasLearned ? (
            <Text testID="practice-empty-hint" style={{ fontSize: 13, color: t.muted, paddingTop: 8 }}>
              先學幾個字再來練習
            </Text>
          ) : null}
        </View>

        <View style={styles.sectionHead}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: t.text }}>最近常搞混</Text>
          <Text style={{ fontSize: 12, color: t.muted }}>點一組單獨練</Text>
        </View>
        <View style={[styles.list, { backgroundColor: t.surface, borderColor: t.line }]}>
          {groups.map((g, i) => {
            const n = counts[g.id] ?? 0;
            return (
              <Pressable
                key={g.id}
                testID={`group-${g.id}`}
                accessibilityRole="button"
                accessibilityLabel={`${g.label}，錯 ${n} 次`}
                onPress={() => router.push({ pathname: '/confuse/[id]', params: { id: g.id } })}
                style={({ pressed }) => [
                  styles.listRow,
                  i > 0 && { borderTopWidth: 1, borderTopColor: t.line },
                  { opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <KanaText size={22} lineHeightRatio={1.2} style={styles.pairKana}>
                  {g.label.replace(/・/g, '')}
                </KanaText>
                <View style={styles.rowRight}>
                  <Text style={{ fontSize: 12, color: n > 0 ? t.accentText : t.muted }}>錯 {n} 次</Text>
                  <Icon name="chevronRight" size={16} color={t.muted} />
                </View>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.sectionTitle, { color: t.text }]}>特殊音</Text>
        <View style={[styles.list, { backgroundColor: t.surface, borderColor: t.line }]}>
          {SPECIAL.map((s, i) => (
            <Pressable
              key={s.key}
              testID={`special-${s.key}`}
              accessibilityRole="button"
              accessibilityLabel={`${s.label}：${s.kana}`}
              onPress={() => router.push(s.href)}
              style={({ pressed }) => [
                styles.listRow,
                i > 0 && { borderTopWidth: 1, borderTopColor: t.line },
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <View style={styles.specialLeft}>
                <KanaText size={22} lineHeightRatio={1.2}>
                  {s.kana}
                </KanaText>
                <Text style={{ fontSize: 13, color: t.muted }}>{s.label}</Text>
              </View>
              <Icon name="chevronRight" size={16} color={t.muted} />
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
  card: {
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardText: { flex: 1, gap: 6 },
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
  list: { marginHorizontal: SIDE, borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  listRow: {
    minHeight: 54,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  specialLeft: { flexDirection: 'row', alignItems: 'baseline', gap: 12 },
  pairKana: { letterSpacing: 4 },
});
