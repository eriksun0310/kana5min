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
  PunCard,
  Screen,
} from '../../src/components';
import { byId, exampleWordOf, hiraganaOf, punFor, soundOf, type Kana } from '../../src/data';
import { useLearnSnapshot, type LearnSnapshot } from '../../src/hooks/useLearnSnapshot';
import { confirmExitFlow } from '../../src/nav/exitToHome';
import { shouldShowRomaji } from '../../src/logic/romaji';
import { useProgressStore } from '../../src/store/progressStore';
import { useSettingsStore } from '../../src/store/settingsStore';
import { useTheme } from '../../src/theme/useTheme';

/**
 * 學新字・看與聽。平假名用 C2-05 版面，片假名用 C2-19 版面（對照平假名＋外來語例字）。
 * 兩者共用同一個路由，由字的 script 決定版面，筆順／描寫／測驗的導覽完全不需要分流。
 */
export default function LearnIntro() {
  const snap = useLearnSnapshot();
  const kana = snap.kanaId ? byId(snap.kanaId) : undefined;
  if (!snap.active || !kana) return <Redirect href="/" />;
  return kana.script === 'katakana' ? (
    <KataIntro kana={kana} snap={snap} />
  ) : (
    <HiraganaIntro kana={kana} snap={snap} />
  );
}

interface IntroProps {
  kana: Kana;
  snap: LearnSnapshot;
}

/** 進畫面自動播放一次 */
function useAutoPlay(kanaId: string) {
  useEffect(() => {
    playKana(kanaId);
  }, [kanaId]);
}

/** C2-05 學新字・看與聽（平假名） */
function HiraganaIntro({ kana, snap }: IntroProps) {
  const t = useTheme();
  const router = useRouter();
  const autoHide = useSettingsStore((s) => s.romajiAutoHide);
  const progress = useProgressStore((s) => s.progress);
  useAutoPlay(kana.id);

  const showRomaji = shouldShowRomaji(progress[kana.id], { romajiAutoHide: autoHide });

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
      <PunCard kanaId={kana.id} style={styles.pun} />
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

/** C2-19 學新字・看與聽（片假名）：大字、羅馬拼音、播放鈕、對照平假名、外來語例字。 */
function KataIntro({ kana, snap }: IntroProps) {
  const t = useTheme();
  const router = useRouter();
  const autoHide = useSettingsStore((s) => s.romajiAutoHide);
  const progress = useProgressStore((s) => s.progress);
  useAutoPlay(kana.id);

  const showRomaji = shouldShowRomaji(progress[kana.id], { romajiAutoHide: autoHide });
  const hira = hiraganaOf(kana);
  const word = exampleWordOf(kana);
  // 有諧音卡時畫面要多放一張卡片，大字縮小一點才不會擠到播放鈕
  const hasPun = soundOf(kana.id) !== undefined && punFor(kana.id) !== undefined;

  return (
    <Screen>
      <Stack.Screen options={{ gestureEnabled: false }} />
      <FlowHeader
        progress={snap.progressAt(1)}
        countLabel={`${snap.index + 1}/${snap.total}`}
        onClose={() => confirmExitFlow(router)}
      />
      <View style={kataStyles.center}>
        <View style={[styles.chip, { backgroundColor: t.accentSoft }]}>
          <Text testID="kata-chip" style={[styles.chipText, { color: t.accentText }]}>
            片假名新字
          </Text>
        </View>
        <KanaText size={hasPun ? 140 : 190} testID="learn-kana">
          {kana.char}
        </KanaText>
        <Text style={[styles.romaji, { color: t.muted }]} testID="learn-romaji">
          {showRomaji ? kana.romaji : ' '}
        </Text>
        <View style={kataStyles.playWrap}>
          <Pressable
            testID="play-audio"
            accessibilityRole="button"
            accessibilityLabel="播放發音"
            onPress={() => playKana(kana.id)}
            style={({ pressed }) => [
              kataStyles.play,
              { borderColor: t.line, backgroundColor: t.surface, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Icon name="speaker" size={30} color={t.text} />
          </Pressable>
        </View>
      </View>
      {hira || kana.diffNote ? (
        <View style={kataStyles.cardWrapTop}>
          <Card testID="kata-compare">
            <View style={kataStyles.compareRow}>
              {hira ? (
                <KanaText size={40} lineHeightRatio={1.2} color={t.muted} testID="kata-hira">
                  {hira.char}
                </KanaText>
              ) : null}
              {kana.diffNote ? (
                <Text testID="kata-diff" style={[kataStyles.diff, { color: t.muted }]}>
                  {kana.diffNote}
                </Text>
              ) : null}
            </View>
          </Card>
        </View>
      ) : null}
      {word ? (
        <View style={kataStyles.cardWrapBottom}>
          <Card testID="kata-word">
            <View style={kataStyles.wordRow}>
              <View style={kataStyles.wordText}>
                <Text style={{ fontSize: 12, color: t.muted }}>外來語例字</Text>
                <KanaText size={28} lineHeightRatio={1.2} testID="kata-word-text">
                  {word.text}
                </KanaText>
                <Text style={{ fontSize: 13, color: t.muted }}>
                  {word.romaji}・{word.meaning}
                </Text>
              </View>
              <Pressable
                testID="play-word"
                accessibilityRole="button"
                accessibilityLabel="播放例字發音"
                onPress={() => playKana(word.id)}
                style={({ pressed }) => [
                  kataStyles.playSmall,
                  { borderColor: t.line, backgroundColor: t.surface, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <Icon name="speaker" size={19} color={t.text} />
              </Pressable>
            </View>
          </Card>
        </View>
      ) : null}
      <PunCard kanaId={kana.id} compact style={kataStyles.pun} />
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

const kataStyles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  playWrap: { marginTop: 8 },
  play: {
    width: 68,
    height: 68,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardWrapTop: { paddingHorizontal: 24, paddingBottom: 10 },
  cardWrapBottom: { paddingHorizontal: 24, paddingBottom: 10 },
  pun: { marginHorizontal: 24, marginBottom: 16 },
  compareRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  diff: { flex: 1, fontSize: 14, lineHeight: 22 },
  wordRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  wordText: { gap: 2, flexShrink: 1 },
  playSmall: {
    width: 44,
    height: 44,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

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
  pun: { marginHorizontal: 24, marginBottom: 16 },
  bottom: { paddingHorizontal: 24, paddingBottom: 44 },
});
