import { Redirect, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Icon, KanaText, PrimaryButton, Screen, StatCard } from '../src/components';
import { mustById } from '../src/data';
import { exitToHome } from '../src/nav/exitToHome';
import { useSessionStore } from '../src/store/sessionStore';
import { useTheme } from '../src/theme/useTheme';
import { useTopPad } from '../src/theme/layout';

/** 用時：不足 1 分顯示「1 分」，否則四捨五入成「N 分」。 */
function minutesLabel(ms: number): string {
  return `${Math.max(1, Math.round(ms / 60000))} 分`;
}

function describe(newCount: number, reviewCount: number): string {
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

  if (!result) return <Redirect href="/" />;
  const { summary } = result;

  // 這一輪剛好學完某一行：先看一行學完畫面，再回首頁
  const goHome = () => {
    if (result.completedRows.length > 0) router.replace('/row-done');
    else exitToHome(router);
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
        <Text style={[styles.title, { color: t.text }]}>今天完成了</Text>
        <Text testID="result-desc" style={[styles.desc, { color: t.muted }]}>
          {describe(summary.newCount, summary.reviewCount)}
        </Text>
      </View>
      <View style={styles.stats}>
        <StatCard testID="stat-correct" value={`${summary.correct} / ${summary.total}`} label="答對" />
        <StatCard testID="stat-new" value={`${summary.newCount}`} label="新字" />
        <StatCard testID="stat-time" value={minutesLabel(summary.elapsedMs)} label="用時" />
      </View>
      <Text style={[styles.listTitle, { color: t.text }]}>接下來的複習</Text>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {summary.items.map((item) => (
          <View
            key={item.kanaId}
            testID={`result-item-${item.kanaId}`}
            style={[styles.item, { backgroundColor: t.surface, borderColor: t.line }]}
          >
            <KanaText size={28} lineHeightRatio={1.2} style={styles.itemKana}>
              {mustById(item.kanaId).char}
            </KanaText>
            <Text
              style={[styles.itemState, { color: item.tone === 'wrong' ? t.wrongText : t.text }]}
            >
              {item.label}
            </Text>
            <Text style={[styles.itemWhen, { color: t.muted }]}>{item.when}</Text>
          </View>
        ))}
      </ScrollView>
      <View style={styles.primary}>
        <PrimaryButton testID="result-home" label="回首頁" onPress={goHome} />
      </View>
      <View style={styles.secondary}>
        <Pressable
          testID="result-again"
          accessibilityRole="button"
          onPress={() => router.replace({ pathname: '/quiz', params: { mode: 'auto' } })}
          style={styles.again}
        >
          <Text style={[styles.againLabel, { color: t.muted }]}>再練一輪</Text>
        </Pressable>
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
  primary: { paddingHorizontal: 24, paddingBottom: 6 },
  secondary: { paddingHorizontal: 24, paddingBottom: 30 },
  again: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  againLabel: { fontSize: 14 },
});
