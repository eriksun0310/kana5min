import { confusableGroups, confusableGroupById } from '../../data/confusables';
import { byId, seionOrder } from '../../data';
import { readableLoanwords } from '../loanword';
import {
  AUTO_PRACTICE_SIZE,
  availableGroups,
  buildAutoPractice10,
  buildConfuseQuestion,
  buildQuickConfuse10,
  confusionCounts,
  groupsForWrongAnswer,
  isConfuseEligible,
  isKatakanaUnlocked,
  pickConfuseGroup,
  planTypes,
  groupsByTab,
  sortGroupsByMisses,
  tipLines,
  topConfusionGroups,
} from '../confusion';
import { prog, seededRng } from './testUtils';

const group = (id: string) => confusableGroupById(id)!;
const learnedOf = (...ids: string[]) => new Set(ids);
const hiraganaAll = () => seionOrder('hiragana').map((k) => prog(k.id));

describe('易混淆字組資料', () => {
  it('18 組（原本 5 組＋批 6 的 13 組）、id 為 ascii 且不重複、label 與 members 對得上', () => {
    expect(confusableGroups).toHaveLength(18);
    expect(confusableGroups.slice(0, 5).map((g) => g.id)).toEqual(['nume', 'ruro', 'wanere', 'shitsu', 'son']);
    expect(new Set(confusableGroups.map((g) => g.id)).size).toBe(18);
    for (const g of confusableGroups) expect(g.id).toMatch(/^[a-z]+$/);
    expect(group('wanere').members).toEqual(['h-wa', 'h-ne', 'h-re']);
    expect(group('shitsu').members).toEqual(['k-shi', 'k-tsu']);
    expect(group('son').members).toEqual(['k-so', 'k-n']);
    for (const g of confusableGroups) expect(g.tip.length).toBeGreaterThan(10);
  });
});

describe('tipLines（差在哪裡斷行）', () => {
  it('斷在「。」「；」後面，每句一行', () => {
    expect(tipLines('兩個字都是 3 筆。お 的右上角多一點；あ 沒有那一點。')).toEqual([
      '兩個字都是 3 筆。',
      'お 的右上角多一點；',
      'あ 沒有那一點。',
    ]);
    expect(tipLines('只有一句')).toEqual(['只有一句']);
    expect(tipLines('')).toEqual([]);
  });

  it('每一組的說明都至少一行', () => {
    for (const g of confusableGroups) expect(tipLines(g.tip).length).toBeGreaterThan(0);
  });
});

describe('isKatakanaUnlocked', () => {
  it('清音 46 個全學過才解鎖', () => {
    expect(isKatakanaUnlocked([])).toBe(false);
    expect(isKatakanaUnlocked(hiraganaAll().slice(0, 45))).toBe(false);
    expect(isKatakanaUnlocked(hiraganaAll())).toBe(true);
  });

  it('未學（沒有 learnedAt）的進度不算', () => {
    const all = hiraganaAll();
    all[10] = { ...all[10], learnedAt: undefined };
    expect(isKatakanaUnlocked(all)).toBe(false);
  });
});

describe('availableGroups', () => {
  it('片假名組在解鎖前不出現，平假名組一律可用', () => {
    const hira = (ids: string[]) => ids.filter((id) => confusableGroupById(id)!.script === 'hiragana');
    const all = availableGroups([]).map((g) => g.id);
    expect(all.slice(0, 3)).toEqual(['nume', 'ruro', 'wanere']);
    expect(all).toEqual(hira(all));
    expect(availableGroups(hiraganaAll().slice(0, 45)).map((g) => g.id)).toEqual(all);
  });

  it('片假名組：解鎖前不出現；解鎖後只有成員查得到資料（至少 2 個）的才出現', () => {
    // 用平假名成員偽裝成片假名組，驗證「解鎖」這個條件
    const fake = { ...group('nume'), id: 'fake-kata', script: 'katakana' as const };
    expect(availableGroups(hiraganaAll().slice(0, 45), [fake])).toEqual([]);
    expect(availableGroups(hiraganaAll(), [fake]).map((g) => g.id)).toEqual(['fake-kata']);
    // 成員查不到資料（片假名資料尚未加入）→ 就算解鎖也不出現；資料加入後才會出現
    const unresolved = { ...group('nume'), id: 'ghost', members: ['k-ghost-1', 'k-ghost-2'] };
    expect(availableGroups(hiraganaAll(), [unresolved])).toEqual([]);
    const ids = availableGroups(hiraganaAll()).map((g) => g.id);
    expect(ids.slice(0, 3)).toEqual(['nume', 'ruro', 'wanere']);
  });
});

