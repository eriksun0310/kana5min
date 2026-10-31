import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { byId } from '../data';
import { triggerDevAnswer } from '../logic/devAnswerBus';
import type { QuizQuestion } from '../logic/session';
import { useTheme } from '../theme/useTheme';

/**
 * 測驗畫面（自動練習、每日練習、易混淆快速辨識⋯）上方的開發用按鈕：
 * 點「自動答案」會把這一題的正確答案選好／填好／翻開，你再自己按確認、下一題，看回饋對不對。
 * 只在 __DEV__ 由 app/quiz.tsx 用 require 載入，正式包不會包含。
 */
export default function QuizDevBar({ question }: { question: QuizQuestion }) {
  const t = useTheme();
  const [note, setNote] = useState('');
  const answer = byId(question.answerId);

  const press = () => {
    const n = triggerDevAnswer();
    setNote(n > 0 ? '' : '這一題沒有自動答案');
  };

  return (
    <View testID="quiz-dev-bar" style={[styles.bar, { borderColor: t.accent }]}>
      <Text style={{ color: t.accentText, fontSize: 12, fontWeight: '700' }}>DEV</Text>
      <Pressable
        testID="dev-auto-answer"
        accessibilityRole="button"
        onPress={press}
        style={[styles.btn, { borderColor: t.correct, backgroundColor: t.correctSoft }]}
      >
        <Text style={{ color: t.correctText, fontSize: 13, fontWeight: '700' }}>自動答案</Text>
      </Pressable>
      <Text style={{ color: t.muted, fontSize: 12, flexShrink: 1 }} numberOfLines={1}>
        {note || `題型 ${question.type}${answer ? `　答案 ${answer.char}（${answer.romaji}）` : ''}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    marginHorizontal: 16,
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btn: { minHeight: 34, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
