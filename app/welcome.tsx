import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { KanaText, PrimaryButton, Screen } from '../src/components';
import { useSettingsStore } from '../src/store';
import { useTheme } from '../src/theme/useTheme';

type Goal = 3 | 5 | 10;

const GOALS: { value: Goal; label: string; sub: string }[] = [
  { value: 3, label: '3 分鐘', sub: '輕鬆' },
  { value: 5, label: '5 分鐘', sub: '推薦' },
  { value: 10, label: '10 分鐘', sub: '認真' },
];

/** C2-01 歡迎・每日目標：首次開啟時選每天練習 3／5／10 分鐘（預設 5）。 */
export default function WelcomeScreen() {
  const t = useTheme();
  const router = useRouter();
  const { height } = useWindowDimensions();
  const setDailyGoalMinutes = useSettingsStore((s) => s.setDailyGoalMinutes);
  const setOnboarded = useSettingsStore((s) => s.setOnboarded);
  const [goal, setGoal] = useState<Goal>(5);

  // 設計檔以 844 高為基準；矮螢幕時縮小上方留白，避免底部按鈕被擠出畫面
  const topPad = height < 720 ? 56 : 120;

  const start = () => {
    setDailyGoalMinutes(goal);
    setOnboarded(true);
    router.replace('/');
  };

  return (
    <Screen>
      <View style={[styles.hero, { paddingTop: topPad }]}>
        <KanaText size={120} lineHeightRatio={1}>
          あ
        </KanaText>
        <Text style={[styles.title, { color: t.text }]}>從零開始學五十音</Text>
        <Text style={[styles.desc, { color: t.muted }]}>
          每天幾分鐘，一次只學幾個字。先學平假名，再學片假名。
        </Text>
      </View>

      <View style={styles.goalBlock}>
        <Text style={[styles.question, { color: t.text }]}>每天想練多久？</Text>
        <View style={styles.goalRow}>
          {GOALS.map((g) => {
            const on = g.value === goal;
            return (
              <Pressable
                key={g.value}
                testID={`goal-${g.value}`}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => setGoal(g.value)}
                style={[
                  styles.goal,
                  { borderColor: on ? t.accent : t.line, backgroundColor: on ? t.accentSoft : t.surface },
                ]}
              >
                <Text style={[styles.goalLabel, { color: t.text }]}>{g.label}</Text>
                <Text style={[styles.goalSub, { color: t.muted }]}>{g.sub}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ flex: 1 }} />

      <View style={styles.cta}>
        <PrimaryButton label="開始學習" testID="start-learning" onPress={start} />
      </View>
      <View style={styles.note}>
        <Text style={{ fontSize: 14, color: t.muted }}>之後可以在設定裡更改</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: 28, gap: 14 },
  title: { fontSize: 28, fontWeight: '700' },
  desc: { fontSize: 15, lineHeight: 24 },
  goalBlock: { paddingTop: 32, paddingHorizontal: 28, gap: 10 },
  question: { fontSize: 15, fontWeight: '700' },
  goalRow: { flexDirection: 'row', gap: 10 },
  goal: {
    flex: 1,
    minHeight: 76,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  goalLabel: { fontSize: 17, fontWeight: '700' },
  goalSub: { fontSize: 12 },
  cta: { paddingHorizontal: 24, paddingBottom: 12 },
  note: { minHeight: 44, paddingBottom: 28, alignItems: 'center', justifyContent: 'center' },
});
