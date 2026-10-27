import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon, PrimaryButton, Screen } from '../src/components';
import { SUSHI_JP_APP_STORE_URL } from '../src/config';
import { isHttpUrl } from '../src/logic/links';
import { goHomeTab } from '../src/nav/exitToHome';
import { useTopPad } from '../src/theme/layout';
import { useTheme } from '../src/theme/useTheme';

/** 賣點文案沿用設計檔；第三點是佔位文字，等壽司日檢的實際賣點確認後再換（見 PROGRESS.md 待確認事項）。 */
const POINTS = ['從 N5 基礎單字開始', '單字都用你已經會讀的假名標音', '[壽司日檢的其他賣點]'];

/** C2-22 導流到壽司日檢：介紹卡與前往 App Store 的按鈕。 */
export default function NextScreen() {
  const t = useTheme();
  const router = useRouter();
  const top = useTopPad(52);

  const openStore = async () => {
    // 連結還是佔位字串時不嘗試開啟
    if (!isHttpUrl(SUSHI_JP_APP_STORE_URL)) {
      Alert.alert('連結尚未設定', '壽司日檢的 App Store 連結還沒有設定。');
      return;
    }
    try {
      await Linking.openURL(SUSHI_JP_APP_STORE_URL.trim());
    } catch {
      Alert.alert('無法開啟連結', '請稍後再試，或直接到 App Store 搜尋「壽司日檢」。');
    }
  };

  return (
    <Screen>
      <Stack.Screen options={{ gestureEnabled: false }} />
      <View style={[styles.closeRow, { paddingTop: top }]}>
        <Pressable
          testID="next-close"
          accessibilityRole="button"
          accessibilityLabel="關閉"
          onPress={() => goHomeTab(router)}
          style={styles.close}
        >
          <Icon name="close" size={22} color={t.muted} />
        </Pressable>
      </View>
      <View style={styles.head}>
        <Text style={[styles.eyebrow, { color: t.accentText }]}>下一步</Text>
        <Text style={[styles.title, { color: t.text }]}>開始累積日文單字</Text>
        <Text style={[styles.desc, { color: t.muted }]}>
          會讀假名之後，最好的下一步就是背單字。我們也做了一款日檢單字 App，可以直接接著學。
        </Text>
      </View>
      <View style={styles.cardWrap}>
        <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.line }]}>
          <View style={styles.appRow}>
            <View style={[styles.appIcon, { borderColor: t.muted }]}>
              <Text style={[styles.appIconText, { color: t.muted }]}>{'App\n圖示'}</Text>
            </View>
            <View style={styles.appText}>
              <Text style={[styles.appName, { color: t.text }]}>壽司日檢</Text>
              <Text style={[styles.appSub, { color: t.muted }]}>日檢單字練習</Text>
            </View>
          </View>
          <View style={styles.points}>
            {POINTS.map((p) => (
              <View key={p} style={styles.point}>
                <View style={styles.pointIcon}>
                  <Icon name="check" size={18} color={t.accentText} />
                </View>
                <Text style={[styles.pointText, { color: t.text }]}>{p}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
      <View style={styles.spacer} />
      <View style={styles.primary}>
        <PrimaryButton testID="next-open-store" label="到 App Store 看看" onPress={openStore} />
      </View>
      <View style={styles.secondary}>
        <Pressable
          testID="next-later"
          accessibilityRole="button"
          onPress={() => goHomeTab(router)}
          style={styles.link}
        >
          <Text style={[styles.linkLabel, { color: t.muted }]}>之後再說</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  closeRow: { paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'flex-end' },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  head: { paddingTop: 8, paddingHorizontal: 24, gap: 8 },
  eyebrow: { fontSize: 14, fontWeight: '700' },
  title: { fontSize: 28, fontWeight: '700' },
  desc: { fontSize: 15, lineHeight: 24 },
  cardWrap: { paddingTop: 22, paddingHorizontal: 24 },
  card: { borderWidth: 1, borderRadius: 20, padding: 18 },
  appRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  appIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appIconText: { fontSize: 11, textAlign: 'center' },
  appText: { gap: 2, flexShrink: 1 },
  appName: { fontSize: 18, fontWeight: '700' },
  appSub: { fontSize: 13 },
  points: { gap: 10, marginTop: 16 },
  point: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  pointIcon: { marginTop: 1 },
  pointText: { flex: 1, fontSize: 14, lineHeight: 21 },
  spacer: { flex: 1 },
  primary: { paddingHorizontal: 24, paddingBottom: 6 },
  secondary: { paddingHorizontal: 24, paddingBottom: 30 },
  link: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  linkLabel: { fontSize: 14 },
});
