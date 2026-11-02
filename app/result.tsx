import { Redirect, useRouter } from 'expo-router';
import React from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Icon, KanaText, PrimaryButton, Screen, SecondaryButton, StatCard, TextLink } from '../src/components';
import { mustById } from '../src/data';
import { exitToHome } from '../src/nav/exitToHome';
import { shouldAskReminder } from '../src/notifications/reminderPlan';
import { turnOnReminder } from '../src/notifications/syncReminders';
import { useSettingsStore } from '../src/store/settingsStore';
import { useSessionStore } from '../src/store/sessionStore';
import { resultCopy } from '../src/logic/resultCopy';
import { useTheme } from '../src/theme/useTheme';
import { useTopPad } from '../src/theme/layout';

/** 用時：不足 1 分顯示「1 分」，否則四捨五入成「N 分」。 */
function minutesLabel(ms: number): string {
  return `${Math.max(1, Math.round(ms / 60000))} 分`;
}

function describe(newCount: number, reviewCount: number, correct: number, total: number): string {
  // 快速辨識只答了還沒學的字時，沒有新字也沒有複習字
  if (newCount === 0 && reviewCount === 0) return `練習了 ${total} 題，答對 ${correct} 題。`;
  if (newCount > 0 && reviewCount > 0) return `學了 ${newCount} 個新字，也複習了 ${reviewCount} 個舊字。`;
  if (newCount > 0) return `學了 ${newCount} 個新字。`;
  return `複習了 ${reviewCount} 個字。`;
}

