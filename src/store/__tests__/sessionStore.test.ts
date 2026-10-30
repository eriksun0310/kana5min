jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { createMemoryRepository } from '../../db/memoryRepository';
import { DAY_MS, MINUTE_MS } from '../../logic/srs';
import { seededRng } from '../../logic/__tests__/testUtils';
import { useProgressStore } from '../progressStore';
import { seionOrder, wordById } from '../../data';
import { readableLoanwords } from '../../logic/loanword';
import { currentProgressList, MAX_REVIEW_PER_ROUND, useSessionStore } from '../sessionStore';
import { useSettingsStore } from '../settingsStore';

const NOW = new Date(2026, 9, 27, 10, 0, 0).getTime();

async function freshProgress() {
  await useProgressStore.getState().load(createMemoryRepository());
}

/** 把整輪都答完（全對或指定某題答錯），回傳提交後的結果 */
async function playQuiz(wrongKanaIds: string[] = []) {
  const s = useSessionStore.getState();
  for (const q of s.questions) {
    useSessionStore.getState().recordAnswer(q.kanaId, !wrongKanaIds.includes(q.kanaId));
  }
  return useSessionStore.getState().finish(NOW + 4 * MINUTE_MS);
}

describe('sessionStore（每日練習狀態）', () => {
  beforeEach(async () => {
    await freshProgress();
    useSettingsStore.getState().resetSettings();
    useSessionStore.getState().clear();
  });

  it('第一次練習：3 個新字，依序走完後建立 6 題（每字 2 題）', async () => {
    const out = useSessionStore.getState().startDaily(currentProgressList(), NOW, seededRng(1));
    expect(out).toBe('learn');
    const s = useSessionStore.getState();
    expect(s.newKanaIds).toEqual(['h-a', 'h-i', 'h-u']);
    expect(s.phase).toBe('learn');
    expect(s.questions).toHaveLength(0);

    expect(useSessionStore.getState().advanceNew(seededRng(2))).toBe('next');
    expect(useSessionStore.getState().advanceNew(seededRng(2))).toBe('next');
    expect(useSessionStore.getState().newIndex).toBe(2);
    expect(useSessionStore.getState().advanceNew(seededRng(2))).toBe('quiz');
    const after = useSessionStore.getState();
    expect(after.phase).toBe('quiz');
    expect(after.questions).toHaveLength(6);
  });

  it('全對提交：新字升到 1 級、記錄練習日、結果頁資料正確', async () => {
    useSessionStore.getState().startDaily(currentProgressList(), NOW, seededRng(1));
    useSessionStore.getState().advanceNew(seededRng(2));
    useSessionStore.getState().advanceNew(seededRng(2));
    useSessionStore.getState().advanceNew(seededRng(2));
    const result = await playQuiz();

    expect(result.summary.correct).toBe(6);
    expect(result.summary.total).toBe(6);
    expect(result.summary.newCount).toBe(3);
    expect(result.summary.reviewCount).toBe(0);
    expect(result.summary.items.every((i) => i.label === '新學會' && i.when === '明天')).toBe(true);
    expect(result.completedRows).toEqual([]);

    const p = useProgressStore.getState().progress['h-a'];
    expect(p.level).toBe(1);
    expect(p.learnedAt).toBeDefined();
    expect(p.nextReviewAt).toBe(NOW + 4 * MINUTE_MS + DAY_MS);
    expect(useSettingsStore.getState().practiceDates).toHaveLength(1);
  });

  it('有答錯：該字回 0 級，10 分鐘後再出現，結果頁用答錯文案', async () => {
    useSessionStore.getState().startDaily(currentProgressList(), NOW, seededRng(3));
    for (let i = 0; i < 3; i++) useSessionStore.getState().advanceNew(seededRng(4));
    const result = await playQuiz(['h-i']);
    const item = result.summary.items.find((i) => i.kanaId === 'h-i')!;
    expect(item.label).toBe('答錯 2 次');
    expect(item.tone).toBe('wrong');
    expect(item.when).toBe('10 分鐘後');
    expect(useProgressStore.getState().progress['h-i'].level).toBe(0);
  });

  it('一輪湊滿一行：あ行學完（第 2 輪的 え お か）', async () => {
    const repo = createMemoryRepository();
    await useProgressStore.getState().load(repo);
    await useProgressStore.getState().commitRound({ 'h-a': [true], 'h-i': [true], 'h-u': [true] }, NOW - 2 * DAY_MS);
    // 這時あ行還差 え お
    const out = useSessionStore.getState().startDaily(currentProgressList(), NOW, seededRng(5));
    expect(out).toBe('learn');
    expect(useSessionStore.getState().newKanaIds).toEqual(['h-e', 'h-o', 'h-ka']);
    for (let i = 0; i < 3; i++) useSessionStore.getState().advanceNew(seededRng(6));
    const result = await playQuiz();
    expect(result.completedRows).toEqual(['a']);
    // 複習字 あ い う 已到期，會混在題目裡
    expect(result.summary.reviewCount).toBe(3);
  });

  it('新字都學完（平假名與片假名）：有到期複習就直接進測驗（最多 20 題複習）；沒有到期則回報 empty', async () => {
    const allIds = [...seionOrder('hiragana'), ...seionOrder('katakana')].map((k) => k.id);
    const answers = Object.fromEntries(allIds.map((id) => [id, [true]]));
    // 全部在 2 天前學完（1 級 → 1 天後到期，現在都已到期）
    await useProgressStore.getState().commitRound(answers, NOW - 2 * DAY_MS);
    expect(useSessionStore.getState().startDaily(currentProgressList(), NOW, seededRng(1))).toBe('quiz');
    const s = useSessionStore.getState();
    expect(s.phase).toBe('quiz');
    expect(s.newKanaIds).toEqual([]);
    // 片假名清音已全部學過：複習題之外，再加 1～2 題讀外來語
    expect(s.questions.filter((q) => q.type !== 'wordread')).toHaveLength(MAX_REVIEW_PER_ROUND);
    const loanwords = s.questions.filter((q) => q.type === 'wordread');
    expect(loanwords.length).toBeGreaterThanOrEqual(1);
    expect(loanwords.length).toBeLessThanOrEqual(2);

    // 剛學完、還沒到期：沒有新字也沒有複習
    await freshProgress();
    await useProgressStore.getState().commitRound(answers, NOW);
    expect(useSessionStore.getState().startDaily(currentProgressList(), NOW, seededRng(1))).toBe('empty');
  });

  it('自動練習：沒有已學字回傳 false；有已學字建立題目且不當作新字', async () => {
    expect(useSessionStore.getState().startAuto(currentProgressList(), NOW, seededRng(1))).toBe(false);
    await useProgressStore
      .getState()
      .commitRound({ 'h-a': [true], 'h-i': [true], 'h-u': [true], 'h-e': [true], 'h-o': [true] }, NOW - DAY_MS);
    expect(useSessionStore.getState().startAuto(currentProgressList(), NOW, seededRng(1))).toBe(true);
    const s = useSessionStore.getState();
    expect(s.mode).toBe('auto');
    expect(s.newKanaIds).toEqual([]);
    expect(s.questions).toHaveLength(10);
    const result = await playQuiz(['h-a']);
    expect(result.summary.newCount).toBe(0);
    expect(result.summary.total).toBe(10);
    expect(result.summary.items.find((i) => i.kanaId === 'h-a')?.tone).toBe('wrong');
  });

  it('recordAnswers：一題多個假名各記一筆（kana_stat 與本輪答案），整題只算作答一次', async () => {
    const ids = ['h-nu', 'h-me'];
    await useProgressStore.getState().commitRound(Object.fromEntries(ids.map((i) => [i, [true]])), NOW - DAY_MS);
    expect(useSessionStore.getState().startAuto(currentProgressList(), NOW, seededRng(2))).toBe(true);
    useSessionStore.getState().recordAnswers({ 'h-nu': false, 'h-me': true });
    await new Promise((r) => setTimeout(r, 0));
    const s = useSessionStore.getState();
    expect(s.answers['h-nu']).toEqual([false]);
    expect(s.answers['h-me']).toEqual([true]);
    expect(s.qAnswered).toBe(true);
    const stats = useProgressStore.getState().kanaStats;
    expect(stats['h-nu']).toMatchObject({ correctCount: 0, wrongCount: 1 });
    expect(stats['h-me']).toMatchObject({ correctCount: 1, wrongCount: 0 });
  });

  it('自動練習含易混淆字題：答錯當下就寫入該組答錯次數，不等一輪結束', async () => {
    const ids = ['h-a', 'h-i', 'h-u', 'h-e', 'h-o', 'h-nu', 'h-me', 'h-ru', 'h-ro'];
    await useProgressStore.getState().commitRound(Object.fromEntries(ids.map((i) => [i, [true]])), NOW - DAY_MS);
    expect(useSessionStore.getState().startAuto(currentProgressList(), NOW, seededRng(8))).toBe(true);
    const s = useSessionStore.getState();
    expect(s.questions).toHaveLength(10);
    expect(s.questions.some((q) => ['findall', 'readseq', 'seq', 'maskhalf', 'see', 'confuse'].includes(q.type))).toBe(true);

    useSessionStore.getState().recordAnswer('h-nu', false);
    // 還沒 finish，confusion 已經寫進 store 與 repository
    await Promise.resolve();
    await new Promise((r) => setTimeout(r, 0));
    expect(useProgressStore.getState().confusions.find((c) => c.groupId === 'nume')?.wrongCount).toBe(1);
    useSessionStore.getState().recordAnswer('h-nu', true); // 答對不扣
    useSessionStore.getState().recordAnswer('h-i', false); // い 不屬於任何組
    await new Promise((r) => setTimeout(r, 0));
    expect(useProgressStore.getState().confusions).toHaveLength(1);
    expect(useProgressStore.getState().confusions[0].wrongCount).toBe(1);
  });

  it('快速辨識：已學的字照常更新 SRS 與 correctStreak；未學的字只記答錯、不寫 SRS', async () => {
    // 只學過 ぬ；め 還沒學
    await useProgressStore.getState().commitRound({ 'h-nu': [true] }, NOW - 2 * DAY_MS);
    const before = useProgressStore.getState().progress['h-nu'];
    expect(useSessionStore.getState().startConfuse('nume', currentProgressList(), NOW, seededRng(9))).toBe(true);
    const s = useSessionStore.getState();
    expect(s.mode).toBe('confuse');
    expect(s.groupId).toBe('nume');
    expect(s.questions).toHaveLength(10);
    expect(s.questions.every((q) => ['findall', 'readseq', 'seq', 'maskhalf', 'see', 'confuse'].includes(q.type))).toBe(true);

    const result = await playQuiz(['h-me']); // め 全錯，ぬ 全對
    const progress = useProgressStore.getState().progress;
    expect(progress['h-me']).toBeUndefined(); // 未學的字不寫 SRS
    expect(progress['h-nu'].level).toBe(before.level + 1);
    expect(progress['h-nu'].correctStreak).toBeGreaterThan(before.correctStreak);
    const meWrong = s.questions.filter((q) => q.kanaId === 'h-me').length;
    await new Promise((r) => setTimeout(r, 0));
    expect(useProgressStore.getState().confusions.find((c) => c.groupId === 'nume')?.wrongCount).toBe(meWrong);
    expect(result.mode).toBe('confuse');
    expect(result.groupId).toBe('nume');
    expect(result.summary.total).toBe(10);
    expect(result.summary.correct).toBe(10 - meWrong);
    expect(result.summary.items.map((i) => i.kanaId)).toEqual(['h-nu']);
  });

  it('快速辨識：字組不存在回傳 false', () => {
    expect(useSessionStore.getState().startConfuse('nope', currentProgressList(), NOW)).toBe(false);
  });

  it('finish 只提交一次（重複呼叫回傳同一份結果）', async () => {
    useSessionStore.getState().startDaily(currentProgressList(), NOW, seededRng(1));
    for (let i = 0; i < 3; i++) useSessionStore.getState().advanceNew(seededRng(2));
    const first = await playQuiz();
    const again = await useSessionStore.getState().finish(NOW + 99 * MINUTE_MS);
    expect(again).toBe(first);
  });
});


