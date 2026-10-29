import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { FlowHeader, Screen } from '../src/components';
import { QuizAll } from '../src/components/QuizAll';
import { QuizHear } from '../src/components/QuizHear';
import { QuizLoanword } from '../src/components/QuizLoanword';
import { QuizOdd } from '../src/components/QuizOdd';
import { QuizSee } from '../src/components/QuizSee';
import { QuizSeq } from '../src/components/QuizSeq';
import { elapsedMinutes, elapsedMs, EXTEND_MINUTES } from '../src/logic/practiceTimer';
import { confirmExitFlow } from '../src/nav/exitToHome';
import { currentProgressList, useSessionStore } from '../src/store/sessionStore';

/**
 * 測驗（C2-08 看字選音／C2-09 聽音選字，依題型切換）。
 * - 預設（每日練習）：session 已由 /learn 建好，這裡只負責出題與作答。
 * - mode=auto：自動練習，see／hear 與易混淆字的找不同系列（odd／all／seq）混合 10 題（片假名有可讀外來語時含 1～2 題 loanword）；
 *   進畫面時建立新的一輪。
 * - loanword 題（C2-20 讀外來語）不屬於任何假名：作答只計入答對數，不更新 SRS。
 * - mode=confuse&group=<id>：易混淆字組快速辨識 10 題（找不同、找出所有、聽音選字串輪流，字限該組）。
 * 最後一題按「完成，看結果」→ 提交 SRS → 到結果頁。
 * 每日練習有時間上限：時間到時不打斷作答，答完當下那題後詢問「結束這一輪」或「再練 5 分鐘」；
 * 選結束 = 部分提交（只提交已作答的字，沒做到的複習字維持原狀）。
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
  const qAnswered = useSessionStore((s) => s.qAnswered);

  const finishRound = async () => {
    if (finishing.current) return;
    finishing.current = true;
    try {
      await useSessionStore.getState().finish(Date.now());
      router.replace('/result');
    } catch {
      finishing.current = false;
    }
  };

  const askTimeUp = () => {
    const s = useSessionStore.getState();
    const minutes = elapsedMinutes(elapsedMs(s, Date.now()));
    Alert.alert(
      `已經練習 ${minutes} 分鐘了，要繼續嗎？`,
      undefined,
      [
        { text: '結束這一輪', onPress: finishRound },
        { text: `再練 ${EXTEND_MINUTES} 分鐘`, onPress: () => useSessionStore.getState().extendTime(Date.now()) },
      ],
      { cancelable: false },
    );
  };

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
      // 接續時如果上次離開前已經時間到，進來就先詢問
      if (store.timeUpDue(Date.now())) askTimeUp();
    } else {
      router.replace('/');
    }
  }, [mode, group, router]);

  const question = questions[qIndex];
  if (ownedSid === null || ownedSid !== sid || !active || !question) {
    return <Screen />;
  }

  // 進度 = 已經答完的題數（字串題一題會記好幾個字，不能用答案筆數算）
  const answeredCount = qIndex + (qAnswered ? 1 : 0);
  const isLast = qIndex + 1 >= questions.length;

  const onAnswered = (correct: boolean) => {
    const store = useSessionStore.getState();
    if (question.type === 'loanword') store.recordLoanwordAnswer(correct);
    else store.recordAnswer(question.kanaId, correct);
  };

  const onNext = async () => {
    if (finishing.current) return;
    const outcome = useSessionStore.getState().advanceQuiz(Date.now());
    if (outcome === 'next') return;
    if (outcome === 'timeup') askTimeUp();
    else await finishRound();
  };

  // confuse 題沿用聽音選字的版面（選項數可變）；odd／all／seq 是易混淆字的找不同系列題型
  const QuestionView =
    question.type === 'see'
      ? QuizSee
      : question.type === 'loanword'
        ? QuizLoanword
        : question.type === 'odd'
          ? QuizOdd
          : question.type === 'all'
            ? QuizAll
            : question.type === 'seq'
              ? QuizSeq
              : QuizHear;

  return (
    <Screen>
      <Stack.Screen options={{ gestureEnabled: false }} />
      <FlowHeader
        progress={questions.length > 0 ? answeredCount / questions.length : 0}
        countLabel={`${qIndex + 1}/${questions.length}`}
        onClose={() => confirmExitFlow(router)}
      />
      <QuestionView key={question.id} question={question} onAnswered={onAnswered} onNext={onNext} isLast={isLast} />
    </Screen>
  );
}
