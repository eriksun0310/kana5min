import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../src/components';
import { isLearned } from '../../src/logic/srs';
import { useProgressStore } from '../../src/store';
import { useTopPad } from '../../src/theme/layout';
import { useTheme } from '../../src/theme/useTheme';

/** 練習分頁（階段 1 簡單版）：只有「自動練習」入口，完整版在階段 2。 */
export default function PracticeScreen() {
  const t = useTheme();
  const router = useRouter();
  const top = useTopPad(56);
  const hasLearned = useProgressStore((s) => Object.values(s.progress).some(isLearned));

  return (
    <Screen>
      <View style={[styles.header, { paddingTop: top }]}>
        <Text style={{ fontSize: 24, fontWeight: '700', color: t.text }}>練習</Text>
        <Text style={{ fontSize: 14, color: t.muted }}>系統會依照你答錯的紀錄出題</Text>
      </View>

      <View style={styles.cardWrap}>
        <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.line }]}>
          <Text style={{ fontSize: 19, fontWeight: '700', color: t.text }}>自動練習</Text>
          <Text style={{ fontSize: 14, lineHeight: 21, color: t.muted }}>
            從你學過的字裡出題，常答錯的字會多出現幾次。
          </Text>
          <Pressable
            testID="start-auto-practice"
            accessibilityRole="button"
            accessibilityState={{ disabled: !hasLearned }}
            disabled={!hasLearned}
            onPress={() => router.push({ pathname: '/quiz', params: { mode: 'auto' } })}
            style={({ pressed }) => [
              styles.start,
              { backgroundColor: hasLearned ? t.accent : t.track, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={{ fontSize: 15, fontWeight: '700', color: hasLearned ? t.onAccent : t.muted }}>
              開始
            </Text>
          </Pressable>
          {!hasLearned ? (
            <Text testID="practice-empty-hint" style={{ fontSize: 13, color: t.muted }}>
              先學幾個字再來練習
            </Text>
          ) : null}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 24, gap: 4 },
  cardWrap: { paddingHorizontal: 24, paddingTop: 16 },
  card: { borderWidth: 1, borderRadius: 22, padding: 20, gap: 12 },
  start: {
    alignSelf: 'flex-start',
    minHeight: 44,
    paddingHorizontal: 20,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
