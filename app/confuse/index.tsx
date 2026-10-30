import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BackHeader, Icon, KanaText, Screen } from '../../src/components';
import { availableGroups, confusionCounts, groupsByTab, type CatalogTab } from '../../src/logic/confusion';
import { progressList, useProgressStore } from '../../src/store';
import { useTheme } from '../../src/theme/useTheme';

const SIDE = 24;

/**
 * 最常搞混的（完整目錄）：練習頁只放最常錯的 3 組，其餘都在這裡，依分類標籤切換，
 * 點一組進「長得很像的字」對比頁（含這一組的快速辨識 10 題）。
 */
export default function ConfuseCatalog() {
  const t = useTheme();
  const router = useRouter();
  const progress = useProgressStore((s) => s.progress);
  const confusions = useProgressStore((s) => s.confusions);
  const counts = useMemo(() => confusionCounts(confusions), [confusions]);
  const tabs = useMemo(() => groupsByTab(availableGroups(progressList(progress))), [progress]);
  const total = tabs.reduce((n, x) => n + x.groups.length, 0);
  const [picked, setPicked] = useState<CatalogTab>('hiragana');
  const current = tabs.find((x) => x.tab === picked) ?? tabs[0];

  return (
    <Screen>
      <BackHeader title="最常搞混的" onBack={() => router.back()} />
      <ScrollView style={styles.flex} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text testID="catalog-count" style={{ fontSize: 13, color: t.muted }}>
          {total} 組，點一組看對比和 10 題
        </Text>
        {tabs.length > 1 ? (
          <View style={styles.tabs}>
            {tabs.map((x) => {
              const on = x.tab === current?.tab;
              return (
                <Pressable
                  key={x.tab}
                  testID={`catalog-tab-${x.tab}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  onPress={() => setPicked(x.tab)}
                  style={[
                    styles.tab,
                    { borderColor: on ? t.text : t.line, backgroundColor: on ? t.text : 'transparent' },
                  ]}
                >
                  <Text style={{ fontSize: 14, fontWeight: '700', color: on ? t.bg : t.muted }}>
                    {x.label} {x.groups.length}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}
        <View style={[styles.list, { backgroundColor: t.surface, borderColor: t.line }]}>
          {(current?.groups ?? []).map((g, i) => {
            const n = counts[g.id] ?? 0;
            return (
              <Pressable
                key={g.id}
                testID={`group-${g.id}`}
                accessibilityRole="button"
                accessibilityLabel={`${g.label}，錯 ${n} 次`}
                onPress={() => router.push({ pathname: '/confuse/[id]', params: { id: g.id } })}
                style={({ pressed }) => [
                  styles.row,
                  i > 0 && { borderTopWidth: 1, borderTopColor: t.line },
                  { opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <KanaText size={22} lineHeightRatio={1.2} style={styles.kana}>
                  {g.label.replace(/・/g, '')}
                </KanaText>
                <View style={styles.right}>
                  <Text style={{ fontSize: 12, color: n > 0 ? t.accentText : t.muted }}>錯 {n} 次</Text>
                  <Icon name="chevronRight" size={16} color={t.muted} />
                </View>
              </Pressable>
            );
          })}
        </View>
        <Text style={{ fontSize: 12, color: t.muted, lineHeight: 18 }}>
          {tabs.some((x) => x.tab === 'katakana') ? '' : '片假名的組在平假名學完後才會出現。'}
          更多組之後會陸續加入。
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: SIDE, paddingTop: 8, paddingBottom: 28, gap: 14 },
  tabs: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  tab: { minHeight: 36, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  list: { borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  row: { minHeight: 54, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  kana: { letterSpacing: 4 },
});
