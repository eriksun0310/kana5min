import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { KanaText, Screen } from '../../src/components';
import { byId, kanaOfKind, seionGrid, type KanaKind, type Script } from '../../src/data';
import { isKatakanaUnlocked } from '../../src/logic/confusion';
import { isLearned } from '../../src/logic/srs';
import { useProgressStore } from '../../src/store';
import { useTopPad } from '../../src/theme/layout';
import { useTheme } from '../../src/theme/useTheme';

const KINDS: { kind: KanaKind; label: string }[] = [
  { kind: 'seion', label: '清音' },
  { kind: 'dakuon', label: '濁音' },
  { kind: 'youon', label: '拗音' },
];

const SCRIPTS: { script: Script; label: string }[] = [
  { script: 'hiragana', label: '平假名' },
  { script: 'katakana', label: '片假名' },
];

const GAP = 5;
const SIDE = 24;

/** 目前分頁要顯示的格子：Kana id 或 null（空格）。 */
function cellsFor(kind: KanaKind, script: Script): (string | null)[] {
  if (kind === 'seion') return seionGrid(script);
  return kanaOfKind(kind, script).map((k) => k.id);
}

/**
 * C2-03 五十音表：平假名／片假名切換、清音／濁音／拗音分頁、已學標記、點字進詳情。
 * 片假名隨時可以切換瀏覽；平假名清音學完前只是多一行說明，學習流程仍在平假名學完後才開始。
 */
export default function ChartScreen() {
  const t = useTheme();
  const router = useRouter();
  const top = useTopPad(56);
  const { width } = useWindowDimensions();
  const progress = useProgressStore((s) => s.progress);
  const [kind, setKind] = useState<KanaKind>('seion');
  const [script, setScript] = useState<Script>('hiragana');
  const unlocked = useMemo(() => isKatakanaUnlocked(Object.values(progress)), [progress]);
  const shownScript = script;

  const cols = kind === 'youon' ? 3 : 5;
  const cells = useMemo(() => cellsFor(kind, shownScript), [kind, shownScript]);
  const rows = useMemo(() => {
    const out: (string | null)[][] = [];
    for (let i = 0; i < cells.length; i += cols) out.push(cells.slice(i, i + cols));
    return out;
  }, [cells, cols]);
  const cellWidth = (width - SIDE * 2 - GAP * (cols - 1)) / cols;

  return (
    <Screen>
      <View style={[styles.header, { paddingTop: top }]}>
        <Text style={{ fontSize: 24, fontWeight: '700', color: t.text }}>五十音表</Text>
        <View style={[styles.segment, { backgroundColor: t.chip }]}>
          {SCRIPTS.map((s) => {
            const on = s.script === shownScript;
            return (
              <Pressable
                key={s.script}
                testID={`script-${s.script}`}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                hitSlop={{ top: 5, bottom: 5 }}
                onPress={() => setScript(s.script)}
                style={[styles.segBtn, on && { backgroundColor: t.surface }]}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: on ? '700' : '400',
                    color: on ? t.text : t.muted,
                  }}
                >
                  {s.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {shownScript === 'katakana' && !unlocked ? (
        <View style={styles.hintWrap}>
          <View style={[styles.hint, { backgroundColor: t.accentSoft }]} testID="katakana-locked-hint">
            <Text style={{ fontSize: 13, color: t.accentText }}>可以先瀏覽，平假名學完後開始學片假名</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.kinds}>
        {KINDS.map((k) => {
          const on = k.kind === kind;
          return (
            <Pressable
              key={k.kind}
              testID={`kind-${k.kind}`}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              hitSlop={{ top: 3, bottom: 3 }}
              onPress={() => setKind(k.kind)}
              style={[
                styles.kindBtn,
                { borderColor: on ? t.text : t.line, backgroundColor: on ? t.text : 'transparent' },
              ]}
            >
              <Text style={{ fontSize: 14, fontWeight: '700', color: on ? t.bg : t.muted }}>{k.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.grid}>
        {rows.map((row, ri) => (
          <View key={ri} style={styles.row}>
            {row.map((id, ci) => {
              if (!id) return <View key={ci} style={{ width: cellWidth, height: 42 }} />;
              const k = byId(id);
              if (!k) return <View key={ci} style={{ width: cellWidth, height: 42 }} />;
              const learned = isLearned(progress[id]);
              return (
                <Pressable
                  key={ci}
                  testID={`cell-${id}`}
                  accessibilityRole="button"
                  accessibilityLabel={`${k.char}，${k.romaji}${learned ? '，已學' : ''}`}
                  onPress={() => router.push(`/kana/${id}`)}
                  style={[
                    styles.cell,
                    { width: cellWidth, backgroundColor: t.surface, borderColor: t.line },
                  ]}
                >
                  <KanaText size={kind === 'youon' ? 20 : 22} lineHeightRatio={1.2} color={t.text}>
                    {k.char}
                  </KanaText>
                  {learned ? (
                    <View testID={`learned-${id}`} style={[styles.dot, { backgroundColor: t.accent }]} />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ))}
      </ScrollView>

      <Text style={[styles.footer, { color: t.muted }]}>點任何一個字，聽發音、看筆順</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: SIDE,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  segment: { flexDirection: 'row', borderRadius: 999, padding: 4 },
  segBtn: {
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintWrap: { paddingHorizontal: SIDE, paddingTop: 10, alignItems: 'flex-end' },
  hint: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  kinds: { paddingHorizontal: SIDE, paddingTop: 14, flexDirection: 'row', gap: 8 },
  kindBtn: {
    minHeight: 38,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: { paddingHorizontal: SIDE, paddingTop: 14, paddingBottom: 8, gap: GAP },
  row: { flexDirection: 'row', gap: GAP },
  cell: {
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { position: 'absolute', right: 5, top: 5, width: 6, height: 6, borderRadius: 3 },
  footer: { fontSize: 12, textAlign: 'center', paddingHorizontal: SIDE, paddingTop: 6, paddingBottom: 10 },
});