describe('sortGroupsByMisses', () => {
  it('答錯多的在前、同分維持預設順序、不改原陣列', () => {
    const groups = availableGroups([]);
    const before = groups.map((g) => g.id);
    const sorted = sortGroupsByMisses(groups, { ruro: 4, nume: 2, wanere: 2 });
    expect(sorted.map((g) => g.id).slice(0, 3)).toEqual(['ruro', 'nume', 'wanere']);
    expect(groups.map((g) => g.id)).toEqual(before);
    expect(sortGroupsByMisses(groups, {}).map((g) => g.id)).toEqual(before);
  });

  it('confusionCounts 把紀錄轉成 groupId → 次數', () => {
    expect(confusionCounts([{ groupId: 'nume', wrongCount: 3, updatedAt: 1 }])).toEqual({ nume: 3 });
  });
});

describe('groupsForWrongAnswer', () => {
  it('回傳該字所屬的組；不屬於任何組回傳空陣列', () => {
    expect(groupsForWrongAnswer('h-nu').map((g) => g.id)).toEqual(['nume']);
    expect(groupsForWrongAnswer('h-ne').map((g) => g.id)).toEqual(['wanere']);
    expect(groupsForWrongAnswer('k-tsu').map((g) => g.id)).toEqual(['shitsu']);
    // 一個字可以屬於好幾組：め 在 ぬ・め 和 の・め
    expect(groupsForWrongAnswer('h-me').map((g) => g.id)).toEqual(['nume', 'nome']);
    expect(groupsForWrongAnswer('h-i')).toEqual([]);
  });
});

describe('pickConfuseGroup', () => {
  const groups = availableGroups([]);
  const learnedAll = learnedOf('h-nu', 'h-me', 'h-ru', 'h-ro', 'h-wa', 'h-ne', 'h-re');

  it('只有至少 2 個成員已學的組才會被考慮', () => {
    expect(isConfuseEligible(group('nume'), learnedOf('h-nu'))).toBe(false);
    expect(isConfuseEligible(group('nume'), learnedOf('h-nu', 'h-me'))).toBe(true);
    // わねれ 只學了 1 個、るろ 學了 2 個 → 只會抽到るろ
    const learned = learnedOf('h-wa', 'h-ru', 'h-ro', 'h-nu');
    const rng = seededRng(7);
    for (let i = 0; i < 200; i++) {
      expect(pickConfuseGroup(groups, {}, learned, rng)?.id).toBe('ruro');
    }
  });

  it('沒有符合的組：undefined', () => {
    expect(pickConfuseGroup(groups, {}, learnedOf('h-nu', 'h-ru', 'h-wa'), seededRng(1))).toBeUndefined();
    expect(pickConfuseGroup(groups, {}, learnedOf(), seededRng(1))).toBeUndefined();
  });

  it('成員查不到資料時（片假名資料第三階段才有），就算 id 在已學集合裡也不會被選到', () => {
    const ghost = { ...group('shitsu'), id: 'ghost', members: ['k-ghost-1', 'k-ghost-2'] };
    expect(pickConfuseGroup([ghost], {}, learnedOf('k-ghost-1', 'k-ghost-2'), seededRng(1))).toBeUndefined();
  });

  it('答錯多的組被抽到的頻率較高（固定 seed、大量抽樣）', () => {
    const rng = seededRng(2026);
    const counts = { nume: 9, ruro: 0, wanere: 0 }; // 權重 10 : 1 : 1
    const hits: Record<string, number> = { nume: 0, ruro: 0, wanere: 0 };
    const N = 6000;
    for (let i = 0; i < N; i++) hits[pickConfuseGroup(groups, counts, learnedAll, rng)!.id] += 1;
    expect(hits.nume).toBeGreaterThan(hits.ruro * 5);
    expect(hits.nume).toBeGreaterThan(hits.wanere * 5);
    // 期望比例 10/12 ≈ 0.83
    expect(hits.nume / N).toBeGreaterThan(0.78);
    expect(hits.nume / N).toBeLessThan(0.88);
    // 答錯次數相同時三組機率相近
    const even: Record<string, number> = { nume: 0, ruro: 0, wanere: 0 };
    for (let i = 0; i < N; i++) even[pickConfuseGroup(groups, {}, learnedAll, rng)!.id] += 1;
    for (const id of Object.keys(even)) expect(Math.abs(even[id] / N - 1 / 3)).toBeLessThan(0.04);
  });
});

