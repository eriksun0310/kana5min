import { pressSeeOption } from '../quizSee';

describe('pressSeeOption（看字選音的點選）', () => {
  const start = { selected: null, heard: [] as number[] };

  it('第一次點選項：播放、暫選、記為已聽', () => {
    expect(pressSeeOption(start, 2, false)).toEqual({ selected: 2, heard: [2], play: true });
  });

  it('再點同一個選項：只會重播，不會確定（仍是暫選、已聽不重複）', () => {
    const first = pressSeeOption(start, 1, false);
    const again = pressSeeOption(first, 1, false);
    expect(again).toEqual({ selected: 1, heard: [1], play: true });
  });

  it('改點別的選項：換成新的暫選，之前聽過的保留', () => {
    const a = pressSeeOption(start, 0, false);
    const b = pressSeeOption(a, 3, false);
    expect(b).toEqual({ selected: 3, heard: [0, 3], play: true });
  });

  it('已經作答後：不播放、狀態不變', () => {
    const state = { selected: 1, heard: [1] };
    expect(pressSeeOption(state, 2, true)).toEqual({ selected: 1, heard: [1], play: false });
  });
});

import { revealTag } from '../quizSee';

describe('revealTag（揭曉標記）', () => {
  it('正確答案：顯示「う (u)」', () => {
    expect(revealTag('answer', 'う', 'u', true)).toEqual({ kana: 'う', text: ' (u)' });
  });

  it('正確答案且拼音淡出：假名仍在，只隱藏拼音', () => {
    expect(revealTag('answer', 'う', 'u', false)).toEqual({ kana: 'う', text: '' });
  });

  it('選錯：一律顯示拼音，即使已淡出', () => {
    expect(revealTag('wrong', 'さ', 'sa', false)).toEqual({ kana: 'さ', text: ' (sa)' });
  });

  it('其他選項：假名＋拼音；拼音淡出時只有假名；片假名同理', () => {
    expect(revealTag('plain', 'ア', 'a', true)).toEqual({ kana: 'ア', text: ' (a)' });
    expect(revealTag('plain', 'ア', 'a', false)).toEqual({ kana: 'ア', text: '' });
  });
});
