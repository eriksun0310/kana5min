import { Redirect, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Icon, KanaText, PrimaryButton, Screen } from '../src/components';
import {
  byRow,
  newlyReadableWords,
  rowLabel,
  rowOf,
  scriptLabel,
  SEION_COUNT,
  seionOrder,
  wordsReadableWith,
  type Progress,
  type Script,
  type Word,
} from '../src/data';
import { readableLoanwords } from '../src/logic/loanword';
import { defaultLearningOrder, nextNewKanaIds } from '../src/logic/session';
import { exitToHome } from '../src/nav/exitToHome';
import { useSessionStore } from '../src/store/sessionStore';
import { useTheme } from '../src/theme/useTheme';
import { startDailyAndGo } from '../src/nav/startDaily';

/** 該文字已學清音的 Kana id 清單 */
function learnedSeionIds(progress: Progress[], script: Script): string[] {
  const learned = new Set(progress.filter((p) => p.learnedAt != null).map((p) => p.kanaId));
  return seionOrder(script)
    .filter((k) => learned.has(k.id))
    .map((k) => k.id);
}

/**
 * 「現在你能讀這些字了」：
 * 平假名 = 由已學平假名組成的單字；片假名 = 可讀外來語（不含只當例字用的詞）。
 * 優先列這一輪新增能讀的；沒有新增時列全部能讀的，最多 4 個。
 */
function readableWords(script: Script, before: Progress[], after: Progress[]): Word[] {
  const b = learnedSeionIds(before, script);
  const a = learnedSeionIds(after, script);
  let words: Word[];
  if (script === 'katakana') {
    const beforeIds = new Set(readableLoanwords(b).map((w) => w.id));
    words = readableLoanwords(a).filter((w) => !beforeIds.has(w.id));
    if (words.length === 0) words = readableLoanwords(a);
  } else {
    const chars = (ids: string[]) => ids.map((id) => seionOrder(script).find((k) => k.id === id)!.char);
    words = newlyReadableWords(chars(b), chars(a));
    if (words.length === 0) words = wordsReadableWith(chars(a));
  }
  return words.slice(0, 4);
}

/** C2-11 一行學完 */
export default function RowDoneScreen() {
  const t = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const result = useSessionStore((s) => s.result);

  if (!result || result.completedRows.length === 0) return <Redirect href="/" />;

  // 一輪最多新學 3 個字，不會同時湊滿兩行；保險起見取最後湊滿的那一行
  const script = result.completedScript;
  const row = result.completedRows[result.completedRows.length - 1];
  const cells = byRow(row, script);
  const learnedCount = learnedSeionIds(result.after, script).length;
  const words = readableWords(script, result.before, result.after);

  // 下一行只在同一種假名內繼續；平假名學完時回首頁，由首頁接上片假名開始畫面（C2-18）
  const nextId = nextNewKanaIds(result.after, 1, defaultLearningOrder(script))[0];
  const nextRow = nextId ? rowOf(nextId) : undefined;
  const nextLabel = nextRow ? rowLabel(nextRow, script) : undefined;

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
            {rowLabel(row, script)} 學完了
          </Text>
          <Text testID="row-desc" style={[styles.desc, { color: t.muted }]}>
            {`${scriptLabel(script)}已經學了 ${learnedCount} 個，還有 ${Math.max(0, SEION_COUNT - learnedCount)} 個。`}
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
            onPress={() => startDailyAndGo(router, 'replace')}
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
