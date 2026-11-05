import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, Linking, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { BackHeader, PrimaryButton, Screen } from '../src/components';
import { THREADS_HANDLE, THREADS_URL } from '../src/logic/help';
import { useBottomPad } from '../src/theme/layout';
import { useTheme } from '../src/theme/useTheme';

const SIDE = 24;

const DM_TEMPLATE = '嗨，我是＿＿，想了解諧音五十音的合作方式！';

const STEPS = [
  '複製下面的訊息，私訊我們的 Threads',
  '我們說明分潤方式與出款時間',
  '提供你專屬的 App Store 連結',
];

/** 推廣夥伴計畫：分潤說明、參加步驟、私訊範本，按鈕導到 Threads。 */
export default function AffiliateScreen() {
  const t = useTheme();
  const router = useRouter();
  const bottom = useBottomPad(32);

  // 沒有剪貼簿模組（要重打包才能加），先用系統分享選單，裡面有「拷貝」
  const copyTemplate = () => {
    Share.share({ message: DM_TEMPLATE }).catch(() => {});
  };

  const openThreads = async () => {
    try {
      await Linking.openURL(THREADS_URL);
    } catch {
      Alert.alert('無法開啟', `請到 Threads 搜尋 ${THREADS_HANDLE}`);
    }
  };

  return (
    <Screen>
      <BackHeader title="推廣夥伴計畫" onBack={() => router.back()} />
      <ScrollView style={styles.flex} contentContainerStyle={{ paddingBottom: bottom }} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={{ fontSize: 24, lineHeight: 32, fontWeight: '700', color: t.text }}>
            分享諧音五十音，{'\n'}
            <Text style={{ color: t.accentText }}>賺最高 30% 分潤</Text>
          </Text>
          <Text style={{ fontSize: 14, lineHeight: 22, color: t.muted }}>
            分潤比例 10% 起，依當月成績調整，賣得越多比例越高。
          </Text>
        </View>

        <Text style={[styles.section, { color: t.text }]}>怎麼參加</Text>
        <View style={[styles.group, styles.pad, { backgroundColor: t.surface, borderColor: t.line }]}>
          {STEPS.map((text, i) => (
            <Text key={text} style={{ fontSize: 14, lineHeight: 22, color: t.text }}>
              {i + 1}. {text}
            </Text>
          ))}
        </View>

        <Text style={[styles.section, { color: t.text }]}>私訊範本</Text>
        <View style={[styles.group, styles.pad, { backgroundColor: t.surface, borderColor: t.line }]}>
          <Text testID="affiliate-template" selectable style={{ fontSize: 15, lineHeight: 22, color: t.text }}>
            {DM_TEMPLATE}
          </Text>
          <Text style={{ fontSize: 12, color: t.muted }}>把「＿＿」改成你的身分，例如上班族、學生</Text>
          <Pressable
            testID="affiliate-copy"
            accessibilityRole="button"
            onPress={copyTemplate}
            style={[styles.copyBtn, { borderColor: t.accentText }]}
          >
            <Text style={{ fontSize: 14, fontWeight: '700', color: t.accentText }}>複製範本</Text>
          </Pressable>
        </View>

        <View style={styles.actions}>
          <PrimaryButton testID="affiliate-threads" label="私訊 Threads 了解更多" onPress={openThreads} />
          <Text style={{ fontSize: 12, color: t.muted, textAlign: 'center', marginTop: 8 }}>{THREADS_HANDLE}</Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { paddingHorizontal: SIDE, paddingTop: 12, gap: 8 },
  section: { fontSize: 15, fontWeight: '700', paddingHorizontal: SIDE, paddingTop: 20, paddingBottom: 8 },
  group: { marginHorizontal: SIDE, borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  pad: { padding: 16, gap: 10 },
  copyBtn: { minHeight: 44, borderWidth: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  actions: { paddingHorizontal: SIDE, paddingTop: 24 },
});