describe('buildConfuseQuestion', () => {
  it('選項是該組成員（わねれ 3 個、ぬめ 2 個），不補到 4 個；答案在選項裡；目標優先取已學字', () => {
    const learned = learnedOf('h-nu', 'h-wa', 'h-re');
    const rng = seededRng(3);
    for (let i = 0; i < 50; i++) {
      const q3 = buildConfuseQuestion(group('wanere'), learned, rng);
      expect([...q3.options].sort()).toEqual(['h-ne', 'h-re', 'h-wa']);
      expect(['h-wa', 'h-re']).toContain(q3.answerId); // ね 沒學過，不會被當目標
      expect(q3.kanaId).toBe(q3.answerId);
      expect(q3.type).toBe('confuse');
      expect(q3.groupId).toBe('wanere');
      const q2 = buildConfuseQuestion(group('nume'), learnedOf('h-nu', 'h-me'), rng);
      expect(q2.options).toHaveLength(2);
    }
  });

  it('avoid 內的目標盡量避開，沒得避開時才重複', () => {
    const learned = learnedOf('h-nu', 'h-me');
    const rng = seededRng(4);
    for (let i = 0; i < 20; i++) {
      expect(buildConfuseQuestion(group('nume'), learned, rng, new Set(['h-nu'])).answerId).toBe('h-me');
    }
    expect(['h-nu', 'h-me']).toContain(buildConfuseQuestion(group('nume'), learned, rng, new Set(['h-nu', 'h-me'])).answerId);
  });
});

const GAME_TYPES = ['findall', 'readseq', 'seq'];
const isGame = (q: { type: string }) => GAME_TYPES.includes(q.type);

