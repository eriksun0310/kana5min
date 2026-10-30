import { confusableGroups } from '../confusables';
import { mnemonicOf, mnemonics } from '../mnemonics';
import { strokesOf } from '../strokes';
import { mustById } from '..';

describe('mnemonics', () => {
  it('每個易混淆組都有一筆，成員與組一致', () => {
    for (const g of confusableGroups) {
      const m = mnemonicOf(g.id);
      expect(m).toBeDefined();
      expect(m!.members.map((x) => x.id)).toEqual(g.members);
    }
    expect(mnemonics.length).toBe(confusableGroups.length);
  });

  it('沒標待補的組，每個字都有一句話、整組有怎麼分', () => {
    for (const m of mnemonics.filter((x) => !x.pending)) {
      expect(m.howToTell.length).toBeGreaterThan(0);
      for (const mem of m.members) expect(mem.line.length).toBeGreaterThan(0);
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
