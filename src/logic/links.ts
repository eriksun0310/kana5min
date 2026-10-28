/** 是否為可以交給 Linking.openURL 的網址（http 或 https 開頭）。佔位字串（例如 `[壽司日檢 App Store 連結]`）回傳 false。 */
export function isHttpUrl(value: string): boolean {
  return /^https?:\/\/\S+$/i.test(value.trim());
}

export interface SushiStoreLink {
  url: string;
  /** 商店名稱，用在按鈕與錯誤提示文字 */
  storeName: 'App Store' | 'Google Play';
}

/** 依平台選壽司日檢的商店連結：Android 開 Google Play，其餘（iOS）開 App Store。 */
export function sushiStoreLink(
  os: string,
  urls: { appStore: string; playStore: string },
): SushiStoreLink {
  return os === 'android'
    ? { url: urls.playStore, storeName: 'Google Play' }
    : { url: urls.appStore, storeName: 'App Store' };
}
