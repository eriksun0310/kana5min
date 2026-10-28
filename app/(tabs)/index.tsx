import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon, KanaText, PrimaryButton, Screen, StatCard } from '../../src/components';
import { byId, scriptLabel } from '../../src/data';
import { isGraduated } from '../../src/logic/graduate';
import { computeHomeStats, computeStreak } from '../../src/logic/progressStats';
import { currentScript } from '../../src/logic/session';
import { useProgressStore, useSettingsStore } from '../../src/store';
import { useSessionStore } from '../../src/store/sessionStore';
import { useTopPad } from '../../src/theme/layout';
import { useTheme } from '../../src/theme/useTheme';
import { resumeSavedAndGo, startDailyAndGo } from '../../src/nav/startDaily';

/**
 * C2-02 首頁：下一個新字、三個統計、各行進度條、開始今天的練習。
 * 平假名清音學完後（片假名階段）標題與已學、進度條、下一個新字都改算片假名；
 * 解鎖後第一次回到首頁時先顯示片假名開始畫面（C2-18）；
 * 平假名與片假名都學完後，第一次回到首頁時顯示畢業畫面（C2-21）。
 * 有中途離開存起來的練習時，主按鈕改成「繼續今天的練習」，下方小字「從頭開始」；
 * 已畢業後主按鈕下方多一個「下一步：壽司日檢」文字連結。
 */
export default function HomeScreen() {
  const t = useTheme();
  const router = useRouter();
  const top = useTopPad(56);
  const progress = useProgressStore((s) => s.progress);
  const goal = useSettingsStore((s) => s.dailyGoalMinutes);
  const practiceDates = useSettingsStore((s) => s.practiceDates);
  const kataIntroSeen = useSettingsStore((s) => s.kataIntroSeen);
  const graduateSeen = useSettingsStore((s) => s.graduateSeen);

  // 回到前景（切回分頁、練習結束返回）時重算「現在」，到期數與連續天數才會更新
  const [now, setNow] = useState(() => Date.now());
  useFocusEffect(
    useCallback(() => {
      setNow(Date.now());
    }, []),
  );

  // 可接續的存檔（隔天作廢：回到首頁時檢查一次日期）
  const saved = useSessionStore((s) => s.saved);
  useFocusEffect(
    useCallback(() => {
      useSessionStore.getState().refreshSaved(Date.now());
    }, []),
  );

  const list = useMemo(() => Object.values(progress), [progress]);
  const script = useMemo(() => currentScript(list), [list]);
  const stats = useMemo(() => computeHomeStats(list, now, script), [list, now, script]);
  const label = scriptLabel(script);

  // 平假名學完、片假名剛解鎖，而且還沒看過開始畫面：回到首頁時顯示 C2-18
  const showKataIntro = script === 'katakana' && !kataIntroSeen;
  useFocusEffect(
    useCallback(() => {
      if (showKataIntro) router.push('/kata-start');
    }, [showKataIntro, router]),
  );

  // 學完最後一個清音的那一輪結束、回到首頁時（一行學完畫面之後）顯示 C2-21，只自動顯示一次。
  // 先等 C2-18 看過（kataIntroSeen）才檢查，兩個畫面的條件互斥，不會同時跳出來；
  // 進度在練習中提交，首頁當時沒有焦點，回到首頁重新取得焦點時這裡才會執行。
  const graduated = useMemo(() => isGraduated(list), [list]);
  const showGraduate = graduated && !graduateSeen && kataIntroSeen;
  useFocusEffect(
    useCallback(() => {
      if (showGraduate) {
        useSettingsStore.getState().setGraduateSeen(true);
        router.push('/graduate');
      }
    }, [showGraduate, router]),
  );
  const streak = useMemo(() => computeStreak(practiceDates, now), [practiceDates, now]);

  const next = stats.nextKanaId ? byId(stats.nextKanaId) : undefined;
  // 沒有新字、也沒有到期複習 = 今天完成
  const allDone = !next && stats.dueCount === 0;

  return (
    <Screen>
      <View style={[styles.header, { paddingTop: top }]}>
        <Text testID="home-script" style={{ fontSize: 15, color: t.muted }}>
          {label}
        </Text>
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
              {allDone ? '今天完成了' : `${label}都學完了`}
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

      <View style={styles.rows} testID="home-rows">
        <View style={styles.rowsHeader}>
          <Text style={{ fontSize: 13, color: t.muted }}>各行進度</Text>
          {stats.currentRowLabel ? (
            <Text style={{ fontSize: 13, fontWeight: '600', color: t.accent }}>學到{stats.currentRowLabel}</Text>
          ) : null}
        </View>
        <View style={styles.rowsBars} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {stats.rows.map((r) => (
            <View key={r.row} style={styles.rowCell}>
              <View
                style={[
                  styles.rowTrack,
                  { backgroundColor: t.track },
                  r.current && { borderWidth: 1.5, borderColor: t.accent },
                ]}
              >
                <View
                  style={{
                    width: `${(r.learned / Math.max(1, r.total)) * 100}%`,
                    height: '100%',
                    backgroundColor: t.accent,
                  }}
                />
              </View>
              <Text style={{ fontSize: 12, marginTop: 4, color: r.current ? t.accent : t.muted }}>{r.head}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.cta}>
        <PrimaryButton
          testID="start-today"
          label={saved ? '繼續今天的練習' : allDone ? '今天完成了' : `開始今天的 ${goal} 分鐘`}
          disabled={allDone && !saved}
          onPress={() => (saved ? resumeSavedAndGo(router, 'push') : startDailyAndGo(router, 'push'))}
        />
        {saved ? (
          <Pressable
            testID="restart-today"
            accessibilityRole="button"
            onPress={() => startDailyAndGo(router, 'push')}
            style={styles.nextLink}
          >
            <Text style={{ fontSize: 14, color: t.muted }}>從頭開始</Text>
          </Pressable>
        ) : null}
        {graduated ? (
          <Pressable
            testID="home-next-link"
            accessibilityRole="button"
            onPress={() => router.push('/next')}
            style={styles.nextLink}
          >
            <Text style={{ fontSize: 14, color: t.muted }}>下一步：壽司日檢</Text>
          </Pressable>
        ) : null}
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
  rows: { paddingHorizontal: 24, paddingTop: 14 },
  rowsHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  rowsBars: { flexDirection: 'row', gap: 4 },
  rowCell: { flex: 1, alignItems: 'center' },
  rowTrack: { alignSelf: 'stretch', height: 8, borderRadius: 4, overflow: 'hidden' },
  cta: { paddingHorizontal: 24, paddingTop: 18, paddingBottom: 16 },
  nextLink: { minHeight: 44, marginTop: 4, alignItems: 'center', justifyContent: 'center' },
});
