import { Stack, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon, PrimaryButton, Screen } from '../src/components';
import { learnedSeionCount, practiceDayCount } from '../src/logic/graduate';
import { goHomeTab } from '../src/nav/exitToHome';
import { useProgressStore, useSettingsStore } from '../src/store';
import { useTheme } from '../src/theme/useTheme';

/**
 * C2-21 畢業：平假名與片假名清音都學完的慶祝畫面。
 * 數字來自真實資料：已學的平假名／片假名清音數、練習天數。
 * 首頁在「已畢業且沒看過」時自動帶到這裡一次；之後可從設定「畢業紀念」再進來。
 */
export default function GraduateScreen() {
  const t = useTheme();
  const router = useRouter();
  const progress = useProgressStore((s) => s.progress);
  const practiceDates = useSettingsStore((s) => s.practiceDates);

  const stats = useMemo(() => {
    const list = Object.values(progress);
    return [
      { key: 'hiragana', v: learnedSeionCount(list, 'hiragana'), l: '平假名' },
      { key: 'katakana', v: learnedSeionCount(list, 'katakana'), l: '片假名' },
      { key: 'days', v: practiceDayCount(practiceDates), l: '練習天數' },
    ];
  }, [progress, practiceDates]);

  return (
    <Screen>
      {/* 沒有關閉鈕：兩個按鈕就是出口，不讓手勢滑掉 */}
      <Stack.Screen options={{ gestureEnabled: false }} />
      <View style={styles.content}>
        <View style={[styles.badge, { backgroundColor: t.accent }]}>
          <Icon name="check" size={48} color={t.onAccent} strokeWidth={2.6} />
        </View>
        <Text style={[styles.title, { color: t.text }]}>五十音全部學完了</Text>
        <Text style={[styles.desc, { color: t.muted }]}>現在任何用假名寫的字，你都讀得出來。</Text>
        <View style={styles.stats}>
          {stats.map((s) => (
            <View
              key={s.key}
              style={[styles.stat, { backgroundColor: t.surface, borderColor: t.line }]}
            >
              <Text testID={`graduate-stat-${s.key}`} style={[styles.statValue, { color: t.text }]}>
                {s.v}
              </Text>
              <Text style={[styles.statLabel, { color: t.muted }]}>{s.l}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={styles.primary}>
        <PrimaryButton testID="graduate-next" label="看看下一步" onPress={() => router.push('/next')} />
      </View>
      <View style={styles.secondary}>
        <Pressable
          testID="graduate-home"
          accessibilityRole="button"
          onPress={() => goHomeTab(router)}
          style={styles.link}
        >
          <Text style={[styles.linkLabel, { color: t.muted }]}>回首頁繼續複習</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
  },
  badge: {
    width: 96,
    height: 96,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 30, fontWeight: '700', textAlign: 'center' },
  desc: { fontSize: 15, lineHeight: 24, textAlign: 'center' },
  stats: { width: '100%', flexDirection: 'row', gap: 10, marginTop: 8 },
  stat: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    gap: 2,
    alignItems: 'center',
  },
  statValue: { fontSize: 20, fontWeight: '700' },
  statLabel: { fontSize: 12 },
  primary: { paddingHorizontal: 24, paddingBottom: 6 },
  secondary: { paddingHorizontal: 24, paddingBottom: 30 },
  link: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  linkLabel: { fontSize: 14 },
});
