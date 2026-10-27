import { SUSHI_JP_APP_STORE_URL } from '../../config';
import { isHttpUrl } from '../links';

describe('isHttpUrl', () => {
  it('http、https 網址回傳 true', () => {
    expect(isHttpUrl('https://apps.apple.com/tw/app/id123456789')).toBe(true);
    expect(isHttpUrl('http://example.com')).toBe(true);
    expect(isHttpUrl('HTTPS://example.com/a?b=c')).toBe(true);
  });

  it('佔位字串、空字串、其他 scheme 回傳 false', () => {
    expect(isHttpUrl('[壽司日檢 App Store 連結]')).toBe(false);
    expect(isHttpUrl('')).toBe(false);
    expect(isHttpUrl('itms-apps://apps.apple.com/app/id1')).toBe(false);
    expect(isHttpUrl('https://')).toBe(false);
    expect(isHttpUrl('see https://example.com')).toBe(false);
  });

  it('目前的設定常數是佔位字串（上架前要換成真實連結）', () => {
    expect(SUSHI_JP_APP_STORE_URL.startsWith('[')).toBe(true);
    expect(isHttpUrl(SUSHI_JP_APP_STORE_URL)).toBe(false);
  });
});
