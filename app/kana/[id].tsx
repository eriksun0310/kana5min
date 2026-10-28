import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { playKana } from '../../src/audio/playKana';
import {
  BackHeader,
  Card,
  Icon,
  KanaText,
  PrimaryButton,
  PunCard,
  Screen,
  SecondaryButton,
  TianGrid,
} from '../../src/components';
import { byId, exampleWordOf } from '../../src/data';
import { useBottomPad } from '../../src/theme/layout';
import { useTheme } from '../../src/theme/useTheme';

/** C2-04 詳情：大字、發音（含慢速）、筆畫數、容易搞混的字、例字，底部看筆順／描寫練習。 */
export default function KanaDetailScreen() {
  const t = useTheme();
  const router = useRouter();
  const bottom = useBottomPad(44);
  const params = useLocalSearchParams<{ id?: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const kana = id ? byId(id) : undefined;

  if (!kana) {
    return (
      <Screen>
        <BackHeader title="五十音表" onBack={() => router.back()} />
        <View style={styles.missing}>
          <Text style={{ color: t.muted, fontSize: 15 }}>找不到這個字</Text>
        </View>
      </Screen>
    );
  }

  const word = exampleWordOf(kana);
  const confusable = kana.confusableWith?.[0] ? byId(kana.confusableWith[0]) : undefined;
  // 拗音是兩個字，字級縮小才放得進 260 的田字格
  const glyphSize = [...kana.char].length > 1 ? 110 : 190;
  const goFlow = (pathname: '/learn/stroke' | '/learn/trace') =>
    router.push({ pathname, params: { id: kana.id, standalone: '1' } });

  return (
    <Screen>
      <BackHeader title="五十音表" onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <TianGrid size={260}>
            <KanaText size={glyphSize} lineHeightRatio={1} testID="detail-char">
              {kana.char}
            </KanaText>
          </TianGrid>

          <View style={styles.playRow}>
            <Pressable
              testID="play-audio"
              accessibilityRole="button"
              accessibilityLabel="播放發音"
              onPress={() => playKana(kana.id)}
              style={[styles.playBig, { backgroundColor: t.surface, borderColor: t.line }]}
            >
              <Icon name="speaker" size={27} color={t.text} />
            </Pressable>
            <Text style={{ fontSize: 22, letterSpacing: 2, color: t.text }}>{kana.romaji}</Text>
            <Pressable
              testID="play-slow"
              accessibilityRole="button"
              accessibilityLabel="慢速播放"
              hitSlop={{ top: 2, bottom: 2 }}
              onPress={() => playKana(kana.id, { slow: true })}
              style={[styles.slow, { borderColor: t.line }]}
            >
              <Icon name="slow" size={16} color={t.muted} />
              <Text style={{ fontSize: 13, color: t.muted }}>慢速</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.pair}>
          <Card style={styles.pairCard}>
            <Text style={{ fontSize: 12, color: t.muted }}>筆畫</Text>
            <Text style={{ fontSize: 20, fontWeight: '700', color: t.text, marginTop: 4 }}>
              {kana.strokes} 畫
            </Text>
          </Card>
          {confusable ? (
            <Card style={styles.pairCard} testID="detail-confusable">
              <Text style={{ fontSize: 12, color: t.muted }}>容易搞混</Text>
              <KanaText size={24} lineHeightRatio={1.3} style={{ marginTop: 2 }}>
                {confusable.char}
              </KanaText>
            </Card>
          ) : null}
        </View>

        {word ? (
          <Card style={styles.wordCard} testID="detail-word">
            <View style={{ gap: 2, flexShrink: 1 }}>
              <Text style={{ fontSize: 12, color: t.muted }}>例字</Text>
              <KanaText size={28} lineHeightRatio={1.2}>
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
              style={[styles.playSmall, { backgroundColor: t.surface, borderColor: t.line }]}
            >
              <Icon name="speaker" size={19} color={t.text} />
            </Pressable>
          </Card>
        ) : null}

        <PunCard kanaId={kana.id} style={styles.pun} />

        <View style={{ flex: 1, minHeight: 16 }} />

        <View style={styles.actions}>
          <SecondaryButton
            testID="detail-stroke"
            label="看筆順"
            style={{ flex: 1 }}
            onPress={() => goFlow('/learn/stroke')}
          />
          <PrimaryButton
            testID="detail-trace"
            label="描寫練習"
            style={{ flex: 1 }}
            onPress={() => goFlow('/learn/trace')}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 16 },
  hero: { alignItems: 'center', gap: 14 },
  playRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  playBig: {
    width: 60,
    height: 60,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slow: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pair: { flexDirection: 'row', gap: 10, paddingTop: 18 },
  pairCard: { flex: 1 },
  wordCard: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  playSmall: {
    width: 44,
    height: 44,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pun: { marginTop: 10 },
  actions: { flexDirection: 'row', gap: 12 },
});