describe('buildAutoPractice10', () => {
  it('沒有已學字：null', () => {
    expect(buildAutoPractice10([], {}, seededRng(1))).toBeNull();
  });

  it('沒有任何組有 2 個已學成員：不出 confuse 題，行為同簡版（5 個字 → 10 題 see／hear）', () => {
    const progress = ['h-a', 'h-i', 'h-u', 'h-e', 'h-ka', 'h-nu', 'h-ru'].map((i) => prog(i));
    const qs = buildAutoPractice10(progress, {}, seededRng(5))!;
    expect(qs).toHaveLength(AUTO_PRACTICE_SIZE);
    expect(qs.every((q) => q.type !== 'confuse')).toBe(true);
    for (const q of qs) {
      expect(q.options).toHaveLength(4);
      expect(q.options).toContain(q.answerId);
    }
  });

  it('已學字不足（沒有易混淆字組可用）：同一個字最多 2 題（兩種題型），總題數 = 2×字數', () => {
    const qs = buildAutoPractice10(['h-a', 'h-i', 'h-u'].map((i) => prog(i)), {}, seededRng(6))!;
    expect(qs).toHaveLength(6);
    for (const id of ['h-a', 'h-i', 'h-u']) {
      const types = qs.filter((q) => q.kanaId === id).map((q) => q.type).sort();
      expect(types).toEqual(['hear', 'see']);
    }
  });

  it('有可用的組：混入找不同系列題，看字選音、聽音選字也會出現，題目只用該組成員', () => {
    const ids = ['h-a', 'h-i', 'h-u', 'h-e', 'h-o', 'h-ka', 'h-ki', 'h-nu', 'h-me', 'h-ru', 'h-ro'];
    const progress = ids.map((i) => prog(i));
    const seen = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) {
      const qs = buildAutoPractice10(progress, {}, seededRng(seed))!;
      expect(qs).toHaveLength(AUTO_PRACTICE_SIZE);
      const games = qs.filter(isGame);
      expect(games.length).toBeGreaterThanOrEqual(3);
      expect(games.length).toBeLessThanOrEqual(6);
      // 同一種題型最多 2 題
      const perType: Record<string, number> = {};
      for (const q of qs) perType[q.type] = (perType[q.type] ?? 0) + 1;
      expect(Math.max(...Object.values(perType))).toBeLessThanOrEqual(2);
      for (const q of games) {
        const g = group(q.groupId!);
        expect(g.members).toContain(q.answerId);
        // 找出所有、聽音選字串會混入同一種文字的其他字組當干擾；念出一串只用該組成員
        if (q.type === 'readseq') for (const id of q.sequence ?? []) expect(g.members).toContain(id);
        for (const id of q.options) expect(id.startsWith('h-')).toBe(true);
      }
      qs.forEach((q) => seen.add(q.type));
      // 同一個字不相鄰
      for (let i = 1; i < qs.length; i++) expect(qs[i].kanaId).not.toBe(qs[i - 1].kanaId);
    }
    expect([...seen].sort()).toEqual(['findall', 'hear', 'maskhalf', 'readseq', 'recall', 'see', 'seq']);
  });

  it('片假名組在解鎖前不會出現在任何題目（即使答錯紀錄很多）', () => {
    const progress = ['h-a', 'h-i', 'h-nu', 'h-me', 'h-ru', 'h-ro', 'h-wa', 'h-ne', 'h-re'].map((i) => prog(i));
    for (let seed = 1; seed <= 60; seed++) {
      const qs = buildAutoPractice10(progress, { shitsu: 99, son: 99, nume: 1 }, seededRng(seed))!;
      for (const q of qs) {
        expect(q.groupId === 'shitsu' || q.groupId === 'son').toBe(false);
        expect(q.options.some((o) => o.startsWith('k-'))).toBe(false);
      }
    }
  });

  it('答錯多的組在整輪題目中出現較多（固定 seed、多輪統計）', () => {
    const ids = ['h-nu', 'h-me', 'h-ru', 'h-ro', 'h-wa', 'h-ne', 'h-re', 'h-a', 'h-i', 'h-u', 'h-e', 'h-o'];
    const progress = ids.map((i) => prog(i));
    const hits: Record<string, number> = { nume: 0, ruro: 0, wanere: 0 };
    for (let seed = 1; seed <= 300; seed++) {
      for (const q of buildAutoPractice10(progress, { nume: 12 }, seededRng(seed))!) {
        if (isGame(q)) hits[q.groupId!] += 1;
      }
    }
    expect(hits.nume).toBeGreaterThan(hits.ruro * 2);
    expect(hits.nume).toBeGreaterThan(hits.wanere * 2);
  });
});

