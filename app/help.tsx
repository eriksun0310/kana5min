import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BackHeader, Icon, PrimaryButton, Screen } from '../src/components';
import { contactMailto, CONTACT_EMAIL, FAQ, reportMailto, THREADS_HANDLE, THREADS_URL } from '../src/logic/help';
import { useBottomPad } from '../src/theme/layout';
import { useTheme } from '../src/theme/useTheme';

const SIDE = 24;

async function open(url: string, fallback: string) {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert('無法開啟', fallback);
  }
}

/** 幫助與聯絡：常見問題（可摺疊）、聯絡方式、回報問題（信件自動帶入 App 版本與系統版本，不含學習進度）。 */
export default function HelpScreen() {
  const t = useTheme();
  const router = useRouter();
  const bottom = useBottomPad(32);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const version = Constants.expoConfig?.version ?? '1.0.0';

  const report = () =>
    open(
      reportMailto({ appVersion: version, os: Platform.OS === 'ios' ? 'iOS' : Platform.OS, osVersion: Platform.Version }),
      `請直接寄信到 ${CONTACT_EMAIL}`,
    );

  return (
    <Screen>
      <BackHeader title="幫助與聯絡" onBack={() => router.back()} />
      <ScrollView style={styles.flex} contentContainerStyle={{ paddingBottom: bottom }} showsVerticalScrollIndicator={false}>
        <Text style={[styles.section, { color: t.text }]}>常見問題</Text>
        <View style={[styles.group, { backgroundColor: t.surface, borderColor: t.line }]}>
          {FAQ.map((f, i) => {
            const on = openKey === f.key;
            return (
              <View key={f.key} style={i > 0 && { borderTopWidth: 1, borderTopColor: t.line }}>
                <Pressable
                  testID={`faq-${f.key}`}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: on }}
                  onPress={() => setOpenKey(on ? null : f.key)}
                  style={styles.q}
                >
                  <Text style={{ flex: 1, fontSize: 15, fontWeight: '600', color: t.text }}>{f.q}</Text>
                  <View style={{ transform: [{ rotate: on ? '90deg' : '0deg' }] }}>
                    <Icon name="chevronRight" size={16} color={t.muted} />
                  </View>
                </Pressable>
                {on ? (
                  <Text testID={`faq-${f.key}-answer`} style={{ fontSize: 14, lineHeight: 22, color: t.muted, paddingHorizontal: 16, paddingBottom: 14 }}>
                    {f.a}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </View>

        <Text style={[styles.section, { color: t.text }]}>聯絡我們</Text>
        <View style={[styles.group, { backgroundColor: t.surface, borderColor: t.line }]}>
          <Pressable
            testID="contact-email"
            accessibilityRole="button"
            onPress={() => open(contactMailto(), `請直接寄信到 ${CONTACT_EMAIL}`)}
            style={styles.contact}
          >
            <Text style={{ fontSize: 13, color: t.muted }}>信箱</Text>
            <Text style={{ fontSize: 15, color: t.accentText }}>{CONTACT_EMAIL}</Text>
          </Pressable>
          <Pressable
            testID="contact-threads"
            accessibilityRole="button"
            onPress={() => open(THREADS_URL, `請到 Threads 搜尋 ${THREADS_HANDLE}`)}
            style={[styles.contact, { borderTopWidth: 1, borderTopColor: t.line }]}
          >
            <Text style={{ fontSize: 13, color: t.muted }}>Threads</Text>
            <Text style={{ fontSize: 15, color: t.accentText }}>{THREADS_HANDLE}</Text>
          </Pressable>
        </View>

        <View style={styles.actions}>
          <PrimaryButton testID="report-problem" label="回報問題" onPress={report} />
          <Text style={{ fontSize: 12, color: t.muted, textAlign: 'center', marginTop: 8 }}>
            信件會自動帶入 App 版本與系統版本，不會附上你的學習進度
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  section: { fontSize: 15, fontWeight: '700', paddingHorizontal: SIDE, paddingTop: 20, paddingBottom: 8 },
  group: { marginHorizontal: SIDE, borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  q: { minHeight: 52, paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  contact: { minHeight: 56, paddingHorizontal: 16, paddingVertical: 8, justifyContent: 'center', gap: 2 },
  actions: { paddingHorizontal: SIDE, paddingTop: 24 },
});
