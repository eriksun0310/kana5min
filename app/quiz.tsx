import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { FlowHeader, Screen } from '../src/components';
import { QuizFindAll } from '../src/components/QuizFindAll';
import { QuizHear } from '../src/components/QuizHear';
import { QuizLoanword } from '../src/components/QuizLoanword';
import { QuizMaskHalf } from '../src/components/QuizMaskHalf';
import { QuizReadSeq } from '../src/components/QuizReadSeq';
import { QuizSee } from '../src/components/QuizSee';
import { QuizRecall } from '../src/components/QuizRecall';
import { QuizSeq } from '../src/components/QuizSeq';
import { QuizSpotError } from '../src/components/QuizSpotError';
import { QuizWordRead } from '../src/components/QuizWordRead';
import { DEV_PLACEHOLDER_WORDS } from '../src/data/spotErrorWords';
import { buildDevSpotQuestions } from '../src/logic/spotError';
import { isLoanwordQuestion, type AnswerDetail, type QuizQuestion } from '../src/logic/session';
import { recordConfusion } from '../src/scoring';
import { elapsedMinutes, elapsedMs, EXTEND_MINUTES } from '../src/logic/practiceTimer';
import { confirmExitFlow } from '../src/nav/exitToHome';
import { currentProgressList, useSessionStore } from '../src/store/sessionStore';

// 開發用按鈕只在 __DEV__ 載入，正式包的 bundle 不會包含 src/dev
const QuizDevBar: React.ComponentType<{ question: QuizQuestion }> | null = __DEV__
  ? require('../src/dev/QuizDevBar').default
  : null;

/**
 * 測驗（C2-08 看字選音／C2-09 聽音選字，依題型切換）。
 * - 預設（每日練習）：session 已由 /learn 建好，這裡只負責出題與作答。
 * - mode=auto：自動練習，看字選音、聽音選字與易混淆字題型（找出所有、念出一串、聽音選字串）混合 10 題，同一題型最多 2 題（片假名有可讀外來語時含看詞選拼音）；
 *   進畫面時建立新的一輪。
 * - loanword／wordread 題（讀外來語、看詞選拼音）不屬於任何假名：作答只計入答對數，不更新 SRS。
 * - mode=confuse&group=<id>：易混淆字組快速辨識 10 題（找出所有、念出一串、聽音選字串、看字選音、聽音選字，字限該組）。
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
    } else if (__DEV__ && mode === 'dev-spot') {
      // 開發版專用：用佔位詞出抓錯字題，看介面（kana5min://quiz?mode=dev-spot）
      if (!store.startQuestions(buildDevSpotQuestions(DEV_PLACEHOLDER_WORDS, Math.random), Date.now())) {
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

  const onAnswered = (correct: boolean, detail?: AnswerDetail) => {
    const store = useSessionStore.getState();
    if (isLoanwordQuestion(question)) store.recordLoanwordAnswer(correct);
    else if (detail?.perKana) store.recordAnswers(detail.perKana);
    else store.recordAnswer(question.kanaId, correct);
    // 把 X 當成 Y：選擇題答錯時記「把正確的字當成選到的字」；多字題由元件給整組混淆對
    if (!correct && detail?.picked && question.kanaId) void recordConfusion(question.kanaId, detail.picked);
    for (const c of detail?.confusions ?? []) void recordConfusion(c.truth, c.picked);
  };

  const onNext = async () => {
    if (finishing.current) return;
    const outcome = useSessionStore.getState().advanceQuiz(Date.now());
    if (outcome === 'next') return;
    if (outcome === 'timeup') askTimeUp();
    else await finishRound();
  };

  // confuse 題沿用聽音選字的版面（選項數可變）；其餘題型各有各的畫面
  const QuestionView = (
    {
      see: QuizSee,
      loanword: QuizLoanword,
      wordread: QuizWordRead,
      findall: QuizFindAll,
      readseq: QuizReadSeq,
      seq: QuizSeq,
      maskhalf: QuizMaskHalf,
      recall: QuizRecall,
      spoterr: QuizSpotError,
    } as Partial<Record<typeof question.type, typeof QuizHear>>
  )[question.type] ?? QuizHear;

  return (
    <Screen>
      <Stack.Screen options={{ gestureEnabled: false }} />
      <FlowHeader
        progress={questions.length > 0 ? answeredCount / questions.length : 0}
        countLabel={`${qIndex + 1}/${questions.length}`}
        onClose={() => confirmExitFlow(router)}
      />
      {QuizDevBar ? <QuizDevBar question={question} /> : null}
      <QuestionView key={question.id} question={question} onAnswered={onAnswered} onNext={onNext} isLast={isLast} />
    </Screen>
  );
}