describe('buildQuickConfuse10', () => {
  it('10 題，找出所有、念出一串、聽音選字串、遮一半猜字、看字選音、聽音選字，同一題型最多 2 題，答案字限該組成員', () => {
    for (const id of ['nume', 'wanere']) {
      const g = group(id);
      const qs = buildQuickConfuse10(g, seededRng(11));
      expect(qs).toHaveLength(10);
      expect(qs.map((q) => q.id)).toEqual(Array.from({ length: 10 }, (_, i) => `q-${i}`));
      const perType: Record<string, number> = {};
      for (const q of qs) {
        expect([...GAME_TYPES, 'maskhalf', 'see', 'confuse']).toContain(q.type);
        expect(g.members).toContain(q.answerId);
        expect(q.groupId).toBe(id);
        if (q.type === 'readseq') for (const m of q.sequence ?? []) expect(g.members).toContain(m);
        if (q.type === 'see' || q.type === 'confuse') for (const o of q.options) expect(g.members).toContain(o);
        perType[q.type] = (perType[q.type] ?? 0) + 1;
      }
      // 六種題型：每種 1～2 題
      expect(Object.keys(perType).sort()).toEqual(['confuse', 'findall', 'maskhalf', 'readseq', 'see', 'seq']);
      expect(Math.max(...Object.values(perType))).toBe(2);
      expect(Math.min(...Object.values(perType))).toBeGreaterThanOrEqual(1);
    }
  });

  it('目標字在組內輪流（每個字都會被考到、次數相差最多 1）且同一個字不相鄰', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const qs = buildQuickConfuse10(group('wanere'), seededRng(seed));
      const n: Record<string, number> = {};
      qs.forEach((q) => (n[q.kanaId] = (n[q.kanaId] ?? 0) + 1));
      const values = Object.values(n);
      expect(Object.keys(n).sort()).toEqual(['h-ne', 'h-re', 'h-wa']);
      expect(Math.max(...values) - Math.min(...values)).toBeLessThanOrEqual(1);
      for (let i = 1; i < qs.length; i++) expect(qs[i].kanaId).not.toBe(qs[i - 1].kanaId);
    }
  });

  it('成員查不到資料時回傳空陣列，不丟錯', () => {
    const ghost = { ...group('shitsu'), id: 'ghost', members: ['k-ghost-1', 'k-ghost-2'] };
    expect(buildQuickConfuse10(ghost, seededRng(1))).toEqual([]);
  });
});

