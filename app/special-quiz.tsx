import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { playKana } from '../src/audio/playKana';
import { FlowHeader, Icon, PrimaryButton, Screen, SecondaryButton } from '../src/components';
import { MoraBoxes } from '../src/components/MoraBoxes';
import { optionColors, optionTestId, type OptionStatus } from '../src/components/QuizOption';
import { wordById } from '../src/data';
import {
  buildSpecialQuestions,
  isSpecialKind,
  moraText,
  specialSounds,
  SPECIAL_QUIZ_LENGTH,
  type SpecialKind,
  type SpecialQuestion,
  type SpecialWord,
} from '../src/data/specialSounds';
import { useSettingsStore } from '../src/store/settingsStore';
import { useTheme } from '../src/theme/useTheme';

/** 特殊音練習：聽聲音，在兩個詞裡選出聽到的那個。不影響 SRS，也不寫資料庫。 */
export default function SpecialQuizScreen() {
  const { kind } = useLocalSearchParams<{ kind?: string }>();
  if (!isSpecialKind(kind)) return <Redirect href="/special/long" />;
  return <SpecialQuiz kind={kind} />;
}

function SpecialQuiz({ kind }: { kind: SpecialKind }) {
  const router = useRouter();
  // round 改變就重新出一輪題（再練一次）
  const [round, setRound] = useState(0);
  const questions = useMemo(
    () => buildSpecialQuestions(kind),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [kind, round],
  );
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const leave = () => {
    if (router.canGoBack()) router.back();
    else router.replace(`/special/${kind}`);
  };

  const restart = () => {
    setRound((r) => r + 1);
    setIndex(0);
    setScore(0);
    setFinished(false);
  };

  const total = SPECIAL_QUIZ_LENGTH;

  return (
    <Screen>
      <FlowHeader
        progress={finished ? 1 : index / total}
        countLabel={finished ? `${total}/${total}` : `${index + 1}/${total}`}
        onClose={leave}
      />
      {finished ? (
        <ResultView score={score} total={total} onAgain={restart} onDone={leave} />
      ) : (
        <QuestionView
          key={`${round}-${index}`}
          question={questions[index]}
          isLast={index + 1 >= questions.length}
          onAnswered={(correct) => {
            if (correct) setScore((s) => s + 1);
          }}
          onNext={() => {
            if (index + 1 >= questions.length) setFinished(true);
            else setIndex((i) => i + 1);
          }}
        />
      )}
    </Screen>
  );
}

function describe(w: SpecialWord): string {
  const word = wordById(w.wordId);
  return `${moraText(w)}（${word?.meaning ?? ''}）`;
}

interface QuestionViewProps {
  question: SpecialQuestion;
  isLast: boolean;
  onAnswered: (correct: boolean) => void;
  onNext: () => void;
}

