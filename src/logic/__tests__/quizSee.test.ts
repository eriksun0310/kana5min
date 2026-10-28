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