describe('片假名階段的易混淆字（資料加入後）', () => {
  const kataIds = (...c: string[]) => c.map((x) => `k-${x}`);

  it('シ・ツ、ソ・ン 的 4 個字都查得到資料，resolvedMembers 完整', () => {
    for (const id of ['shitsu', 'son']) expect(group(id).members.every((m) => byId(m))).toBe(true);
  });

  it('平假名清音學完前不出現；學完後兩個片假名組都出現（預設順序：平假名 3 組之後）', () => {
    const before = availableGroups(hiraganaAll().slice(0, 45)).map((g) => g.id);
    expect(before.slice(0, 3)).toEqual(['nume', 'ruro', 'wanere']);
    expect(before).not.toContain('shitsu');
    const after = availableGroups(hiraganaAll()).map((g) => g.id);
    expect(after).toEqual(expect.arrayContaining(['shitsu', 'son']));
    expect(after.indexOf('shitsu')).toBeGreaterThan(after.indexOf('wanere'));
  });

  it('片假名字答錯會累計到所屬的組', () => {
    expect(groupsForWrongAnswer('k-shi').map((g) => g.id)).toEqual(['shitsu']);
    expect(groupsForWrongAnswer('k-tsu').map((g) => g.id)).toEqual(['shitsu']);
    expect(groupsForWrongAnswer('k-so').map((g) => g.id)).toEqual(['son']);
    expect(groupsForWrongAnswer('k-n').map((g) => g.id)).toEqual(['son']);
    expect(groupsForWrongAnswer('k-a')).toEqual([]);
  });

  it('組內至少 2 個已學才會出 confuse 題：只學 シ → 不可；學 シ ツ → 可', () => {
    expect(isConfuseEligible(group('shitsu'), learnedOf('k-shi'))).toBe(false);
    expect(isConfuseEligible(group('shitsu'), learnedOf('k-shi', 'k-tsu'))).toBe(true);
    expect(pickConfuseGroup([group('shitsu'), group('son')], {}, learnedOf('k-so', 'k-n'), seededRng(1))?.id).toBe('son');
  });

  it('自動練習：學了 シ ツ ソ ン 後，片假名組的 confuse 題會出現，選項限該組成員', () => {
    const progress = [...hiraganaAll(), ...kataIds('shi', 'tsu', 'so', 'n', 'a', 'i').map((i) => prog(i))];
    const groupsSeen = new Set<string>();
    for (let seed = 1; seed <= 80; seed++) {
      for (const q of buildAutoPractice10(progress, { shitsu: 5, son: 5 }, seededRng(seed))!) {
        if (!isGame(q)) continue;
        const g = group(q.groupId!);
        groupsSeen.add(g.id);
        expect(g.members).toContain(q.answerId);
      }
    }
    expect(groupsSeen.has('shitsu')).toBe(true);
    expect(groupsSeen.has('son')).toBe(true);
  });

  it('自動練習：片假名已學 シ ツ 但平假名還沒學完，片假名組仍不出現（需要先解鎖）', () => {
    const progress = [...hiraganaAll().slice(0, 40), ...kataIds('shi', 'tsu').map((i) => prog(i))];
    for (let seed = 1; seed <= 30; seed++) {
      for (const q of buildAutoPractice10(progress, { shitsu: 99 }, seededRng(seed))!) {
        expect(q.groupId === 'shitsu').toBe(false);
      }
    }
  });

  it('快速辨識 シ・ツ：10 題，選項只有 シ ツ', () => {
    const qs = buildQuickConfuse10(group('shitsu'), seededRng(3));
    expect(qs).toHaveLength(10);
    for (const q of qs) {
      expect(['k-shi', 'k-tsu']).toContain(q.answerId);
      if (q.type === 'see' || q.type === 'confuse') expect([...q.options].sort()).toEqual(['k-shi', 'k-tsu']);
      if (q.type === 'readseq') for (const m of q.sequence ?? []) expect(['k-shi', 'k-tsu']).toContain(m);
    }
  });

  it('自動練習含讀外來語題：只抽可讀詞；沒有可讀詞時行為與之前完全相同', () => {
    const base = hiraganaAll();
    const kata10 = kataIds('a', 'i', 'u', 'e', 'o', 'ka', 'ki', 'ku', 'ke', 'ko').map((i) => prog(i));
    const readable = new Set(readableLoanwords(kata10.map((p) => p.kanaId)).map((w) => w.id));
    for (let seed = 1; seed <= 40; seed++) {
      const qs = buildAutoPractice10([...base, ...kata10], {}, seededRng(seed))!;
      expect(qs).toHaveLength(AUTO_PRACTICE_SIZE);
      const lw = qs.filter((q) => q.type === 'wordread');
      expect(lw.length).toBeGreaterThanOrEqual(1);
      expect(lw.length).toBeLessThanOrEqual(2);
      for (const q of lw) expect(readable.has(q.wordId!)).toBe(true);
      expect(qs.map((q) => q.id)).toEqual(qs.map((_, i) => `q-${i}`));
    }
    // 只學平假名：沒有 loanword 題
    for (let seed = 1; seed <= 20; seed++) {
      expect(buildAutoPractice10(base, {}, seededRng(seed))!.some((q) => q.type === 'wordread')).toBe(false);
    }
  });
});

describe('topConfusionGroups（練習頁只放最常搞混的 3 組）', () => {
  const hira = () => availableGroups(hiraganaAll().slice(0, 10));
  const all = () => availableGroups(hiraganaAll());

  it('沒有答錯紀錄：預設 ぬ・め、る・ろ、シ・ツ', () => {
    expect(topConfusionGroups(all(), {}).map((g) => g.id)).toEqual(['nume', 'ruro', 'shitsu']);
  });

  it('片假名還沒解鎖時沒有 シ・ツ，用 わ・ね・れ 補上', () => {
    expect(topConfusionGroups(hira(), {}).map((g) => g.id)).toEqual(['nume', 'ruro', 'wanere']);
  });

  it('答錯多的組排前面；同分依預設順序', () => {
    expect(topConfusionGroups(all(), { son: 5, wanere: 2 }).map((g) => g.id)).toEqual(['son', 'wanere', 'nume']);
    expect(topConfusionGroups(all(), { shitsu: 1, ruro: 1 }).map((g) => g.id)).toEqual(['ruro', 'shitsu', 'nume']);
  });

  it('數量參數；不改動傳入的陣列', () => {
    const groups = all();
    const before = groups.map((g) => g.id);
    expect(topConfusionGroups(groups, {}, 2)).toHaveLength(2);
    expect(topConfusionGroups(groups, {}, 99)).toHaveLength(groups.length);
    expect(groups.map((g) => g.id)).toEqual(before);
  });
});

