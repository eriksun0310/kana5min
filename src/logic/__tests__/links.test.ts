import { SUSHI_JP_APP_STORE_URL, SUSHI_JP_PLAY_STORE_URL } from '../../config';
import { isHttpUrl, sushiStoreLink } from '../links';

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

  it('壽司日檢的兩個商店連結都是正式連結，不是佔位字串', () => {
    expect(isHttpUrl(SUSHI_JP_APP_STORE_URL)).toBe(true);
    expect(SUSHI_JP_APP_STORE_URL).toBe('https://apps.apple.com/app/id6774095306');
    expect(isHttpUrl(SUSHI_JP_PLAY_STORE_URL)).toBe(true);
    expect(SUSHI_JP_PLAY_STORE_URL).toContain('id=com.ptalk.sushijp');
  });
});

describe('sushiStoreLink', () => {
  const urls = { appStore: SUSHI_JP_APP_STORE_URL, playStore: SUSHI_JP_PLAY_STORE_URL };

  it('iOS 開 App Store', () => {
    expect(sushiStoreLink('ios', urls)).toEqual({ url: SUSHI_JP_APP_STORE_URL, storeName: 'App Store' });
  });

  it('Android 開 Google Play', () => {
    expect(sushiStoreLink('android', urls)).toEqual({
      url: SUSHI_JP_PLAY_STORE_URL,
      storeName: 'Google Play',
    });
  });

  it('其他平台（例如 web）預設用 App Store', () => {
    expect(sushiStoreLink('web', urls).storeName).toBe('App Store');
  });
});
