import { Stack, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { KanaText, PrimaryButton, Screen } from '../src/components';
import { hiraganaOf, mustById, SEION_COUNT } from '../src/data';
import { useSettingsStore } from '../src/store/settingsStore';
import { useBottomPad } from '../src/theme/layout';
import { useTheme } from '../src/theme/useTheme';
import { startDailyAndGo } from '../src/nav/startDaily';

/** 對照範例：あ→ア、か→カ、へ→ヘ（設計檔的三個例子） */
const SAMPLE_IDS = ['k-a', 'k-ka', 'k-he'];

/** C2-18 片假名開始：平假名 46 個學完後的過場，只在解鎖後第一次回首頁時出現。 */
export default function KataStartScreen() {
  const t = useTheme();
  const router = useRouter();
  const bottom = useBottomPad(44);

  const purchased = useSettingsStore((s) => s.punPackPurchased);
  const promptShown = useSettingsStore((s) => s.punPromptKataShown);
  // 只在第一次看到這個畫面時顯示買斷連結；顯示過就記下來（本次畫面仍保留連結）
  const [showLink] = React.useState(() => !purchased && !promptShown);
  useEffect(() => {
    if (showLink) useSettingsStore.getState().setPunPromptKataShown(true);
  }, [showLink]);

  const start = () => {
    useSettingsStore.getState().setKataIntroSeen(true);
    // 直接開始今天的練習（/learn 會建立 session，新字從片假名取）
    startDailyAndGo(router, 'replace');
  };

  return (
    <Screen>
      {/* 沒有關閉鈕：不讓手勢滑掉，必須按「開始片假名」 */}
      <Stack.Screen options={{ gestureEnabled: false }} />
      <View style={styles.content}>
        <View style={[styles.chip, { backgroundColor: t.accentSoft }]}>
          <Text testID="kata-start-chip" style={[styles.chipText, { color: t.accentText }]}>
            平假名 {SEION_COUNT} / {SEION_COUNT} 完成
          </Text>
        </View>
        <Text style={[styles.title, { color: t.text }]}>接下來學片假名</Text>
        <Text style={[styles.desc, { color: t.muted }]}>
          片假名主要用來寫外來語，像是咖啡、電視。讀音跟平假名一樣，只是寫法不同，所以會學得比較快。
        </Text>
        <View style={styles.grid}>
          {SAMPLE_IDS.map((id) => {
            const k = mustById(id);
            const h = hiraganaOf(k);
            return (
              <View
                key={id}
                testID={`kata-sample-${id}`}
                style={[styles.card, { backgroundColor: t.surface, borderColor: t.line }]}
              >
                <View style={styles.pair}>
                  <KanaText size={22} lineHeightRatio={1.2} color={t.muted}>
                    {h?.char ?? ''}
                  </KanaText>
                  <Text style={{ fontSize: 14, color: t.muted }}>→</Text>
                  <KanaText size={36} lineHeightRatio={1.2}>
                    {k.char}
                  </KanaText>
                </View>
                <Text style={{ fontSize: 12, color: t.muted }}>{k.romaji}</Text>
              </View>
            );
          })}
        </View>
      </View>
      <View style={[styles.bottom, { paddingBottom: bottom }]}>
        <PrimaryButton testID="kata-start" label="開始片假名" onPress={start} />
        {showLink ? (
          <Pressable
            testID="kata-punpack-link"
            accessibilityRole="link"
            onPress={() => router.push('/punpack')}
            style={styles.link}
          >
            <Text style={{ fontSize: 14, color: t.accentText, textDecorationLine: 'underline' }}>
              片假名也有諧音梗：好笑記憶包
            </Text>
          </Pressable>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, paddingHorizontal: 24, justifyContent: 'center', gap: 18 },
  chip: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  chipText: { fontSize: 13, fontWeight: '700' },
  title: { fontSize: 28, fontWeight: '700' },
  desc: { fontSize: 15, lineHeight: 24 },
  grid: { flexDirection: 'row', gap: 10 },
  card: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 4,
  },
  pair: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bottom: { paddingHorizontal: 24 },
  link: { minHeight: 44, marginTop: 6, alignItems: 'center', justifyContent: 'center' },
});
