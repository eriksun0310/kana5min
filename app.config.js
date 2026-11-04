// xprem OTA 動態設定（原本只有 app.json 的專案）。
// app.json 保留不動，作為 config 基底；這裡只覆蓋 updates。
// DISABLE_CODE_SIGNING 只給本機 dev server 用，正式 build 的環境不可設定。
export default ({ config }) => ({
  ...config,
  updates: {
    url: 'https://ota.moushih.com/manifest',
    codeSigningMetadata: process.env.DISABLE_CODE_SIGNING
      ? undefined
      : { keyid: 'main', alg: 'rsa-v1_5-sha256' },
    codeSigningCertificate: process.env.DISABLE_CODE_SIGNING
      ? undefined
      : './certs/certificate.pem',
    enabled: true,
    requestHeaders: {
      // build / publish 時由 RELEASE_CHANNEL 決定；沒帶時這個 header 會消失
      'expo-channel-name': process.env.RELEASE_CHANNEL,
      // 這個 App 在 xprem Dashboard 的 App ID（不是 EAS projectId）
      'expo-app-id': '3efbec25-f9c9-4097-8865-82ffbcb6e3bb',
      // 留空：由 Dashboard 的 Channel → Branch 對應決定
      'xprem-branch': '',
    },
  },
});
