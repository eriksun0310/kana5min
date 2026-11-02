import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { byId } from '../../src/data';
import { Icon, KanaText, PrimaryButton, Screen } from '../../src/components';
import { availableGroups, confusionCounts, topConfusionGroups } from '../../src/logic/confusion';
import { justLearnedIds } from '../../src/logic/justLearned';
import { isLearned } from '../../src/logic/srs';
import { progressList, useProgressStore } from '../../src/store';
import { useTopPad } from '../../src/theme/layout';
import { useTheme } from '../../src/theme/useTheme';

const SIDE = 24;

interface Row {
  key: string;
  testID: string;
  title: string;
  hint: string;
  onPress: () => void;
  locked?: boolean;
}

/**
 * C2-13 練習入口：今天有學新字時最上面一張「練剛學的字」卡；下面一份清單：
 * 自動練習、掉字歸類、易混淆字（右邊是錯最多的一組）、特殊音。
 */
export default function PracticeScreen() {
  const t = useTheme();
  const router = useRouter();
  const top = useTopPad(56);
  const progress = useProgressStore((s) => s.progress);
  const confusions = useProgressStore((s) => s.confusions);
  const hasLearned = useMemo(() => Object.values(progress).some(isLearned), [progress]);
  const [now, setNow] = useState(() => Date.now());
  useFocusEffect(
    useCallback(() => {
      setNow(Date.now());
    }, []),
  );

  const list = useMemo(() => progressList(progress), [progress]);
  const counts = useMemo(() => confusionCounts(confusions), [confusions]);
  const allGroups = useMemo(() => availableGroups(list), [list]);
  const worst = useMemo(() => topConfusionGroups(allGroups, counts, 1)[0], [allGroups, counts]);
  const worstMisses = worst ? (counts[worst.id] ?? 0) : 0;
  const focus = useMemo(() => justLearnedIds(list, now), [list, now]);
  const focusChars = focus.map((id) => byId(id)?.char).filter((c): c is string => !!c);

  const rows: Row[] = [
    {
      key: 'auto',
      testID: 'start-auto-practice',
      title: '自動練習',
      hint: hasLearned ? '10 題，混合各種題型，常答錯的字多練' : '完成今天第一輪練習後解鎖',
      onPress: () => router.push({ pathname: '/quiz', params: { mode: 'auto' } }),
      locked: !hasLearned,
    },
    {
      key: 'drop',
      testID: 'open-drop',
      title: '掉字歸類',
      hint: '把長得像的字放進對的籃子',
      onPress: () => router.push('/drop'),
    },
    {
      key: 'confuse',
      testID: 'see-all-groups',
      title: '易混淆字',
      hint: worst && worstMisses > 0 ? `${worst.label} 錯 ${worstMisses} 次` : '長得很像的字放一起比較',
      onPress: () => router.push('/confuse'),
    },
    {
      key: 'special',
      testID: 'open-special',
      title: '特殊音',
      hint: '拉長、停頓、合起來唸的唸法',
      onPress: () => router.push('/special/long'),
    },
  ];

  return (
    <Screen>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, { paddingTop: top }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={{ fontSize: 24, fontWeight: '700', color: t.text }}>練習</Text>
        </View>

        {focus.length > 0 ? (
          <View style={styles.heroWrap}>
            <View testID="practice-focus" style={[styles.hero, { backgroundColor: t.surface, borderColor: t.accent }]}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: t.accentText }}>練剛學的字</Text>
              <KanaText size={36} lineHeightRatio={1.2} style={styles.heroKana}>
                {focusChars.join(' ')}
              </KanaText>
              <Text style={{ fontSize: 14, color: t.muted }}>看字、聽音、默寫，每個字各 1 題</Text>
              <PrimaryButton
                testID="start-focus-practice"
                label="開始練習"
                onPress={() => router.push({ pathname: '/quiz', params: { mode: 'focus' } })}
                style={styles.heroBtn}
              />
            </View>
          </View>
        ) : null}

        <View style={[styles.list, { backgroundColor: t.surface, borderColor: t.line }]}>
          {rows.map((r, i) => (
            <Pressable
              key={r.key}
              testID={r.testID}
              accessibilityRole="button"
              accessibilityState={{ disabled: !!r.locked }}
              accessibilityLabel={`${r.title}，${r.hint}`}
              onPress={r.locked ? undefined : r.onPress}
              style={({ pressed }) => [
                styles.listRow,
                i > 0 && { borderTopWidth: 1, borderTopColor: t.line },
                { opacity: pressed && !r.locked ? 0.7 : 1 },
              ]}
            >
              {r.locked ? (
                <View style={[styles.lockBadge, { backgroundColor: t.flat }]}>
                  <Icon name="lock" size={16} color={t.muted} />
                </View>
              ) : null}
              <View style={styles.rowText}>
                <Text style={{ fontSize: 17, fontWeight: '700', color: r.locked ? t.muted : t.text }}>{r.title}</Text>
                <Text
                  testID={r.locked ? 'practice-empty-hint' : undefined}
                  style={{ fontSize: 13, lineHeight: 19, color: r.key === 'confuse' && worstMisses > 0 ? t.accentText : t.muted }}
                >
                  {r.hint}
                </Text>
              </View>
              {r.locked ? null : <Icon name="chevronRight" size={16} color={t.muted} />}
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
  header: { paddingHorizontal: SIDE, paddingBottom: 4 },
  heroWrap: { paddingHorizontal: SIDE, paddingTop: 12 },
  hero: { borderWidth: 2, borderRadius: 20, padding: 18, gap: 4 },
  heroKana: { letterSpacing: 6 },
  heroBtn: { marginTop: 12 },
  list: { marginHorizontal: SIDE, marginTop: 16, borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  listRow: {
    minHeight: 64,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowText: { flex: 1, gap: 2 },
  lockBadge: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
