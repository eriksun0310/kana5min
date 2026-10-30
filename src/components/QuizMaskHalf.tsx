import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { ClipPath, Defs, G, Line, Path, Rect } from 'react-native-svg';
import { mustById } from '../data';
import { strokesOf } from '../data/strokes';
import type { MaskSide } from '../logic/maskHalf';
import type { AnswerDetail, QuizQuestion } from '../logic/session';
import { useTheme } from '../theme/useTheme';
import { PrimaryButton } from './Buttons';
import { KanaText } from './KanaText';
import { optionColors, optionTestId, type OptionStatus } from './QuizOption';

export interface QuizMaskHalfProps {
  question: QuizQuestion;
  onAnswered: (correct: boolean, detail?: AnswerDetail) => void;
  onNext: () => void;
  isLast: boolean;
}

const BOX = 220;
const VB = 109;
const HALF = VB / 2;

/** 露出的那一半（mask 是被遮住的那邊）。 */
function visibleRect(mask: MaskSide): { x: number; y: number; w: number; h: number } {
  if (mask === 'left') return { x: HALF, y: 0, w: HALF, h: VB };
  if (mask === 'right') return { x: 0, y: 0, w: HALF, h: VB };
  if (mask === 'top') return { x: 0, y: HALF, w: VB, h: HALF };
  return { x: 0, y: 0, w: VB, h: HALF };
}

/**
 * 遮一半猜字：用 KanjiVG 筆畫畫出字，只露出一半（另一半空白），從 4 個拼音選一個。
 * 選項只放拼音，不放字形：不認識假名的人沒辦法拿露出的筆畫去對選項。點選項即作答，作答後露出全字。
 */
export function QuizMaskHalf({ question, onAnswered, onNext, isLast }: QuizMaskHalfProps) {
  const t = useTheme();
  const target = mustById(question.answerId);
  const data = strokesOf(target.char);
  const mask = question.mask ?? 'left';
  const rect = visibleRect(mask);
  const [picked, setPicked] = useState<number | null>(null);
  const answered = picked !== null;
  const correctIndex = question.options.indexOf(question.answerId);
  const correct = picked !== null && picked === correctIndex;

  const choose = (index: number) => {
    if (answered) return;
    setPicked(index);
    const id = question.options[index];
    onAnswered(index === correctIndex, { picked: id });
  };

  const statusOf = (index: number): OptionStatus => {
    if (!answered) return 'idle';
    if (index === correctIndex) return 'correct';
    if (index === picked) return 'wrong';
    return 'plain';
  };

  let wrongIndex = 0;
  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.prompt}>
          <Text testID="quiz-maskhalf" style={[styles.title, { color: t.muted }]}>
            被遮住一半，這是哪個字？
          </Text>
          <View style={[styles.box, { backgroundColor: t.surface, borderColor: t.line }]}>
            <Svg width={BOX - 2} height={BOX - 2} viewBox={`0 0 ${VB} ${VB}`}>
              <Defs>
                <ClipPath id="visible">
                  <Rect x={rect.x} y={rect.y} width={rect.w} height={rect.h} />
                </ClipPath>
              </Defs>
              {/* 被遮住的那一半：作答前空白，作答後用淡色露出 */}
              <G>
                {answered
                  ? (data?.strokes ?? []).map((d, i) => (
                      <Path
                        key={`ghost-${i}`}
                        d={d}
                        fill="none"
                        stroke={t.faint}
                        strokeWidth={6}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    ))
                  : null}
              </G>
              <G clipPath="url(#visible)">
                {(data?.strokes ?? []).map((d, i) => (
                  <Path
                    key={i}
                    d={d}
                    fill="none"
                    stroke={t.text}
                    strokeWidth={6}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}
              </G>
              {mask === 'left' || mask === 'right' ? (
                <Line x1={HALF} y1={0} x2={HALF} y2={VB} stroke={t.guide} strokeWidth={0.8} strokeDasharray="2 2" />
              ) : (
                <Line x1={0} y1={HALF} x2={VB} y2={HALF} stroke={t.guide} strokeWidth={0.8} strokeDasharray="2 2" />
              )}
            </Svg>
          </View>
        </View>

        <View style={styles.options}>
          {question.options.map((id, index) => {
            const c = optionColors(t, statusOf(index));
            const isCorrect = index === correctIndex;
            const testID = optionTestId({ isCorrect, index, wrongIndex: isCorrect ? 0 : wrongIndex++ });
            const k = mustById(id);
            return (
              <Pressable
                key={`${question.id}-${index}`}
                testID={testID}
                accessibilityRole="button"
                accessibilityLabel={k.romaji}
                disabled={answered}
                onPress={() => choose(index)}
                style={({ pressed }) => [
                  styles.option,
                  { borderColor: c.border, backgroundColor: c.bg, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <Text style={[styles.optionLabel, { color: t.text }]}>{k.romaji}</Text>
              </Pressable>
            );
          })}
        </View>

        {answered ? (
          <View style={styles.reveal}>
            <KanaText size={40} lineHeightRatio={1.1}>
              {target.char}
            </KanaText>
            <Text
              testID="quiz-feedback"
              style={[styles.feedback, { color: correct ? t.correctText : t.wrongText }]}
            >
              {correct
                ? `答對了！${target.char} 讀作 ${target.romaji}`
                : `${target.char} 讀作 ${target.romaji}，等一下會再出現`}
            </Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.bottom}>
        {answered ? (
          <PrimaryButton testID="quiz-next" label={isLast ? '完成，看結果' : '下一題'} onPress={onNext} />
        ) : (
          <PrimaryButton testID="quiz-confirm" label="選一個答案" disabled />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  content: { flexGrow: 1 },
  prompt: { paddingTop: 22, paddingHorizontal: 24, alignItems: 'center', gap: 12 },
  title: { fontSize: 15 },
  box: { width: BOX, height: BOX, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  options: { paddingTop: 20, paddingHorizontal: 24, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  option: {
    width: '48.5%',
    flexGrow: 1,
    minHeight: 64,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLabel: { fontSize: 24, fontWeight: '700' },
  reveal: { paddingTop: 12, alignItems: 'center', gap: 4 },
  feedback: { paddingHorizontal: 24, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  bottom: { paddingHorizontal: 24, paddingBottom: 44, paddingTop: 12 },
});