describe('groupsByTab（完整目錄的分類）', () => {
  it('依文字分成平假名、片假名；沒有組的分類不出現', () => {
    const tabs = groupsByTab(availableGroups(hiraganaAll()));
    expect(tabs.map((t) => t.tab)).toEqual(['hiragana', 'katakana']);
    expect(tabs[0].groups.map((g) => g.id).slice(0, 3)).toEqual(['nume', 'ruro', 'wanere']);
    expect(tabs[0].groups.length).toBeGreaterThan(3);
    expect(tabs[1].groups.map((g) => g.id).slice(0, 2)).toEqual(['shitsu', 'son']);
    expect(tabs[0].groups.every((g) => g.script === 'hiragana')).toBe(true);
    expect(tabs[1].groups.every((g) => g.script === 'katakana')).toBe(true);
    // 片假名還沒解鎖：只有平假名分類
    expect(groupsByTab(availableGroups(hiraganaAll().slice(0, 10))).map((t) => t.tab)).toEqual(['hiragana']);
  });
});

describe('默寫自我檢查（recall）進自動練習', () => {
  it('有易混淆字組可用時會出現；題目對應一個已學字，沒有選項', () => {
    const ids = ['h-a', 'h-i', 'h-u', 'h-e', 'h-o', 'h-nu', 'h-me', 'h-ru', 'h-ro'];
    const progress = ids.map((i) => prog(i));
    let seen = 0;
    for (let seed = 1; seed <= 60; seed++) {
      for (const q of buildAutoPractice10(progress, {}, seededRng(seed))!) {
        if (q.type !== 'recall') continue;
        seen++;
        expect(ids).toContain(q.kanaId);
        expect(q.answerId).toBe(q.kanaId);
        expect(q.options).toEqual([]);
      }
    }
    expect(seen).toBeGreaterThan(30);
  });

  it('剛開始學（沒有易混淆字組可用）時不出 recall／maskhalf', () => {
    const progress = ['h-a', 'h-i', 'h-u', 'h-e', 'h-ka'].map((i) => prog(i));
    for (let seed = 1; seed <= 30; seed++) {
      expect(buildAutoPractice10(progress, {}, seededRng(seed))!.every((q) => q.type === 'see' || q.type === 'hear')).toBe(true);
    }
  });
});

describe('planTypes（一輪裡同一題型最多 2 題）', () => {
  it('題型夠多（5 種以上）時每種最多 2 題，總數剛好 10', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const plan = planTypes(['a', 'b', 'c', 'd', 'e'], 10, seededRng(seed));
      expect(plan).toHaveLength(10);
      const n: Record<string, number> = {};
      plan.forEach((t) => (n[t] = (n[t] ?? 0) + 1));
      expect(Object.values(n)).toEqual([2, 2, 2, 2, 2]);
    }
  });

  it('6 種題型：每種 1～2 題；題型比較少時平均分配（各種題數最多差 1）', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const six = planTypes(['a', 'b', 'c', 'd', 'e', 'f'], 10, seededRng(seed));
      const n6: Record<string, number> = {};
      six.forEach((t) => (n6[t] = (n6[t] ?? 0) + 1));
      expect(Math.max(...Object.values(n6))).toBe(2);
      expect(Math.min(...Object.values(n6))).toBe(1);
      const three = planTypes(['a', 'b', 'c'], 10, seededRng(seed));
      const n3 = ['a', 'b', 'c'].map((t) => three.filter((x) => x === t).length);
      expect(Math.max(...n3) - Math.min(...n3)).toBeLessThanOrEqual(1);
    }
  });

  it('沒有可用題型回傳空陣列', () => {
    expect(planTypes([], 10, seededRng(1))).toEqual([]);
  });
});