function QuestionView({ question, isLast, onAnswered, onNext }: QuestionViewProps) {
  const t = useTheme();
  const defaultSlow = useSettingsStore((s) => s.audioSpeed) === 'slow';
  const [picked, setPicked] = useState<0 | 1 | null>(null);
  const answered = picked !== null;
  const info = specialSounds[question.kind];

  // 進題自動播放一次
  useEffect(() => {
    playKana(question.answer.wordId, { slow: defaultSlow });
    // 只在換題時播放
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.id]);

  const choose = (i: 0 | 1) => {
    if (answered) return;
    setPicked(i);
    onAnswered(i === question.correctIndex);
  };

  const correct = picked === question.correctIndex;
  let feedback = '';
  let feedbackColor = t.correctText;
  if (answered) {
    if (correct) {
      feedback = `答對了！是 ${describe(question.answer)}`;
    } else {
      const hint = question.answerIsSpecial ? info.specialHint : info.plainHint;
      feedback = `剛剛的是 ${describe(question.answer)}，${hint}`;
      feedbackColor = t.wrongText;
    }
  }

  const statusOf = (i: number): OptionStatus => {
    if (!answered) return 'idle';
    if (i === question.correctIndex) return 'correct';
    if (i === picked) return 'wrong';
    return 'plain';
  };

  return (
    <View style={styles.flex}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.prompt}>
          <Text style={[styles.title, { color: t.text }]}>聽聲音，選出正確的字</Text>
          <Pressable
            testID="replay-audio"
            accessibilityRole="button"
            accessibilityLabel="再聽一次"
            onPress={() => playKana(question.answer.wordId, { slow: defaultSlow })}
            style={({ pressed }) => [
              styles.replay,
              { borderColor: t.line, backgroundColor: t.surface, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Icon name="speaker" size={52} color={t.text} strokeWidth={1.8} />
          </Pressable>
          <Pressable
            testID="play-slow"
            accessibilityRole="button"
            accessibilityLabel="慢速播放"
            onPress={() => playKana(question.answer.wordId, { slow: true })}
            style={styles.slow}
          >
            <Icon name="slow" size={16} color={t.muted} />
            <Text style={[styles.slowLabel, { color: t.muted }]}>慢速播放</Text>
          </Pressable>
        </View>

        <View style={styles.options}>
          {question.options.map((opt, i) => {
            const status = statusOf(i);
            const c = optionColors(t, status);
            const isCorrect = i === question.correctIndex;
            const w = wordById(opt.wordId);
            return (
              <Pressable
                key={opt.wordId}
                testID={optionTestId({ isCorrect, index: i, wrongIndex: 0 })}
                accessibilityRole="button"
                accessibilityLabel={moraText(opt)}
                disabled={answered}
                onPress={() => choose(i as 0 | 1)}
                style={({ pressed }) => [
                  styles.option,
                  { borderColor: c.border, backgroundColor: c.bg, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                {/* 作答前所有格子一視同仁，作答後才標出特殊拍 */}
                <MoraBoxes moras={opt.moras} plain={!answered} />
                <Text
                  style={[styles.optionMeta, { color: c.tag, opacity: answered ? 1 : 0 }]}
                  accessibilityElementsHidden={!answered}
                >
                  {w ? `${w.romaji}・${w.meaning}` : ''}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.bottom}>
        {answered ? (
          <View style={styles.feedbackBox}>
            <Text testID="quiz-feedback" style={[styles.feedback, { color: feedbackColor }]}>
              {feedback}
            </Text>
            <PrimaryButton
              testID="quiz-next"
              label={isLast ? '完成，看結果' : '下一題'}
              onPress={onNext}
            />
          </View>
        ) : (
          <PrimaryButton testID="quiz-confirm" label="選一個答案" disabled />
        )}
      </View>
    </View>
  );
}

function ResultView({
  score,
  total,
  onAgain,
  onDone,
}: {
  score: number;
  total: number;
  onAgain: () => void;
  onDone: () => void;
}) {
  const t = useTheme();
  const message =
    score === total ? '全部聽對了，耳朵很靈！' : score >= total / 2 ? '再聽幾次，差異會越來越清楚。' : '慢慢來，多聽幾次慢速播放。';
  return (
    <View style={styles.flex}>
      <View style={styles.resultBody}>
        <View style={[styles.badge, { backgroundColor: t.accentSoft, borderColor: t.accent }]}>
          <Icon name="check" size={40} color={t.accentText} strokeWidth={2.4} />
        </View>
        <Text testID="special-score" style={[styles.score, { color: t.text }]}>
          答對 {score} / {total}
        </Text>
        <Text style={[styles.resultMsg, { color: t.muted }]}>{message}</Text>
      </View>
      <View style={styles.resultBottom}>
        <PrimaryButton testID="special-again" label="再練一次" onPress={onAgain} />
        <SecondaryButton testID="special-done" label="回特殊音" onPress={onDone} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1 },
  prompt: { paddingTop: 26, paddingHorizontal: 24, alignItems: 'center', gap: 14 },
  title: { fontSize: 18, fontWeight: '700' },
  replay: {
    width: 120,
    height: 120,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slow: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  slowLabel: { fontSize: 14 },
  options: { paddingTop: 12, paddingHorizontal: 24, gap: 12 },
  option: {
    borderRadius: 22,
    borderWidth: 2,
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 10,
  },
  optionMeta: { fontSize: 14 },
  bottom: { paddingHorizontal: 24, paddingBottom: 44, paddingTop: 12 },
  feedbackBox: { gap: 10 },
  feedback: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  resultBody: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 24 },
  badge: {
    width: 88,
    height: 88,
    borderRadius: 999,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  score: { fontSize: 32, fontWeight: '700' },
  resultMsg: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  resultBottom: { paddingHorizontal: 24, paddingBottom: 44, paddingTop: 12, gap: 10 },
});
