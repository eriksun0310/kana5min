import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { Alert, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon, PrimaryButton, PtalkAppIcon, Screen, TextLink } from '../src/components';
import { graduateRecommendation, storeLinkFor } from '../src/content/ptalkApps';
import { isHttpUrl } from '../src/logic/links';
import { goHomeTab } from '../src/nav/exitToHome';
import { useTopPad } from '../src/theme/layout';
import { useTheme } from '../src/theme/useTheme';

/** 學完推薦卡：推薦名單裡第一個已上架的 PTalk App（目前是壽司日檢）。畢業頁自動帶到這裡一次。 */
export default function NextScreen() {
  const t = useTheme();
  const router = useRouter();
  const top = useTopPad(52);
  const app = graduateRecommendation();

  if (!app) {
    return (
      <Screen>
        <Stack.Screen options={{ gestureEnabled: false }} />
        <View style={styles.spacer} />
        <View style={styles.secondary}>
          <TextLink testID="next-later" label="回首頁" onPress={() => goHomeTab(router)} />
        </View>
      </Screen>
    );
  }
  const store = storeLinkFor(Platform.OS, app);

  const openStore = async () => {
    if (!isHttpUrl(store.url)) {
      Alert.alert('連結尚未設定', `${app.name} 的 ${store.storeName} 連結還沒有設定。`);
      return;
    }
    try {
      await Linking.openURL(store.url.trim());
    } catch {
      Alert.alert('無法開啟連結', `請稍後再試，或直接到 ${store.storeName} 搜尋「${app.name}」。`);
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
        <Text style={[styles.title, { color: t.text }]}>開始累積單字</Text>
      </View>
      <View style={styles.cardWrap}>
        <View style={[styles.card, { backgroundColor: t.flat }]}>
          <View style={styles.appRow}>
            <View testID="next-sushi-icon">
              <PtalkAppIcon id={app.id} size={64} />
            </View>
            <View style={styles.appText}>
              <Text style={[styles.appName, { color: t.text }]}>{app.name}</Text>
              <Text style={[styles.appSub, { color: t.muted }]}>{app.tagline}</Text>
            </View>
          </View>
        </View>
      </View>
      <View style={styles.spacer} />
      <View style={styles.primary}>
        <PrimaryButton testID="next-open-store" label="去下載" onPress={openStore} />
      </View>
      <View style={styles.secondary}>
        <TextLink testID="next-later" label="之後再說" onPress={() => goHomeTab(router)} />
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
  cardWrap: { paddingTop: 22, paddingHorizontal: 24 },
  card: { borderRadius: 20, padding: 18 },
  appRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  appIcon: { width: 64, height: 64, borderRadius: 16, borderWidth: 1 },
  appText: { gap: 2, flexShrink: 1 },
  appName: { fontSize: 18, fontWeight: '700' },
  appSub: { fontSize: 13 },
  spacer: { flex: 1 },
  primary: { paddingHorizontal: 24, paddingBottom: 6 },
  secondary: { paddingHorizontal: 24, paddingBottom: 30 },
});
