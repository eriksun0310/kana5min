jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createMemoryRepository } from '../../db/memoryRepository';
import { prog, seededRng } from '../../logic/__tests__/testUtils';
import { MINUTE_MS } from '../../logic/srs';
import { timeConfig } from '../../logic/practiceTimer';
import { currentProgressList, useSessionStore } from '../sessionStore';
import { SESSION_SAVE_KEY } from '../sessionSaveStorage';
import { useProgressStore } from '../progressStore';
import { useSettingsStore } from '../settingsStore';
import { seionOrder } from '../../data';

const NOW = new Date(2026, 9, 28, 10, 0, 0).getTime();
const tick = () => new Promise<void>((r) => setImmediate(() => r()));

/** 平假名與片假名清音都已學、到期 n 個（沒有新字，只有複習） */
async function seedDue(n: number) {
  const ids = [...seionOrder('hiragana'), ...seionOrder('katakana')].map((k) => k.id);
  await useProgressStore.getState().replaceAll(
    ids.map((id, i) => prog(id, { level: 1, nextReviewAt: i < n ? NOW - 1000 : NOW + 86_400_000 })),
  );
}

function answerCurrent(correct = true) {
  const s = useSessionStore.getState();
  const q = s.questions[s.qIndex];
  if ((q.type === 'loanword' || q.type === 'wordread')) s.recordLoanwordAnswer(correct);
  else s.recordAnswer(q.kanaId, correct);
}