describe('sessionStore（片假名階段）', () => {
  const hiraganaAnswers = () => Object.fromEntries(seionOrder('hiragana').map((k) => [k.id, [true]]));
  const katakanaIds = (n: number) =>
    seionOrder('katakana')
      .slice(0, n)
      .map((k) => k.id);

  beforeEach(async () => {
    await freshProgress();
    useSettingsStore.getState().resetSettings();
    useSessionStore.getState().clear();
  });

  /** 整輪答完：kana 題全對；讀外來語題依 loanwordCorrect 作答（用 answerId 判斷對錯）。回傳提交結果。 */
  async function playAll(loanwordCorrect: boolean) {
    for (const q of useSessionStore.getState().questions) {
      if (q.type === 'wordread') useSessionStore.getState().recordLoanwordAnswer(loanwordCorrect);
      else useSessionStore.getState().recordAnswer(q.kanaId, true);
    }
    return useSessionStore.getState().finish(NOW + 4 * MINUTE_MS);
  }

  it('平假名全學完：每日新字從片假名 アイウ 開始；還讀不了任何外來語，測驗沒有 loanword 題', async () => {
    await useProgressStore.getState().commitRound(hiraganaAnswers(), NOW - 2 * DAY_MS);
    // 平假名都到期了，先確認新字是片假名
    expect(useSessionStore.getState().startDaily(currentProgressList(), NOW, seededRng(1))).toBe('learn');
    expect(useSessionStore.getState().newKanaIds).toEqual(['k-a', 'k-i', 'k-u']);
    for (let i = 0; i < 3; i++) useSessionStore.getState().advanceNew(seededRng(2));
    const qs = useSessionStore.getState().questions;
    // 新字 3×2 題 + 到期的平假名複習題（最多 20）
    expect(qs.some((q) => q.type === 'wordread')).toBe(false);
    expect(qs.filter((q) => q.kanaId.startsWith('k-'))).toHaveLength(6);
  });

  it('片假名階段每日練習：有可讀詞就加 1～2 題讀外來語，只出可讀的詞，且選項格式正確', async () => {
    await useProgressStore.getState().commitRound(hiraganaAnswers(), NOW);
    await useProgressStore.getState().commitRound(Object.fromEntries(katakanaIds(10).map((id) => [id, [true]])), NOW);
    for (let seed = 1; seed <= 20; seed++) {
      useSessionStore.getState().clear();
      useSessionStore.getState().startDaily(currentProgressList(), NOW, seededRng(seed));
      const s = useSessionStore.getState();
      expect(s.newKanaIds).toEqual(['k-sa', 'k-shi', 'k-su']);
      for (let i = 0; i < 3; i++) useSessionStore.getState().advanceNew(seededRng(seed + 100));
      const qs = useSessionStore.getState().questions;
      const lw = qs.filter((q) => q.type === 'wordread');
      expect(lw.length).toBeGreaterThanOrEqual(1);
      expect(lw.length).toBeLessThanOrEqual(2);
      // 可讀 = 已學 ア～コ + 今天的新字 サシス
      const readable = new Set(readableLoanwords([...katakanaIds(10), 'k-sa', 'k-shi', 'k-su']).map((w) => w.id));
      for (const q of lw) {
        expect(q.kanaId).toBe('');
        expect(readable.has(q.wordId!)).toBe(true);
        expect(q.options).toHaveLength(4);
        expect(new Set(q.options).size).toBe(4);
        expect(q.answerId).toBe(wordById(q.wordId!)!.romaji);
      }
      // 題目 id 連續、新字的題目仍是 2 題一個字
      expect(qs.map((q) => q.id)).toEqual(qs.map((_, i) => `q-${i}`));
      expect(qs.filter((q) => q.kanaId === 'k-sa')).toHaveLength(2);
    }
  });

  it('讀外來語題不更新任何假名的 SRS，但計入結果頁的答對數與總題數', async () => {
    await useProgressStore.getState().commitRound(hiraganaAnswers(), NOW);
    await useProgressStore.getState().commitRound(Object.fromEntries(katakanaIds(10).map((id) => [id, [true]])), NOW);
    useSessionStore.getState().startDaily(currentProgressList(), NOW, seededRng(3));
    for (let i = 0; i < 3; i++) useSessionStore.getState().advanceNew(seededRng(4));
    const qs = useSessionStore.getState().questions;
    const loanwordCount = qs.filter((q) => q.type === 'wordread').length;
    expect(loanwordCount).toBeGreaterThan(0);
    const before = { ...useProgressStore.getState().progress };

    const result = await playAll(false); // 讀外來語題全部答錯，kana 題全對
    const after = useProgressStore.getState().progress;
    // 只有 サシス 三個新字新增進度；舊字不因為外來語答錯而降級
    expect(Object.keys(after).sort()).toEqual([...Object.keys(before), 'k-sa', 'k-shi', 'k-su'].sort());
    for (const id of katakanaIds(10)) expect(after[id]).toEqual(before[id]);
    for (const id of ['k-sa', 'k-shi', 'k-su']) expect(after[id].level).toBe(1);
    // 答對數只計 kana 題；總題數含讀外來語
    expect(result.summary.total).toBe(qs.length);
    expect(result.summary.correct).toBe(qs.length - loanwordCount);
    expect(result.summary.newCount).toBe(3);
    // 結果清單只列假名
    expect(result.summary.items.every((i) => i.kanaId.length > 0)).toBe(true);
    expect(useSessionStore.getState().loanwordAnswers).toHaveLength(loanwordCount);
  });

  it('讀外來語題答對也計入答對數', async () => {
    await useProgressStore.getState().commitRound(hiraganaAnswers(), NOW);
    await useProgressStore.getState().commitRound(Object.fromEntries(katakanaIds(10).map((id) => [id, [true]])), NOW);
    useSessionStore.getState().startDaily(currentProgressList(), NOW, seededRng(3));
    for (let i = 0; i < 3; i++) useSessionStore.getState().advanceNew(seededRng(4));
    const total = useSessionStore.getState().questions.length;
    const result = await playAll(true);
    expect(result.summary.correct).toBe(total);
    expect(result.summary.total).toBe(total);
  });

  it('片假名學完一行：結果標記為片假名的行', async () => {
    await useProgressStore.getState().commitRound(hiraganaAnswers(), NOW - 2 * DAY_MS);
    await useProgressStore
      .getState()
      .commitRound(Object.fromEntries(katakanaIds(2).map((id) => [id, [true]])), NOW - 2 * DAY_MS); // ア イ
    useSessionStore.getState().startDaily(currentProgressList(), NOW, seededRng(1));
    expect(useSessionStore.getState().newKanaIds).toEqual(['k-u', 'k-e', 'k-o']);
    for (let i = 0; i < 3; i++) useSessionStore.getState().advanceNew(seededRng(2));
    const result = await playAll(true);
    expect(result.completedRows).toEqual(['a']);
    expect(result.completedScript).toBe('katakana');
  });

  it('平假名學完那一輪：結果標記為平假名的行（wa 行）', async () => {
    const ids = seionOrder('hiragana')
      .map((k) => k.id)
      .filter((id) => id !== 'h-n');
    await useProgressStore.getState().commitRound(Object.fromEntries(ids.map((id) => [id, [true]])), NOW - 2 * DAY_MS);
    useSessionStore.getState().startDaily(currentProgressList(), NOW, seededRng(1));
    expect(useSessionStore.getState().newKanaIds).toEqual(['h-n']);
    useSessionStore.getState().advanceNew(seededRng(2));
    const result = await playAll(true);
    expect(result.completedRows).toEqual(['wa']);
    expect(result.completedScript).toBe('hiragana');
  });

  it('自動練習：片假名解鎖且有可讀詞時含 1～2 題讀外來語，總題數仍是 10，且不列入複習字', async () => {
    await useProgressStore.getState().commitRound(hiraganaAnswers(), NOW - DAY_MS);
    await useProgressStore
      .getState()
      .commitRound(Object.fromEntries(katakanaIds(10).map((id) => [id, [true]])), NOW - DAY_MS);
    const readable = new Set(readableLoanwords(katakanaIds(10)).map((w) => w.id));
    for (let seed = 1; seed <= 15; seed++) {
      expect(useSessionStore.getState().startAuto(currentProgressList(), NOW, seededRng(seed))).toBe(true);
      const s = useSessionStore.getState();
      expect(s.questions).toHaveLength(10);
      const lw = s.questions.filter((q) => q.type === 'wordread');
      expect(lw.length).toBeGreaterThanOrEqual(1);
      expect(lw.length).toBeLessThanOrEqual(2);
      for (const q of lw) expect(readable.has(q.wordId!)).toBe(true);
      expect(s.reviewKanaIds.includes('')).toBe(false);
    }
  });

  it('自動練習：平假名階段（還沒學片假名）沒有讀外來語題', async () => {
    await useProgressStore
      .getState()
      .commitRound({ 'h-a': [true], 'h-i': [true], 'h-u': [true], 'h-e': [true], 'h-o': [true] }, NOW - DAY_MS);
    useSessionStore.getState().startAuto(currentProgressList(), NOW, seededRng(1));
    expect(useSessionStore.getState().questions.some((q) => q.type === 'wordread')).toBe(false);
  });

  it('clear 之後 loanwordAnswers 歸零', () => {
    useSessionStore.getState().recordLoanwordAnswer(true);
    expect(useSessionStore.getState().loanwordAnswers).toEqual([true]);
    useSessionStore.getState().clear();
    expect(useSessionStore.getState().loanwordAnswers).toEqual([]);
  });
});
