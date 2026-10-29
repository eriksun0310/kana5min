import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, Icon, PrimaryButton, Screen, SecondaryButton } from '../src/components';
import { punFor, PUN_COUNT } from '../src/data';
import { buyPunPack, restorePunPack } from '../src/monetization/purchases';
import { usePunPackPrice } from '../src/monetization/usePunPackPrice';
import { useSettingsStore } from '../src/store/settingsStore';
import { useBottomPad, useTopPad } from '../src/theme/layout';
import { useTheme } from '../src/theme/useTheme';

/** 免費範例：く、こ（あ行與か行本來就免費） */
const SAMPLE_IDS = ['h-ku', 'h-ko'];

/** F3 買斷頁：好笑記憶包。 */
export default function PunPackScreen() {
  const t = useTheme();
  const router = useRouter();
  const top = useTopPad(52);
  const bottom = useBottomPad(44);
  const params = useLocalSearchParams<{ from?: string }>();
  const from = Array.isArray(params.from) ? params.from[0] : params.from;
  const price = usePunPackPrice();
  const purchased = useSettingsStore((s) => s.punPackPurchased);
  const adsWatched = useSettingsStore((s) => s.punAdsWatched);
  const [busy, setBusy] = useState(false);

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const buy = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await buyPunPack();
      if (r === 'purchased') Alert.alert('購買成功', '好笑記憶包已全部解鎖，感謝支持！');
      else if (r === 'error') Alert.alert('購買失敗', '這次沒有買成功，請稍後再試。');
      else if (r === 'unavailable') Alert.alert('目前無法購買', '暫時連不上商店，請稍後再試。');
      // cancelled：使用者自己取消，不跳提示
    } finally {
      setBusy(false);
    }
  };

  const restore = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await restorePunPack();
      if (r === 'restored') Alert.alert('已恢復購買', '好笑記憶包已全部解鎖。');
      else if (r === 'none') Alert.alert('沒有可恢復的購買', '這個帳號下找不到好笑記憶包的購買紀錄。');
      else if (r === 'error') Alert.alert('恢復失敗', '這次沒有恢復成功，請稍後再試。');
      else Alert.alert('目前無法恢復', '暫時連不上商店，請稍後再試。');
    } finally {
      setBusy(false);
    }
  };

  const points = [
    `解鎖全部 ${PUN_COUNT} 句諧音梗`,
    '永久免廣告',
    '之後新增的諧音梗自動取得',
  ];

  return (
    <Screen>
      <View style={[styles.header, { paddingTop: top }]}>
        <Pressable
          testID="punpack-close"
          accessibilityRole="button"
          accessibilityLabel="關閉"
          onPress={close}
          style={styles.close}
        >
          <Icon name="close" size={22} color={t.muted} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {from === 'ads' && !purchased ? (
          <View style={[styles.banner, { backgroundColor: t.accentSoft }]} testID="punpack-from-ads">
            <Text style={[styles.bannerText, { color: t.accentText }]}>
              已經看了 {adsWatched} 支廣告，{price} 以後都不用看
            </Text>
          </View>
        ) : null}

        <Text style={[styles.title, { color: t.text }]}>好笑記憶包</Text>
        <Text style={[styles.sub, { color: t.muted }]}>
          每個假名一句諧音梗，一句話就記住。
        </Text>

        <View style={styles.samples}>
          {SAMPLE_IDS.map((id) => (
            <Card flat key={id} testID={`punpack-sample-${id}`}>
              <Text style={[styles.sampleTag, { color: t.accentText }]}>免費範例</Text>
              <Text style={[styles.sampleBody, { color: t.text }]}>{punFor(id)}</Text>
            </Card>
          ))}
        </View>

        <View style={styles.points}>
          {points.map((p) => (
            <View key={p} style={styles.point}>
              <View style={[styles.pointIcon, { backgroundColor: t.accentSoft }]}>
                <Icon name="check" size={14} color={t.accentText} strokeWidth={2.5} />
              </View>
              <Text style={[styles.pointText, { color: t.text }]}>{p}</Text>
            </View>
          ))}
        </View>

        <View style={{ flex: 1, minHeight: 20 }} />

        {purchased ? (
          <View style={styles.actions}>
            <Text testID="punpack-purchased" style={[styles.purchased, { color: t.accentText }]}>
              已購買，感謝支持！
            </Text>
            <SecondaryButton testID="punpack-back" label="返回" onPress={close} />
          </View>
        ) : (
          <View style={styles.actions}>
            <PrimaryButton
              testID="punpack-buy"
              label={`${price} 買斷`}
              disabled={busy}
              onPress={buy}
            />
            <Pressable
              testID="punpack-restore"
              accessibilityRole="button"
              disabled={busy}
              onPress={restore}
              style={styles.restore}
            >
              <Text style={[styles.restoreText, { color: t.accentText, textDecorationLine: 'underline' }]}>恢復購買</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, alignItems: 'flex-end' },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 4, gap: 12 },
  banner: { borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 4 },
  bannerText: { fontSize: 14, fontWeight: '700', textAlign: 'center' },
  title: { fontSize: 28, fontWeight: '700' },
  sub: { fontSize: 15, lineHeight: 24 },
  samples: { gap: 10, marginTop: 4 },
  sampleTag: { fontSize: 12, fontWeight: '700' },
  sampleBody: { fontSize: 16, lineHeight: 24, marginTop: 4 },
  points: { gap: 14, marginTop: 10 },
  point: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pointIcon: {
    width: 26,
    height: 26,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointText: { flex: 1, fontSize: 15, lineHeight: 22 },
  actions: { gap: 6, marginTop: 8 },
  restore: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  restoreText: { fontSize: 14, textDecorationLine: 'underline' },
  purchased: { fontSize: 16, fontWeight: '700', textAlign: 'center', paddingBottom: 8 },
});
