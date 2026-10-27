/** 是否為可以交給 Linking.openURL 的網址（http 或 https 開頭）。佔位字串（例如 `[壽司日檢 App Store 連結]`）回傳 false。 */
export function isHttpUrl(value: string): boolean {
  return /^https?:\/\/\S+$/i.test(value.trim());
}
