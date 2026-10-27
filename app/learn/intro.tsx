import { Redirect, Stack, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { playKana } from '../../src/audio/playKana';
import {
  Card,
  FlowHeader,
  Icon,
  KanaText,
  PrimaryButton,
  Screen,
} from '../../src/components';
import { byId, hintFor } from '../../src/data';
import { useLearnSnapshot } from '../../src/hooks/useLearnSnapshot';
import { confirmExitFlow } from '../../src/nav/exitToHome';
import { shouldShowRomaji } from '../../src/logic/romaji';
import { useProgressStore } from '../../src/store/progressStore';
import { useSettingsStore } from '../../src/store/settingsStore';
import { useTheme } from '../../src/theme/useTheme';

/** C2-05 學新字・看與聽 */
export default function LearnIntro() {
  const t = useTheme();
  const router = useRouter();
  const snap = useLearnSnapshot();
  const autoHide = useSettingsStore((s) => s.romajiAutoHide);
  const progress = useProgressStore((s) => s.progress);
  const kana = snap.kanaId ? byId(snap.kanaId) : undefined;

  // 進畫面自動播放一次
  useEffect(() => {
    if (kana) playKana(kana.id);
  }, [kana]);

  if (!snap.active || !kana) return <Redirect href="/" />;

  const showRomaji = shouldShowRomaji(progress[kana.id], { romajiAutoHide: autoHide });
  const hint = hintFor(kana.id);

  return (
    <Screen>
      <Stack.Screen options={{ gestureEnabled: false }} />
      <FlowHeader
        progress={snap.progressAt(1)}
        countLabel={`${snap.index + 1}/${snap.total}`}
        onClose={() => confirmExitFlow(router)}
      />
      <View style={styles.center}>
        <View style={[styles.chip, { backgroundColor: t.accentSoft }]}>
          <Text style={[styles.chipText, { color: t.accentText }]}>新字</Text>
        </View>
        <KanaText size={200} testID="learn-kana">
          {kana.char}
        </KanaText>
        <Text style={[styles.romaji, { color: t.muted }]} testID="learn-romaji">
          {showRomaji ? kana.romaji : ' '}
        </Text>
        <View style={styles.playWrap}>
          <Pressable
            testID="play-audio"
            accessibilityRole="button"
            accessibilityLabel="播放發音"
            onPress={() => playKana(kana.id)}
            style={({ pressed }) => [
              styles.play,
              { borderColor: t.line, backgroundColor: t.surface, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Icon name="speaker" size={34} color={t.text} />
          </Pressable>
        </View>
      </View>
      {hint ? (
        <View style={styles.hintWrap}>
          <Card testID="learn-hint">
            <Text style={[styles.hintTitle, { color: t.accentText }]}>記憶小提示</Text>
            <Text style={[styles.hintBody, { color: t.text }]}>{hint}</Text>
          </Card>
        </View>
      ) : null}
      <View style={styles.bottom}>
        <PrimaryButton
          testID="next-step"
          label="下一步：看筆順"
          onPress={() => router.replace('/learn/stroke')}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  chipText: { fontSize: 13, fontWeight: '700' },
  romaji: { fontSize: 20, letterSpacing: 2, minHeight: 28 },
  playWrap: { marginTop: 10 },
  play: {
    width: 76,
    height: 76,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintWrap: { paddingHorizontal: 24, paddingBottom: 16 },
  hintTitle: { fontSize: 12, fontWeight: '700' },
  hintBody: { fontSize: 15, lineHeight: 23, marginTop: 4 },
  bottom: { paddingHorizontal: 24, paddingBottom: 44 },
});
