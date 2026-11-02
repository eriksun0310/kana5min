import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import {
  HomeHelpSheet,
  Icon,
  KanaListSheet,
  KanaText,
  PrimaryButton,
  Screen,
  TextLink,
  type KanaListItem,
} from '../../src/components';
import { byId, scriptLabel } from '../../src/data';
import { isGraduated } from '../../src/logic/graduate';
import { justLearnedIds, learnedTooFast } from '../../src/logic/justLearned';
import { DAY_MS } from '../../src/logic/srs';
import { computeHomeStats, computeStreak } from '../../src/logic/progressStats';
import { currentScript, defaultLearningOrder, dueKanaIds, NEW_PER_SESSION, nextNewKanaIds } from '../../src/logic/session';
import { useProgressStore, useSettingsStore } from '../../src/store';
import { useSessionStore } from '../../src/store/sessionStore';
import { isCompactHeight, useTopPad } from '../../src/theme/layout';
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
  const compact = isCompactHeight(useWindowDimensions().height);
  const progress = useProgressStore((s) => s.progress);
  const goal = useSettingsStore((s) => s.dailyGoalMinutes);
  const practiceDates = useSettingsStore((s) => s.practiceDates);
  const kataIntroSeen = useSettingsStore((s) => s.kataIntroSeen);
  const graduateSeen = useSettingsStore((s) => s.graduateSeen);

  // 回到前景（切回分頁、練習結束返回）時重算「現在」，到期數與連續天數才會更新
  const [helpOpen, setHelpOpen] = useState(false);
  const [sheet, setSheet] = useState<'due' | 'new' | null>(null);
  // 面板收起來的動畫期間內容不能馬上變空：記住最後一次開的是哪一個。兩個面板共用同一個 Modal，
  // 避免 iOS 上「前一個還在收起、後一個又要開」開不起來。
  const lastSheet = useRef<'due' | 'new'>('due');
  if (sheet) lastSheet.current = sheet;
  const shown = sheet ?? lastSheet.current;
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

  // 統計點開的面板：待複習是哪幾個字、今天要學哪 3 個字
  const dueItems = useMemo<KanaListItem[]>(
    () =>
      dueKanaIds(list, now).flatMap((id) => {
        const k = byId(id);
        if (!k) return [];
        const days = Math.floor((now - (progress[id]?.nextReviewAt ?? now)) / DAY_MS);
        return [{ id, char: k.char, caption: days <= 0 ? '今天' : `${days} 天前`, accent: days <= 0 }];
      }),
    [list, now, progress],
  );
  const newItems = useMemo<KanaListItem[]>(
    () =>
      nextNewKanaIds(list, NEW_PER_SESSION, defaultLearningOrder(script)).flatMap((id) => {
        const k = byId(id);
        return k ? [{ id, char: k.char, caption: k.romaji }] : [];
      }),
    [list, script],
  );
  const startFromSheet = () => {
    setSheet(null);
    if (saved) resumeSavedAndGo(router, 'push');
    else startDailyAndGo(router, 'push');
  };

  // 今天最近一輪剛學的字、今天是否學太快
  const justLearned = useMemo(() => justLearnedIds(list, now), [list, now]);
  const tooFast = useMemo(() => learnedTooFast(list, now), [list, now]);
  const learnedKana = justLearned.map((id) => byId(id)?.char).filter((c): c is string => !!c);
  const nextKana = newItems.map((i) => i.char);
  // 今天已經學過新字：主按鈕變成「再學 N 個」（沒有每日上限，不會擋住）
  const learnedAlready = justLearned.length > 0;

  const next = stats.nextKanaId ? byId(stats.nextKanaId) : undefined;
  // 沒有新字、也沒有到期複習 = 今天完成
  const allDone = !next && stats.dueCount === 0;

  return (
    <Screen>
      <View style={[styles.header, { paddingTop: top }]}>
        <Text testID="home-script" style={{ fontSize: 15, color: t.muted }}>
          {label}
        </Text>
        <View style={styles.headerRight}>
          <View style={styles.streak} testID="home-streak">
            <Icon name="flame" size={18} color={t.accentText} />
            <Text style={{ fontSize: 14, fontWeight: '700', color: t.accentText }}>{streak} 天</Text>
          </View>
          <Pressable
            testID="home-help"
            accessibilityRole="button"
            accessibilityLabel="首頁說明"
            onPress={() => setHelpOpen(true)}
            hitSlop={8}
            style={[styles.help, { borderColor: t.line, backgroundColor: t.surface }]}
          >
            <Text style={{ fontSize: 15, fontWeight: '700', color: t.muted }}>?</Text>
          </Pressable>
        </View>
      </View>

      <Pressable
        testID="stat-learned"
        accessibilityRole="button"
        accessibilityHint="看五十音表和各行進度"
        onPress={() => router.push('/chart')}
        style={styles.map}
      >
        <View style={[styles.mapTrack, { backgroundColor: t.track }]}>
          <View
            style={{
              width: `${(stats.learnedCount / Math.max(1, stats.total)) * 100}%`,
              height: '100%',
              backgroundColor: t.accent,
            }}
          />
        </View>
        <Text style={{ fontSize: 13, fontWeight: '600', color: t.muted }}>{`${stats.learnedCount} / ${stats.total}`}</Text>
        <Icon name="chevronRight" size={14} color={t.muted} />
      </Pressable>

      <View style={styles.center}>
        {next ? (
          <>
            {learnedAlready ? (
              <View testID="home-learned-tag" style={[styles.tag, { backgroundColor: t.accentSoft }]}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: t.accentText }}>今天已學 {justLearned.length} 個</Text>
              </View>
            ) : null}
            <Text style={{ fontSize: 14, color: t.muted }}>下一個新字</Text>
            <KanaText size={compact ? 120 : 160} testID="home-next-kana">
              {next.char}
            </KanaText>
            <Text style={{ fontSize: 18, color: t.muted, letterSpacing: 2 }}>{next.romaji}</Text>
            <Pressable
              testID="stat-new"
              accessibilityRole="button"
              accessibilityLabel={`${learnedAlready ? '再學' : '今天學'} ${nextKana.join('、')}，點一下看內容`}
              onPress={() => setSheet('new')}
              hitSlop={8}
              style={styles.nextLine}
            >
              <Text style={{ fontSize: 15, color: t.text }}>
                {learnedAlready ? '想多學：再學 ' : '今天學 '}
                <Text style={{ fontWeight: '700' }}>{nextKana.join('、')}</Text>
              </Text>
              <Icon name="chevronRight" size={14} color={t.muted} />
            </Pressable>
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
        {stats.dueCount > 0 ? (
          <Pressable
            testID="stat-due"
            accessibilityRole="button"
            onPress={() => setSheet('due')}
            style={[styles.duePill, { backgroundColor: t.surface, borderColor: t.line }]}
          >
            <Text style={{ fontSize: 14, fontWeight: '700', color: t.accentText }}>{stats.dueCount} 個字待複習</Text>
            <Icon name="chevronRight" size={14} color={t.muted} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.cta}>
        <PrimaryButton
          testID="start-today"
          label={
            saved
              ? '繼續今天的練習'
              : allDone
                ? '今天完成了'
                : learnedAlready && next
                  ? `再學 ${stats.newTodayCount} 個`
                  : `開始今天的 ${goal} 分鐘`
          }
          disabled={allDone && !saved}
          onPress={() => (saved ? resumeSavedAndGo(router, 'push') : startDailyAndGo(router, 'push'))}
        />
        {saved ? (
          <TextLink testID="restart-today" label="從頭開始" onPress={() => startDailyAndGo(router, 'push')} />
        ) : null}
        {learnedAlready && !saved ? (
          <TextLink
            testID="home-practice-link"
            label={`練剛學的字（${learnedKana.join(' ')}）`}
            onPress={() => router.push({ pathname: '/quiz', params: { mode: 'focus' } })}
          />
        ) : null}
        {tooFast ? (
          <Text testID="home-fast-warning" style={{ fontSize: 13, color: t.muted, textAlign: 'center', marginTop: 4 }}>
            一次學太多容易忘，明天記得回來複習
          </Text>
        ) : null}
        {graduated ? (
          <TextLink testID="home-next-link" label="下一步：壽司日檢" onPress={() => router.push('/next')} />
        ) : null}
      </View>
      <HomeHelpSheet visible={helpOpen} goalMinutes={goal} onClose={() => setHelpOpen(false)} />
      <KanaListSheet
        testID={shown === 'new' ? 'new-sheet' : 'due-sheet'}
        visible={sheet !== null}
        title={shown === 'new' ? `今天要學的 ${newItems.length} 個字` : `待複習　${dueItems.length} 個字`}
        subtitle={
          shown === 'new'
            ? newItems.length > 0
              ? '先看字、聽音，再練筆順和描寫'
              : '平假名和片假名都學完了'
            : dueItems.length > 0
              ? '這些字今天要複習，隔太久會忘'
              : '今天沒有要複習的字'
        }
        items={shown === 'new' ? newItems : dueItems}
        actionLabel={
          shown === 'new'
            ? newItems.length > 0
              ? '開始學新字'
              : '知道了'
            : dueItems.length > 0
              ? '開始今天的練習'
              : '知道了'
        }
        onAction={(shown === 'new' ? newItems.length : dueItems.length) > 0 ? startFromSheet : () => setSheet(null)}
        onClose={() => setSheet(null)}
      />
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
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  help: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  map: { paddingHorizontal: 24, paddingTop: 14, flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  mapTrack: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  tag: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, marginBottom: 2 },
  nextLine: { marginTop: 10, minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 4 },
  duePill: {
    marginTop: 10,
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cta: { paddingHorizontal: 24, paddingTop: 18, paddingBottom: 16 },
});
