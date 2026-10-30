import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { playKana } from '../audio/playKana';
import { mustById, wordById } from '../data';
import { scoreSpotError } from '../logic/spotError';
import type { AnswerDetail, QuizQuestion } from '../logic/session';
import { useSettingsStore } from '../store/settingsStore';
import { useTheme } from '../theme/useTheme';
import { PrimaryButton } from './Buttons';
import { KanaText } from './KanaText';
import { optionColors, type OptionStatus } from './QuizOption';

export interface QuizSpotErrorProps {
  question: QuizQuestion;
  onAnswered: (correct: boolean, detail?: AnswerDetail) => void;
  onNext: () => void;
  isLast: boolean;
}

interface Pick {
  wordIndex: number;
  charIndex: number;
}

/**
 * 抓錯字：一串詞裡有一個字被換成易混淆字，點出被換的那個字再按「確認」。
 * 所有字都可以點（不是只有易混淆字），確認後才揭曉：換錯的字標綠、點錯的標紅，並顯示原本的詞與意思。
 */
export function QuizSpotError({ question, onAnswered, onNext, isLast }: QuizSpotErrorProps) {
  const t = useTheme();
  const slow = useSettingsStore((s) => s.audioSpeed) === 'slow';
  const spot = question.spot;
  const [selected, setSelected] = useState<Pick | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  // 作答前不播放（聲音會洩漏答案）；揭曉時才播原本的詞

  if (!spot) return null;
  const isTarget = (p: Pick) => p.wordIndex === spot.wordIndex && p.charIndex === spot.charIndex;
  const result = confirmed && selected ? scoreSpotError(spot, selected) : null;

  const confirm = () => {
    if (confirmed || !selected) return;
    setConfirmed(true);
    const r = scoreSpotError(spot, selected);
    onAnswered(r.correct, { perKana: r.perKana, confusions: r.confusions });
    const original = wordById(spot.words[spot.wordIndex].wordId);
    if (original) void playKana(original.id, { slow });
  };

  const statusOf = (p: Pick): OptionStatus => {
    const sel = selected && selected.wordIndex === p.wordIndex && selected.charIndex === p.charIndex;
    if (!confirmed) return sel ? 'selected' : 'idle';
    if (isTarget(p)) return 'correct';
    return sel ? 'wrong' : 'plain';
  };

  const original = wordById(spot.words[spot.wordIndex].wordId);
  const originalChar = mustById(spot.originalId).char;
  const replacementChar = mustById(spot.replacementId).char;
  let wrongSeen = 0;

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.prompt}>
          <Text testID="quiz-spoterr" style={[styles.title, { color: t.muted }]}>
            有一個字被換成長得像的字，找出來
          </Text>
        </View>
        <View style={styles.words}>
          {spot.words.map((w, wi) => (
            <View key={`${question.id}-${wi}`} style={styles.word}>
              {w.shown.map((ch, ci) => {
                const p = { wordIndex: wi, charIndex: ci };
                const c = optionColors(t, statusOf(p));
                const target = isTarget(p);
                const testID = __DEV__ ? (target ? 'spot-target' : `spot-wrong-${wrongSeen++}`) : `spot-${wi}-${ci}`;
                return (
                  <Pressable
                    key={ci}
                    testID={testID}
                    accessibilityRole="button"
                    accessibilityLabel={ch}
                    disabled={confirmed}
                    onPress={() => setSelected(p)}
                    style={({ pressed }) => [
                      styles.cell,
                      { borderColor: c.border, backgroundColor: c.bg, opacity: pressed ? 0.85 : 1 },
                    ]}
                  >
                    <KanaText size={32} lineHeightRatio={1.2}>
                      {ch}
                    </KanaText>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
        {confirmed && result ? (
          <Text
            testID="quiz-feedback"
            style={[styles.feedback, { color: result.correct ? t.correctText : t.wrongText }]}
          >
            {result.correct ? '找到了！' : '這個字沒有換，'}
            {`原本是「${original?.text ?? ''}」（${original?.meaning ?? ''}），${replacementChar} 其實是 ${originalChar}`}
            {result.correct ? '' : '，等一下會再出現'}
          </Text>
        ) : null}
      </ScrollView>
      <View style={styles.bottom}>
        {confirmed ? (
          <PrimaryButton testID="quiz-next" label={isLast ? '完成，看結果' : '下一題'} onPress={onNext} />
        ) : (
          <PrimaryButton
            testID="quiz-confirm"
            label={selected ? '確認' : '點出被換掉的字'}
            disabled={!selected}
            onPress={confirm}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  content: { flexGrow: 1 },
  prompt: { paddingTop: 26, paddingHorizontal: 24, alignItems: 'center' },
  title: { fontSize: 15 },
  words: { paddingTop: 28, paddingHorizontal: 24, gap: 18, alignItems: 'center' },
  word: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  cell: { width: 56, height: 64, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  feedback: { paddingTop: 22, paddingHorizontal: 24, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  bottom: { paddingHorizontal: 24, paddingBottom: 44, paddingTop: 12 },
});
