import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Icon, KanaText, Screen } from '../../src/components';
import { availableGroups, confusionCounts, topConfusionGroups } from '../../src/logic/confusion';
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
  const allGroups = useMemo(() => availableGroups(progressList(progress)), [progress]);
  // 練習頁只放最常搞混的前 3 組（沒有答錯紀錄時預設 ぬ・め、る・ろ、シ・ツ）；其餘在「看全部」
  const groups = useMemo(() => topConfusionGroups(allGroups, counts, 3), [allGroups, counts]);

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
          {hasLearned ? (
            <Pressable
              testID="start-auto-practice"
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/quiz', params: { mode: 'auto' } })}
              style={({ pressed }) => [
                styles.card,
                { backgroundColor: t.surface, borderColor: t.line, opacity: pressed ? 0.9 : 1 },
              ]}
            >
              <View style={styles.cardText}>
                <Text style={{ fontSize: 19, fontWeight: '700', color: t.text }}>自動練習</Text>
                <Text style={{ fontSize: 14, lineHeight: 21, color: t.muted }}>
                  聽音選字、看字選音、找不同，10 題
                </Text>
              </View>
              <Icon name="chevronRight" size={20} color={t.accentText} />
            </Pressable>
          ) : (
            // 還沒有任何已學的字：鎖住，直接寫出解鎖條件（不是點了沒反應的灰卡）
            <View
              testID="start-auto-practice"
              accessibilityRole="button"
              accessibilityState={{ disabled: true }}
              accessibilityLabel="自動練習，完成今天第一輪練習後解鎖"
              style={[styles.card, { backgroundColor: t.flat, borderWidth: 0 }]}
            >
              <View style={[styles.lockBadge, { backgroundColor: t.surface }]}>
                <Icon name="lock" size={18} color={t.muted} />
              </View>
              <View style={styles.cardText}>
                <Text style={{ fontSize: 19, fontWeight: '700', color: t.muted }}>自動練習</Text>
                <Text testID="practice-empty-hint" style={{ fontSize: 14, lineHeight: 21, color: t.muted }}>
                  完成今天第一輪練習後解鎖
                </Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.cardWrap}>
          <Pressable
            testID="open-drop"
            accessibilityRole="button"
            onPress={() => router.push('/drop')}
            style={({ pressed }) => [
              styles.card,
              { backgroundColor: t.surface, borderColor: t.line, opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <View style={styles.cardText}>
              <Text style={{ fontSize: 19, fontWeight: '700', color: t.text }}>掉字歸類</Text>
              <Text style={{ fontSize: 14, lineHeight: 21, color: t.muted }}>
                字會掉下來，放進對的籃子，練到不再搞混
              </Text>
            </View>
            <Icon name="chevronRight" size={20} color={t.accentText} />
          </Pressable>
        </View>

        <View style={styles.sectionHead}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: t.text }}>最常搞混的</Text>
          <Text style={{ fontSize: 12, color: t.muted }}>依你的答錯紀錄</Text>
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

        <Pressable
          testID="see-all-groups"
          accessibilityRole="button"
          onPress={() => router.push('/confuse')}
          style={({ pressed }) => [
            styles.seeAll,
            { backgroundColor: t.surface, borderColor: t.line, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={{ fontSize: 14, fontWeight: '700', color: t.accentText }}>看全部 {allGroups.length} 組</Text>
          <Icon name="chevronRight" size={16} color={t.accentText} />
        </Pressable>

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
  lockBadge: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
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
  seeAll: {
    marginHorizontal: SIDE,
    marginTop: 8,
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  specialLeft: { flexDirection: 'row', alignItems: 'baseline', gap: 12 },
  pairKana: { letterSpacing: 4 },
});
