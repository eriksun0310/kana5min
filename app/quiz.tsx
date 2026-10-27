import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { FlowHeader, Screen } from '../src/components';
import { QuizHear } from '../src/components/QuizHear';
import { QuizLoanword } from '../src/components/QuizLoanword';
import { QuizSee } from '../src/components/QuizSee';
import { confirmExitFlow } from '../src/nav/exitToHome';
import { currentProgressList, useSessionStore } from '../src/store/sessionStore';

/**
 * 測驗（C2-08 看字選音／C2-09 聽音選字，依題型切換）。
 * - 預設（每日練習）：session 已由 /learn 建好，這裡只負責出題與作答。
 * - mode=auto：自動練習，see／hear／confuse 混合 10 題（片假名有可讀外來語時含 1～2 題 loanword）；
 *   進畫面時建立新的一輪。
 * - loanword 題（C2-20 讀外來語）不屬於任何假名：作答只計入答對數，不更新 SRS。
 * - mode=confuse&group=<id>：易混淆字組快速辨識 10 題（confuse 題與選項限該組的看字選音題）。
 * 最後一題按「完成，看結果」→ 提交 SRS → 到結果頁。
 */
export default function QuizScreen() {
  const router = useRouter();
  const { mode, group } = useLocalSearchParams<{ mode?: string; group?: string }>();
  // 這個畫面「擁有」的那一輪；store 的 sid 與它一致才顯示（避免短暫顯示上一輪的殘留狀態）
  const [ownedSid, setOwnedSid] = useState<number | null>(null);
  const started = useRef(false);
  const finishing = useRef(false);

  const sid = useSessionStore((s) => s.sid);
  const active = useSessionStore((s) => s.active);
  const questions = useSessionStore((s) => s.questions);
  const qIndex = useSessionStore((s) => s.qIndex);
  const answers = useSessionStore((s) => s.answers);
  const loanwordAnswers = useSessionStore((s) => s.loanwordAnswers);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const store = useSessionStore.getState();
    if (mode === 'auto') {
      // 沒有任何已學字就沒有題目可出，回首頁
      if (!store.startAuto(currentProgressList(), Date.now())) {
        router.replace('/');
        return;
      }
      setOwnedSid(useSessionStore.getState().sid);
    } else if (mode === 'confuse') {
      if (!group || !store.startConfuse(group, currentProgressList(), Date.now())) {
        router.replace('/');
        return;
      }
      setOwnedSid(useSessionStore.getState().sid);
    } else if (store.active && store.phase === 'quiz' && store.questions.length > 0) {
      setOwnedSid(store.sid);
    } else {
      router.replace('/');
    }
  }, [mode, group, router]);

  const question = questions[qIndex];
  if (ownedSid === null || ownedSid !== sid || !active || !question) {
    return <Screen />;
  }

  const answeredCount =
    Object.values(answers).reduce((n, list) => n + list.length, 0) + loanwordAnswers.length;
  const isLast = qIndex + 1 >= questions.length;

  const onAnswered = (correct: boolean) => {
    const store = useSessionStore.getState();
    if (question.type === 'loanword') store.recordLoanwordAnswer(correct);
    else store.recordAnswer(question.kanaId, correct);
  };

  const onNext = async () => {
    if (finishing.current) return;
    const store = useSessionStore.getState();
    if (store.nextQuestion()) return;
    finishing.current = true;
    try {
      await store.finish(Date.now());
      router.replace('/result');
    } catch {
      finishing.current = false;
    }
  };

  // confuse 題沿用聽音選字的版面（選項數可變）
  const QuestionView =
    question.type === 'see' ? QuizSee : question.type === 'loanword' ? QuizLoanword : QuizHear;

  return (
    <Screen>
      <Stack.Screen options={{ gestureEnabled: false }} />
      <FlowHeader
        progress={questions.length > 0 ? answeredCount / questions.length : 0}
        onClose={() => confirmExitFlow(router)}
      />
      <QuestionView key={question.id} question={question} onAnswered={onAnswered} onNext={onNext} isLast={isLast} />
    </Screen>
  );
}
