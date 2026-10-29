import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
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
import { compareAction, counterpartId } from '../../src/logic/counterpart';
import { useBottomPad } from '../../src/theme/layout';
import { useTheme } from '../../src/theme/useTheme';

/** C2-04 詳情：大字、發音（含慢速）、筆畫數、容易搞混的字、例字，底部看筆順／描寫練習。 */
export default function KanaDetailScreen() {
  const t = useTheme();
  const router = useRouter();
  const navigation = useNavigation();
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
  const otherId = counterpartId(kana.id);

  /** 開另一個字（對照、容易搞混）：上一頁就是該字時回上一頁，否則往前進一頁（返回時回到原本的字）。 */
  const openKana = (target: string) => {
    const st = navigation.getState();
    const prev = st?.routes?.[(st.index ?? 0) - 1];
    const prevId = prev && String(prev.name).startsWith('kana/') ? (prev.params as { id?: string } | undefined)?.id : undefined;
    if (compareAction(prevId, target) === 'back') router.back();
    else router.push({ pathname: '/kana/[id]', params: { id: target } });
  };
  const otherChar = otherId ? byId(otherId)?.char : undefined;
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
            <Text testID="detail-romaji" style={[styles.romaji, { color: t.muted }]}>
              {kana.romaji}
            </Text>
          </TianGrid>

          <View style={styles.playRow}>
            <Pressable
              testID="play-audio"
              accessibilityRole="button"
              accessibilityLabel="播放發音"
              onPress={() => playKana(kana.id)}
              style={[styles.playBtn, { backgroundColor: t.surface, borderColor: t.line }]}
            >
              <Icon name="speakerSmall" size={19} color={t.text} />
              <Text style={{ fontSize: 14, color: t.text }}>正常</Text>
            </Pressable>
            <Pressable
              testID="play-slow"
              accessibilityRole="button"
              accessibilityLabel="慢速播放"
              onPress={() => playKana(kana.id, { slow: true })}
              style={[styles.playBtn, { backgroundColor: t.surface, borderColor: t.line }]}
            >
              <Icon name="slow" size={17} color={t.text} />
              <Text style={{ fontSize: 14, color: t.text }}>慢速</Text>
            </Pressable>
          </View>
        </View>

        <Text testID="detail-strokes" style={[styles.strokes, { color: t.muted }]}>
          筆畫 {kana.strokes} 畫
        </Text>

        {otherId && otherChar ? (
          <>
            <Text style={[styles.sectionLabel, { color: t.muted }]}>看相似的字</Text>
            <View style={styles.pair}>
              <Pressable
                testID="detail-compare"
                accessibilityRole="button"
                accessibilityLabel={`對照${kana.script === 'hiragana' ? '片假名' : '平假名'} ${otherChar}`}
                onPress={() => openKana(otherId)}
                style={({ pressed }) => [
                  styles.tile,
                  { backgroundColor: t.surface, borderColor: t.line, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <Text style={{ fontSize: 12, color: t.muted }}>
                  {kana.script === 'hiragana' ? '對照片假名' : '對照平假名'}
                </Text>
                <KanaText size={28} lineHeightRatio={1.25}>
                  {otherChar}
                </KanaText>
                <View style={styles.tileArrow}>
                  <Icon name="chevronRight" size={14} color={t.muted} />
                </View>
              </Pressable>
              {confusable ? (
                <Pressable
                  testID="detail-confusable"
                  accessibilityRole="button"
                  accessibilityLabel={`容易搞混的字 ${confusable.char}`}
                  onPress={() => openKana(confusable.id)}
                  style={({ pressed }) => [
                    styles.tile,
                    { backgroundColor: t.surface, borderColor: t.line, opacity: pressed ? 0.85 : 1 },
                  ]}
                >
                  <Text style={{ fontSize: 12, color: t.muted }}>容易搞混</Text>
                  <KanaText size={28} lineHeightRatio={1.25}>
                    {confusable.char}
                  </KanaText>
                  <View style={styles.tileArrow}>
                    <Icon name="chevronRight" size={14} color={t.muted} />
                  </View>
                </Pressable>
              ) : null}
            </View>
          </>
        ) : null}

        {word ? (
          <Card flat style={styles.wordCard} testID="detail-word">
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
  playRow: { flexDirection: 'row', gap: 10, width: 260 },
  playBtn: {
    width: 125,
    minHeight: 44,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  romaji: { position: 'absolute', bottom: 10, fontSize: 18, letterSpacing: 2 },
  strokes: { fontSize: 13, textAlign: 'center', paddingTop: 14 },
  sectionLabel: { fontSize: 12, paddingTop: 16, paddingBottom: 6, paddingLeft: 2 },
  pair: { flexDirection: 'row', gap: 10 },
  tile: {
    flex: 1,
    minHeight: 84,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 10,
  },
  tileArrow: { position: 'absolute', right: 10, top: 10 },
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
