import { Redirect, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Icon, KanaText, PrimaryButton, Screen } from '../src/components';
import {
  byId,
  byRow,
  newlyReadableWords,
  ROW_LABEL,
  rowOf,
  SEION_COUNT,
  seionOrder,
  wordsReadableWith,
  type Progress,
} from '../src/data';
import { nextNewKanaIds } from '../src/logic/session';
import { exitToHome } from '../src/nav/exitToHome';
import { useSessionStore } from '../src/store/sessionStore';
import { useTheme } from '../src/theme/useTheme';

/** 已學清音的字元清單 */
function learnedChars(progress: Progress[]): string[] {
  const learned = new Set(progress.filter((p) => p.learnedAt != null).map((p) => p.kanaId));
  return seionOrder('hiragana')
    .filter((k) => learned.has(k.id))
    .map((k) => k.char);
}

/** C2-11 一行學完 */
export default function RowDoneScreen() {
  const t = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const result = useSessionStore((s) => s.result);

  if (!result || result.completedRows.length === 0) return <Redirect href="/" />;

  // 一輪最多新學 3 個字，不會同時湊滿兩行；保險起見取最後湊滿的那一行
  const row = result.completedRows[result.completedRows.length - 1];
  const cells = byRow(row);
  const before = learnedChars(result.before);
  const after = learnedChars(result.after);
  const learnedCount = after.length;

  let words = newlyReadableWords(before, after);
  if (words.length === 0) words = wordsReadableWith(after);
  words = words.slice(0, 4);

  const nextId = nextNewKanaIds(result.after, 1)[0];
  const nextRow = nextId ? rowOf(nextId) : undefined;
  const nextLabel = nextRow ? ROW_LABEL[nextRow] : undefined;

  // 5 欄格子：や行、わ行只有 3 個字，仍維持每格 1/5 寬
  const cellWidth = (width - 48 - 8 * 4) / 5;

  return (
    <Screen>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={[styles.check, { backgroundColor: t.accent }]}>
          <Icon name="check" size={32} color={t.onAccent} strokeWidth={2.6} />
        </View>
        <View style={styles.titleBox}>
          <Text testID="row-title" style={[styles.title, { color: t.text }]}>
            {ROW_LABEL[row]} 學完了
          </Text>
          <Text testID="row-desc" style={[styles.desc, { color: t.muted }]}>
            平假名已經學了 {learnedCount} 個，還有 {Math.max(0, SEION_COUNT - learnedCount)} 個。
          </Text>
        </View>
        <View style={styles.cells}>
          {cells.map((k) => (
            <View
              key={k.id}
              style={[
                styles.cell,
                { width: cellWidth, backgroundColor: t.accentSoft, borderColor: t.accent },
              ]}
            >
              <KanaText size={32} lineHeightRatio={1.2}>
                {k.char}
              </KanaText>
            </View>
          ))}
        </View>
        {words.length > 0 ? (
          <>
            <Text style={[styles.wordsTitle, { color: t.text }]}>現在你能讀這些字了</Text>
            <View style={styles.words}>
              {words.map((w) => (
                <View
                  key={w.id}
                  style={[styles.word, { backgroundColor: t.surface, borderColor: t.line }]}
                >
                  <KanaText size={24} lineHeightRatio={1.2}>
                    {w.text}
                  </KanaText>
                  <Text style={[styles.wordMeaning, { color: t.muted }]}>{w.meaning}</Text>
                </View>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
      <View style={styles.primary}>
        {nextLabel ? (
          <PrimaryButton
            testID="row-continue"
            label={`繼續 ${nextLabel}`}
            onPress={() => router.replace('/learn')}
          />
        ) : (
          <PrimaryButton testID="row-continue" label="回首頁" onPress={() => exitToHome(router)} />
        )}
      </View>
      <View style={styles.secondary}>
        <Pressable
          testID="row-review"
          accessibilityRole="button"
          onPress={() => router.replace({ pathname: '/quiz', params: { mode: 'auto' } })}
          style={styles.review}
        >
          <Text style={[styles.reviewLabel, { color: t.muted }]}>先複習一下</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 24, justifyContent: 'center', gap: 18, paddingTop: 52 },
  check: { width: 64, height: 64, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  titleBox: { gap: 6 },
  title: { fontSize: 28, fontWeight: '700' },
  desc: { fontSize: 15 },
  cells: { flexDirection: 'row', gap: 8 },
  cell: {
    height: 62,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordsTitle: { marginTop: 8, fontSize: 15, fontWeight: '700' },
  words: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  word: {
    width: '48.5%',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  wordMeaning: { fontSize: 13 },
  primary: { paddingHorizontal: 24, paddingBottom: 6 },
  secondary: { paddingHorizontal: 24, paddingBottom: 30 },
  review: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  reviewLabel: { fontSize: 14 },
});
