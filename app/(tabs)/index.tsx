import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Icon, KanaText, PrimaryButton, Screen, StatCard } from '../../src/components';
import { byId } from '../../src/data';
import { computeHomeStats, computeStreak } from '../../src/logic/progressStats';
import { useProgressStore, useSettingsStore } from '../../src/store';
import { useTopPad } from '../../src/theme/layout';
import { useTheme } from '../../src/theme/useTheme';

/** C2-02 首頁：下一個新字、三個統計、46 格進度條、開始今天的練習。 */
export default function HomeScreen() {
  const t = useTheme();
  const router = useRouter();
  const top = useTopPad(56);
  const progress = useProgressStore((s) => s.progress);
  const goal = useSettingsStore((s) => s.dailyGoalMinutes);
  const practiceDates = useSettingsStore((s) => s.practiceDates);

  // 回到前景（切回分頁、練習結束返回）時重算「現在」，到期數與連續天數才會更新
  const [now, setNow] = useState(() => Date.now());
  useFocusEffect(
    useCallback(() => {
      setNow(Date.now());
    }, []),
  );

  const stats = useMemo(() => computeHomeStats(Object.values(progress), now), [progress, now]);
  const streak = useMemo(() => computeStreak(practiceDates, now), [practiceDates, now]);

  const next = stats.nextKanaId ? byId(stats.nextKanaId) : undefined;
  // 沒有新字、也沒有到期複習 = 今天完成
  const allDone = !next && stats.dueCount === 0;

  return (
    <Screen>
      <View style={[styles.header, { paddingTop: top }]}>
        <Text style={{ fontSize: 15, color: t.muted }}>平假名</Text>
        <View style={styles.streak} testID="home-streak">
          <Icon name="flame" size={18} color={t.accentText} />
          <Text style={{ fontSize: 14, fontWeight: '700', color: t.accentText }}>{streak} 天</Text>
        </View>
      </View>

      <View style={styles.center}>
        {next ? (
          <>
            <Text style={{ fontSize: 14, color: t.muted }}>下一個新字</Text>
            <KanaText size={190} testID="home-next-kana">
              {next.char}
            </KanaText>
            <Text style={{ fontSize: 18, color: t.muted, letterSpacing: 2 }}>{next.romaji}</Text>
          </>
        ) : (
          <View style={styles.done} testID="home-complete">
            <View style={[styles.doneBadge, { backgroundColor: t.accentSoft }]}>
              <Icon name="check" size={56} color={t.accentText} strokeWidth={2.5} />
            </View>
            <Text style={{ fontSize: 24, fontWeight: '700', color: t.text }}>
              {allDone ? '今天完成了' : '平假名都學完了'}
            </Text>
            <Text style={{ fontSize: 14, color: t.muted, textAlign: 'center', lineHeight: 22 }}>
              {allDone
                ? `${stats.total} 個清音全部學完，今天沒有要複習的字`
                : `${stats.total} 個清音全部學完，還有 ${stats.dueCount} 個字等你複習`}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.stats}>
        <StatCard
          style={styles.stat}
          testID="stat-learned"
          value={String(stats.learnedCount)}
          unit={` / ${stats.total}`}
          label="已學"
        />
        <StatCard style={styles.stat} testID="stat-due" value={String(stats.dueCount)} label="待複習" />
        <StatCard style={styles.stat} testID="stat-new" value={String(stats.newTodayCount)} label="今天新字" />
      </View>

      <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {stats.dots.map((d, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              { backgroundColor: d === 'learned' ? t.accent : d === 'next' ? t.next : t.track },
            ]}
          />
        ))}
      </View>

      <View style={styles.cta}>
        <PrimaryButton
          testID="start-today"
          label={allDone ? '今天完成了' : `開始今天的 ${goal} 分鐘`}
          disabled={allDone}
          onPress={() => router.push('/learn')}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 24 },
  done: { alignItems: 'center', gap: 12 },
  doneBadge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  stats: { paddingHorizontal: 24, flexDirection: 'row', gap: 10 },
  stat: { flex: 1 },
  dots: { paddingHorizontal: 24, paddingTop: 14, flexDirection: 'row', gap: 4 },
  dot: { flex: 1, height: 6, borderRadius: 3 },
  cta: { paddingHorizontal: 24, paddingTop: 18, paddingBottom: 16 },
});
