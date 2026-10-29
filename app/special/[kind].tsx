import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { playKana } from '../../src/audio/playKana';
import {
  BackHeader,
  Card,
  Icon,
  KanaText,
  PrimaryButton,
  Screen,
} from '../../src/components';
import { MoraBoxes } from '../../src/components/MoraBoxes';
import { wordById } from '../../src/data';
import {
  isSpecialKind,
  specialSounds,
  SPECIAL_KINDS,
  YOUON_GRID,
  type SpecialKind,
  type SpecialWord,
} from '../../src/data/specialSounds';
import { useTheme } from '../../src/theme/useTheme';

/** 特殊音教學頁（C2-15 長音／C2-16 促音／C2-17 拗音共用）。 */
export default function SpecialScreen() {
  const { kind } = useLocalSearchParams<{ kind?: string }>();
  if (!isSpecialKind(kind)) return <Redirect href="/special/long" />;
  return <SpecialContent kind={kind} />;
}

function SpecialContent({ kind }: { kind: SpecialKind }) {
  const t = useTheme();
  const router = useRouter();
  const info = specialSounds[kind];
  // 第 1 組最小對立詞是教學對照組
  const teach = info.pairs[0];

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/practice');
  };

  return (
    <Screen>
      <BackHeader title="特殊音" onBack={goBack} />
      <View style={styles.segments}>
        {SPECIAL_KINDS.map((k) => {
          const active = k === kind;
          return (
            <Pressable
              key={k}
              testID={`seg-${k}`}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => {
                if (!active) router.replace(`/special/${k}`);
              }}
              style={[styles.seg, { backgroundColor: active ? t.text : t.chip }]}
            >
              <Text style={[styles.segLabel, { color: active ? t.bg : t.muted }]}>
                {specialSounds[k].label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleBlock}>
          <Text style={[styles.title, { color: t.text }]}>{info.title}</Text>
          <Text style={[styles.desc, { color: t.muted }]}>{info.description}</Text>
        </View>

        {kind === 'youon' ? <YouonCombine /> : null}
        {kind === 'youon' ? <YouonGrid /> : null}

        <View style={styles.cards}>
          <WordCard word={teach.plain} />
          <WordCard word={teach.special} />
        </View>

        {kind === 'long' ? <LongNote /> : null}
        {kind === 'sokuon' ? <SokuonNote /> : null}
      </ScrollView>

      <View style={styles.bottom}>
        <PrimaryButton
          testID="special-practice"
          label={info.practiceLabel}
          onPress={() => router.push({ pathname: '/special-quiz', params: { kind } })}
        />
      </View>
    </Screen>
  );
}

/** 例詞卡：拍數方塊 + 「romaji・意思」 + 44px 播放鈕。 */
function WordCard({ word }: { word: SpecialWord }) {
  const t = useTheme();
  const w = wordById(word.wordId);
  return (
    <Card flat>
      <View style={styles.wordRow}>
        <View style={styles.wordInfo}>
          <MoraBoxes moras={word.moras} />
          <Text style={[styles.wordMeta, { color: t.muted }]}>
            {w ? `${w.romaji}・${w.meaning}` : ''}
          </Text>
        </View>
        <Pressable
          testID={`play-${word.wordId}`}
          accessibilityRole="button"
          accessibilityLabel="播放發音"
          onPress={() => playKana(word.wordId)}
          style={({ pressed }) => [
            styles.play,
            { borderColor: t.line, backgroundColor: t.surface, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Icon name="speaker" size={19} color={t.text} />
        </Pressable>
      </View>
    </Card>
  );
}

function LongNote() {
  const t = useTheme();
  return (
    <View style={styles.note}>
      <Card flat>
        <Text style={[styles.noteText, { color: t.muted }]}>
          {'片假名用「ー」表示長音，例如 '}
          <KanaText size={16} lineHeightRatio={1.2} color={t.text}>
            コーヒー
          </KanaText>
          {'（咖啡）。'}
        </Text>
      </Card>
    </View>
  );
}

function SokuonNote() {
  const t = useTheme();
  return (
    <View style={styles.note}>
      <Card flat>
        <View style={styles.sizeRow}>
          <View style={styles.sizePair}>
            <KanaText size={40} lineHeightRatio={1}>
              つ
            </KanaText>
            <KanaText size={24} lineHeightRatio={1} color={t.accentText}>
              っ
            </KanaText>
          </View>
          <Text style={[styles.noteText, styles.flex, { color: t.muted }]}>
            っ 要寫得比 つ 小，放在格子的左下角。
          </Text>
        </View>
      </Card>
    </View>
  );
}

/** き + ゃ = きゃ（kya） */
function YouonCombine() {
  const t = useTheme();
  return (
    <View style={styles.combineWrap}>
      <Card flat>
        <View style={styles.combine}>
          <KanaText size={40} lineHeightRatio={1.15}>
            き
          </KanaText>
          <Text style={[styles.op, { color: t.muted }]}>+</Text>
          <KanaText size={26} lineHeightRatio={1.15} color={t.accentText}>
            ゃ
          </KanaText>
          <Text style={[styles.op, { color: t.muted }]}>=</Text>
          <KanaText size={40} lineHeightRatio={1.15}>
            き
            <KanaText size={26} lineHeightRatio={1.15} color={t.accentText}>
              ゃ
            </KanaText>
          </KanaText>
          <Text style={[styles.kya, { color: t.muted }]}>kya</Text>
        </View>
      </Card>
    </View>
  );
}

/** 3×3 拗音表（kya～cho），可點擊聽發音。 */
function YouonGrid() {
  const t = useTheme();
  return (
    <View style={styles.grid}>
      {YOUON_GRID.map((g) => (
        <Pressable
          key={g.kanaId}
          testID={`youon-${g.romaji}`}
          accessibilityRole="button"
          accessibilityLabel={`${g.char} ${g.romaji}`}
          onPress={() => playKana(g.kanaId)}
          style={({ pressed }) => [
            styles.gridCell,
            { backgroundColor: t.surface, borderColor: t.line, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <KanaText size={22} lineHeightRatio={1.2}>
            {g.char}
          </KanaText>
          <Text style={[styles.gridRomaji, { color: t.muted }]}>{g.romaji}</Text>
          <View style={styles.cellIcon}>
            <Icon name="speakerSmall" size={13} color={t.muted} />
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  cellIcon: { position: 'absolute', right: 6, top: 6 },
  flex: { flex: 1 },
  segments: { paddingTop: 12, paddingHorizontal: 24, flexDirection: 'row', gap: 6 },
  seg: {
    flex: 1,
    minHeight: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segLabel: { fontSize: 14, fontWeight: '700' },
  content: { paddingBottom: 12 },
  titleBlock: { paddingTop: 22, paddingHorizontal: 24, gap: 6 },
  title: { fontSize: 22, fontWeight: '700' },
  desc: { fontSize: 14, lineHeight: 22 },
  cards: { paddingTop: 18, paddingHorizontal: 24, gap: 10 },
  wordRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  wordInfo: { flexShrink: 1, gap: 10 },
  wordMeta: { fontSize: 14 },
  play: {
    width: 44,
    height: 44,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  note: { paddingTop: 10, paddingHorizontal: 24 },
  noteText: { fontSize: 14, lineHeight: 22 },
  sizeRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  sizePair: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  combineWrap: { paddingTop: 16, paddingHorizontal: 24 },
  combine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  op: { fontSize: 22 },
  kya: { fontSize: 16 },
  grid: { paddingTop: 10, paddingHorizontal: 24, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gridCell: {
    // 三欄等寬：(100% - 2 個間距) / 3
    width: '31.5%',
    flexGrow: 1,
    height: 58,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridRomaji: { fontSize: 11 },
  bottom: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 44 },
});