describe('限時練習與接續', () => {
  beforeEach(async () => {
    timeConfig.scale = 1;
    await AsyncStorage.clear();
    await useProgressStore.getState().load(createMemoryRepository());
    useSettingsStore.getState().resetSettings();
    useSessionStore.getState().clear();
    useSessionStore.setState({ saved: null, savedOwner: null });
  });

  it('每日練習的上限來自每日目標；計時只在 resume 到 pause 之間累積', async () => {
    await seedDue(5);
    useSettingsStore.getState().setDailyGoalMinutes(3);
    useSessionStore.getState().startDaily(currentProgressList(), NOW, seededRng(1));
    const s = useSessionStore.getState();
    expect(s.limitMs).toBe(3 * MINUTE_MS);
    expect(s.runningSince).toBeNull();
    s.resumeTimer(NOW);
    useSessionStore.getState().pauseTimer(NOW + 60_000);
    useSessionStore.getState().pauseTimer(NOW + 999_000); // 已暫停，不再累積
    expect(useSessionStore.getState().usedMs).toBe(60_000);
  });

  it('時間到：答完當下那題才詢問；再練 5 分鐘後繼續，可以再次觸發', async () => {
    await seedDue(6);
    useSettingsStore.getState().setDailyGoalMinutes(3);
    useSessionStore.getState().startDaily(currentProgressList(), NOW, seededRng(1));
    useSessionStore.getState().resumeTimer(NOW);

    answerCurrent();
    // 2 分鐘：還沒到
    expect(useSessionStore.getState().advanceQuiz(NOW + 2 * MINUTE_MS)).toBe('next');
    expect(useSessionStore.getState().qIndex).toBe(1);

    answerCurrent();
    // 3 分 10 秒：時間到，不前進
    const t1 = NOW + 3 * MINUTE_MS + 10_000;
    expect(useSessionStore.getState().timeUpDue(t1)).toBe(false); // 已作答的題不在這裡判斷
    expect(useSessionStore.getState().advanceQuiz(t1)).toBe('timeup');
    expect(useSessionStore.getState().qIndex).toBe(1);

    useSessionStore.getState().extendTime(t1);
    let s = useSessionStore.getState();
    expect(s.qIndex).toBe(2);
    expect(s.qAnswered).toBe(false);
    expect(s.limitMs).toBe(3 * MINUTE_MS + 10_000 + 5 * MINUTE_MS);

    answerCurrent();
    expect(useSessionStore.getState().advanceQuiz(t1 + 4 * MINUTE_MS)).toBe('next');
    answerCurrent();
    // 再過 1 分鐘超過新上限：再次詢問
    expect(useSessionStore.getState().advanceQuiz(t1 + 5 * MINUTE_MS + 1)).toBe('timeup');
    s = useSessionStore.getState();
    expect(s.qIndex).toBe(3);
  });

  it('最後一題答完時即使時間到也直接結束，不詢問', async () => {
    await seedDue(2);
    useSettingsStore.getState().setDailyGoalMinutes(3);
    useSessionStore.getState().startDaily(currentProgressList(), NOW, seededRng(1));
    useSessionStore.getState().resumeTimer(NOW);
    const total = useSessionStore.getState().questions.length;
    for (let i = 0; i < total - 1; i++) {
      answerCurrent();
      useSessionStore.getState().advanceQuiz(NOW); // 還沒超時
    }
    answerCurrent();
    expect(useSessionStore.getState().advanceQuiz(NOW + 10 * MINUTE_MS)).toBe('done');
  });

  it('自動練習不限時', async () => {
    await seedDue(0);
    expect(useSessionStore.getState().startAuto(currentProgressList(), NOW, seededRng(1))).toBe(true);
    const s = useSessionStore.getState();
    expect(s.limitMs).toBe(0);
    s.resumeTimer(NOW);
    answerCurrent();
    expect(useSessionStore.getState().advanceQuiz(NOW + 60 * MINUTE_MS)).toBe('next');
  });

  it('新字一定先學完：時間到時剩下的新字題排到前面，測驗完才詢問', async () => {
    // 已學 あ行，下一批新字 か行前三個
    const ids = seionOrder('hiragana').slice(0, 5).map((k) => k.id);
    await useProgressStore.getState().replaceAll(ids.map((id) => prog(id, { nextReviewAt: NOW - 1000 })));
    useSettingsStore.getState().setDailyGoalMinutes(3);
    useSessionStore.getState().startDaily(currentProgressList(), NOW, seededRng(1));
    const newIds = useSessionStore.getState().newKanaIds;
    expect(newIds).toHaveLength(3);
    useSessionStore.getState().resumeTimer(NOW);
    for (let i = 0; i < 3; i++) useSessionStore.getState().advanceNew(seededRng(2));
    expect(useSessionStore.getState().phase).toBe('quiz');
    // 新字 6 題 + 複習 5 題；學完新字時已經超時
    const late = NOW + 4 * MINUTE_MS;
    answerCurrent();
    for (let i = 0; i < 20; i++) {
      const out = useSessionStore.getState().advanceQuiz(late);
      if (out !== 'next') {
        // 詢問時，6 個新字題必須都答完了
        const answered = useSessionStore.getState().answers;
        for (const id of newIds) expect(answered[id]).toHaveLength(2);
        expect(out).toBe('timeup');
        return;
      }
      answerCurrent();
    }
    throw new Error('沒有出現時間到詢問');
  });

  it('部分提交：只提交已作答的字，沒做到的複習字保持原狀；結果頁用時只計練習時間', async () => {
    await seedDue(6);
    const before = useProgressStore.getState().progress;
    useSessionStore.getState().startDaily(currentProgressList(), NOW, seededRng(1));
    useSessionStore.getState().resumeTimer(NOW);
    const total = useSessionStore.getState().questions.length;
    expect(total).toBeGreaterThanOrEqual(6); // 6 個複習字（片假名階段可能再加讀外來語題）
    const answeredIds: string[] = [];
    for (let i = 0; i < 2; i++) {
      answeredIds.push(useSessionStore.getState().questions[useSessionStore.getState().qIndex].kanaId);
      answerCurrent(i === 0);
      useSessionStore.getState().advanceQuiz(NOW);
    }
    const result = await useSessionStore.getState().finish(NOW + 2 * MINUTE_MS + 30_000);
    const after = useProgressStore.getState().progress;
    for (const id of Object.keys(before)) {
      if (answeredIds.includes(id)) expect(after[id]).not.toEqual(before[id]);
      else expect(after[id]).toEqual(before[id]); // 沒做到的維持到期狀態
    }
    expect(result.summary.total).toBeLessThanOrEqual(2);
    expect(result.summary.reviewCount).toBeLessThanOrEqual(2);
    expect(result.summary.elapsedMs).toBe(2 * MINUTE_MS + 30_000);
  });

  it('學到一半的新字（還沒測驗）不算學會', async () => {
    useSessionStore.getState().startDaily(currentProgressList(), NOW, seededRng(1));
    useSessionStore.getState().advanceNew(seededRng(2)); // 只學完第一個新字的流程
    useSessionStore.getState().leave(NOW);
    expect(Object.keys(useProgressStore.getState().progress)).toHaveLength(0);
  });

  it('離開後存檔；接續回到離開時的那一題，已答的題不會重答', async () => {
    await seedDue(8);
    useSessionStore.getState().startDaily(currentProgressList(), NOW, seededRng(1));
    useSessionStore.getState().resumeTimer(NOW);
    answerCurrent();
    useSessionStore.getState().advanceQuiz(NOW);
    answerCurrent(false);
    const qs = useSessionStore.getState().questions;
    const answers = useSessionStore.getState().answers;
    // 第 2 題已作答、還沒按下一題就離開
    useSessionStore.getState().leave(NOW + 90_000);
    await tick();
    expect(useSessionStore.getState().active).toBe(false);
    const saved = useSessionStore.getState().saved;
    expect(saved?.qIndex).toBe(2);
    expect(saved?.usedMs).toBe(90_000);
    expect(await AsyncStorage.getItem(SESSION_SAVE_KEY)).not.toBeNull();

    // 模擬重開 App：從 AsyncStorage 讀回
    useSessionStore.setState({ saved: null });
    await useSessionStore.getState().loadSaved(NOW + 100_000);
    expect(useSessionStore.getState().saved).not.toBeNull();

    expect(useSessionStore.getState().resumeSaved(NOW + 100_000)).toBe('quiz');
    const s = useSessionStore.getState();
    expect(s.active).toBe(true);
    expect(s.qIndex).toBe(2);
    expect(s.questions).toEqual(qs);
    expect(s.answers).toEqual(answers);
    expect(s.usedMs).toBe(90_000);
    expect(s.runningSince).toBeNull();
  });

  it('新字階段離開：接續從目前新字開始；提交後存檔清掉', async () => {
    useSessionStore.getState().startDaily(currentProgressList(), NOW, seededRng(1));
    useSessionStore.getState().advanceNew(seededRng(2));
    useSessionStore.getState().leave(NOW);
    await tick();
    expect(useSessionStore.getState().saved?.phase).toBe('learn');
    expect(useSessionStore.getState().resumeSaved(NOW)).toBe('learn');
    expect(useSessionStore.getState().newIndex).toBe(1);

    useSessionStore.getState().advanceNew(seededRng(2));
    useSessionStore.getState().advanceNew(seededRng(2));
    for (const q of useSessionStore.getState().questions) useSessionStore.getState().recordAnswer(q.kanaId, true);
    await useSessionStore.getState().finish(NOW + MINUTE_MS);
    await tick();
    expect(useSessionStore.getState().saved).toBeNull();
    expect(await AsyncStorage.getItem(SESSION_SAVE_KEY)).toBeNull();
  });

  it('題目都答完才離開：接續時只差提交（finish）', async () => {
    await seedDue(2);
    useSessionStore.getState().startDaily(currentProgressList(), NOW, seededRng(1));
    const total = useSessionStore.getState().questions.length;
    for (let i = 0; i < total; i++) {
      answerCurrent();
      if (i < total - 1) useSessionStore.getState().advanceQuiz(NOW);
    }
    useSessionStore.getState().leave(NOW);
    expect(useSessionStore.getState().resumeSaved(NOW)).toBe('finish');
  });

  it('什麼都沒做就離開：不留存檔', async () => {
    await seedDue(3);
    useSessionStore.getState().startDaily(currentProgressList(), NOW, seededRng(1));
    useSessionStore.getState().leave(NOW);
    await tick();
    expect(useSessionStore.getState().saved).toBeNull();
    expect(await AsyncStorage.getItem(SESSION_SAVE_KEY)).toBeNull();
  });

  it('隔天自動作廢：讀回、接續、refresh 都會丟掉', async () => {
    await seedDue(3);
    useSessionStore.getState().startDaily(currentProgressList(), NOW, seededRng(1));
    answerCurrent();
    useSessionStore.getState().leave(NOW);
    await tick();
    const tomorrow = new Date(2026, 9, 29, 0, 1, 0).getTime();

    useSessionStore.getState().refreshSaved(tomorrow);
    expect(useSessionStore.getState().saved).toBeNull();

    useSessionStore.setState({ saved: null });
    // 存檔還在 storage（模擬沒有 refresh 的情況）：讀回時也要作廢
    await AsyncStorage.setItem(
      SESSION_SAVE_KEY,
      JSON.stringify({ version: 1, day: '2026-10-28' }),
    );
    await useSessionStore.getState().loadSaved(tomorrow);
    expect(useSessionStore.getState().saved).toBeNull();
    expect(await AsyncStorage.getItem(SESSION_SAVE_KEY)).toBeNull();
    expect(useSessionStore.getState().resumeSaved(tomorrow)).toBeNull();
  });

  it('從頭開始：重新開始每日練習會丟掉存檔，新的一輪沒有舊答案', async () => {
    await seedDue(4);
    useSessionStore.getState().startDaily(currentProgressList(), NOW, seededRng(1));
    answerCurrent();
    useSessionStore.getState().leave(NOW);
    await tick();
    expect(useSessionStore.getState().saved).not.toBeNull();

    useSessionStore.getState().startDaily(currentProgressList(), NOW, seededRng(2));
    await tick();
    const s = useSessionStore.getState();
    expect(s.saved).toBeNull();
    expect(s.answers).toEqual({});
    expect(s.qIndex).toBe(0);
    expect(s.usedMs).toBe(0);
    expect(await AsyncStorage.getItem(SESSION_SAVE_KEY)).toBeNull();
  });

  it('自動練習與易混淆快速辨識共用同一套存檔', async () => {
    await seedDue(0);
    useSessionStore.getState().startAuto(currentProgressList(), NOW, seededRng(1));
    answerCurrent();
    useSessionStore.getState().leave(NOW + 1000);
    await tick();
    expect(useSessionStore.getState().saved?.mode).toBe('auto');
    expect(useSessionStore.getState().resumeSaved(NOW + 2000)).toBe('quiz');
    expect(useSessionStore.getState().mode).toBe('auto');
    expect(useSessionStore.getState().qIndex).toBe(1);
  });

  it('時間到後離開再接續：進測驗畫面先詢問（timeUpDue）', async () => {
    await seedDue(6);
    useSettingsStore.getState().setDailyGoalMinutes(3);
    useSessionStore.getState().startDaily(currentProgressList(), NOW, seededRng(1));
    useSessionStore.getState().resumeTimer(NOW);
    answerCurrent();
    expect(useSessionStore.getState().advanceQuiz(NOW + 4 * MINUTE_MS)).toBe('timeup');
    useSessionStore.getState().leave(NOW + 4 * MINUTE_MS);
    expect(useSessionStore.getState().resumeSaved(NOW + 5 * MINUTE_MS)).toBe('quiz');
    expect(useSessionStore.getState().qIndex).toBe(1);
    expect(useSessionStore.getState().timeUpDue(NOW + 5 * MINUTE_MS)).toBe(true);
    useSessionStore.getState().extendTime(NOW + 5 * MINUTE_MS);
    expect(useSessionStore.getState().qIndex).toBe(1); // 還沒作答，不前進
    expect(useSessionStore.getState().timeUpDue(NOW + 5 * MINUTE_MS)).toBe(false);
  });
});
