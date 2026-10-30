import { confusableGroups } from '../confusables';
import { mnemonicOf, mnemonics } from '../mnemonics';
import { strokesOf } from '../strokes';
import { mustById } from '..';

describe('mnemonics', () => {
  it('有記法資料的組：對應到存在的易混淆組，成員一致（沒有資料的組面板只列字與諧音）', () => {
    for (const m of mnemonics) {
      const g = confusableGroups.find((x) => x.id === m.groupId);
      expect(g).toBeDefined();
      expect(m.members.map((x) => x.id)).toEqual(g!.members);
      expect(mnemonicOf(g!.id)).toBe(m);
    }
    expect(mnemonics.length).toBeGreaterThanOrEqual(5);
  });

  it('每個組有怎麼分的一句話，每個字至少有紅色標記或差異提示', () => {
    for (const m of mnemonics) {
      expect(m.howToTell.length).toBeGreaterThan(0);
      for (const mem of m.members) expect(mem.cue || mem.marks?.length).toBeTruthy();
    }
  });

  it('紅色標記的筆畫編號都存在於筆畫資料', () => {
    for (const m of mnemonics) {
      for (const mem of m.members) {
        const data = strokesOf(mustById(mem.id).char);
        for (const mark of mem.marks ?? []) {
          if (mark.kind === 'strokes') {
            for (const i of mark.indexes) expect(data!.strokes[i]).toBeDefined();
          }
        }
      }
    }
  });
});