/** C2-10 練習結果 */
export default function ResultScreen() {
  const t = useTheme();
  const router = useRouter();
  const top = useTopPad(52);
  const result = useSessionStore((s) => s.result);
  const reminder = useSettingsStore((s) => s.reminder);
  const reminderAsked = useSettingsStore((s) => s.reminderAsked);

  if (!result) return <Redirect href="/" />;
  const { summary } = result;
  const copy = resultCopy({
    mode: result.mode,
    groupId: result.groupId,
    newCount: summary.newCount,
    after: result.after,
    now: Date.now(),
  });

  // 這一輪剛好學完某一行：先看一行學完畫面，再回首頁
  const goHome = () => {
    if (result.completedRows.length > 0) router.replace('/row-done');
    else exitToHome(router);
  };

  // 不論選哪個都只問一次
  const answerReminder = async (yes: boolean) => {
    useSettingsStore.getState().setReminderAsked(true);
    if (!yes) return;
    if (await turnOnReminder()) return;
    Alert.alert('需要通知權限', '目前沒有通知權限，所以無法提醒你。想開啟的話，請到系統設定開啟「諧音五十音」的通知，再到設定頁打開每日提醒。', [
      { text: '取消', style: 'cancel' },
      { text: '前往設定', onPress: () => Linking.openSettings().catch(() => {}) },
    ]);
  };

  return (
    <Screen>
      <View style={[styles.closeRow, { paddingTop: top }]}>
        <Pressable
          testID="result-close"
          accessibilityRole="button"
          accessibilityLabel="關閉"
          onPress={goHome}
          style={styles.close}
        >
          <Icon name="close" size={22} color={t.muted} />
        </Pressable>
      </View>
      <View style={styles.titleBox}>
        <Text style={[styles.title, { color: t.text }]}>{copy.title}</Text>
        <Text testID="result-desc" style={[styles.desc, { color: t.muted }]}>
          {describe(summary.newCount, summary.reviewCount, summary.correct, summary.total)}
        </Text>
      </View>
      <View style={styles.stats}>
        <StatCard testID="stat-correct" value={`${summary.correct} / ${summary.total}`} label="答對" />
        <StatCard testID="stat-new" value={`${summary.newCount}`} label="新字" />
        <StatCard testID="stat-time" value={minutesLabel(summary.elapsedMs)} label="用時" />
      </View>
      <Text style={[styles.listTitle, { color: t.text }]}>下次複習</Text>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {summary.items.map((item) => (
          <View
            key={item.kanaId}
            testID={`result-item-${item.kanaId}`}
            style={[styles.item, { backgroundColor: t.flat, borderWidth: 0 }]}
          >
            <KanaText size={28} lineHeightRatio={1.2} style={styles.itemKana}>
              {mustById(item.kanaId).char}
            </KanaText>
            <Text
              style={[styles.itemState, { color: item.tone === 'wrong' ? t.wrongText : t.text }]}
            >
              {item.label}
            </Text>
            <Text style={[styles.itemWhen, { color: t.muted }]}>{item.when}再練</Text>
          </View>
        ))}
      </ScrollView>
      {shouldAskReminder({ reminderAsked, enabled: reminder.enabled }) ? (
        <View
          testID="reminder-ask"
          style={[styles.ask, { backgroundColor: t.surface, borderColor: t.line }]}
        >
          <Text style={[styles.askTitle, { color: t.text }]}>每天提醒你練習嗎？</Text>
          <View style={styles.askButtons}>
            <Pressable
              testID="reminder-ask-yes"
              accessibilityRole="button"
              onPress={() => answerReminder(true)}
              style={[styles.askBtn, styles.askYes, { backgroundColor: t.accent }]}
            >
              <Text style={[styles.askYesLabel, { color: t.onAccent }]}>好，每天 {reminder.time}</Text>
            </Pressable>
            <Pressable
              testID="reminder-ask-no"
              accessibilityRole="button"
              onPress={() => answerReminder(false)}
              style={[styles.askBtn, styles.askNo, { borderColor: t.line }]}
            >
              <Text style={[styles.askNoLabel, { color: t.muted }]}>不用了</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
      <View style={styles.primary}>
        {copy.focus ? (
          <>
            <Text style={[styles.focusHint, { color: t.muted }]}>剛學的字，馬上練比較不會忘</Text>
            <SecondaryButton
              testID="result-focus"
              label={copy.focus.label}
              onPress={() => router.replace({ pathname: '/quiz', params: { mode: 'focus' } })}
              style={styles.focusBtn}
            />
          </>
        ) : null}
        <PrimaryButton testID="result-home" label="回首頁" onPress={goHome} />
      </View>
      <View style={styles.secondary}>
        <TextLink
          testID="result-again"
          label={copy.again.label}
          onPress={() =>
            router.replace({
              pathname: '/quiz',
              params:
                copy.again.target.mode === 'confuse'
                  ? { mode: 'confuse', group: copy.again.target.group }
                  : { mode: copy.again.target.mode },
            })
          }
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  closeRow: { paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'flex-end' },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  titleBox: { paddingTop: 8, paddingHorizontal: 24, gap: 6 },
  title: { fontSize: 28, fontWeight: '700' },
  desc: { fontSize: 15 },
  focusHint: { fontSize: 13, textAlign: 'center', marginBottom: 8 },
  focusBtn: { marginBottom: 10 },
  stats: { paddingTop: 20, paddingHorizontal: 24, flexDirection: 'row', gap: 10 },
  listTitle: { paddingTop: 22, paddingBottom: 8, paddingHorizontal: 24, fontSize: 15, fontWeight: '700' },
  list: { paddingHorizontal: 24, paddingBottom: 12, gap: 8 },
  item: {
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  itemKana: { width: 36 },
  itemState: { flex: 1, fontSize: 14 },
  itemWhen: { fontSize: 13 },
  ask: {
    marginHorizontal: 24,
    marginBottom: 10,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  askTitle: { fontSize: 15, fontWeight: '700' },
  askButtons: { flexDirection: 'row', gap: 10 },
  askBtn: { minHeight: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  askYes: { flex: 2 },
  askYesLabel: { fontSize: 15, fontWeight: '700' },
  askNo: { flex: 1, borderWidth: 1 },
  askNoLabel: { fontSize: 15 },
  primary: { paddingHorizontal: 24, paddingBottom: 6 },
  secondary: { paddingHorizontal: 24, paddingBottom: 30 },
  again: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  againLabel: { fontSize: 14 },
});
