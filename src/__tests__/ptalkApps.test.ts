import { PTALK_APPS, graduateRecommendation, listOtherApps, storeLinkFor } from '../content/ptalkApps';

describe('ptalkApps', () => {
  it('未上架與自己都不列出', () => {
    const ids = listOtherApps().map((a) => a.id);
    expect(ids).not.toContain('kana5min');
    expect(ids).not.toContain('kaitensushi');
    expect(ids).toHaveLength(6);
  });
  it('分組', () => {
    expect(listOtherApps('jp').map((a) => a.id)).toEqual(['sushijp', 'ninbato', 'hitofude']);
    expect(listOtherApps('en')).toHaveLength(3);
  });
  it('推薦壽司日檢，依平台給連結', () => {
    const app = graduateRecommendation()!;
    expect(app.id).toBe('sushijp');
    expect(storeLinkFor('ios', app).storeName).toBe('App Store');
    expect(storeLinkFor('android', app).url).toContain('com.ptalk.sushijp');
  });
  it('Android 連結格式一致', () => {
    for (const a of PTALK_APPS) expect(a.androidUrl).toMatch(/^https:\/\/play\.google\.com\/store\/apps\/details\?id=com\.ptalk\./);
  });
});
