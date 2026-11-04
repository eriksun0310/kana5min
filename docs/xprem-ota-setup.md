# xprem OTA 佈建紀錄

- 伺服器：`https://ota.moushih.com`
- App ID：`3efbec25-f9c9-4097-8865-82ffbcb6e3bb`
- Branch / Channel：`production` / `production`
- 憑證：certs/certificate.pem
- API Key：app-local-publish（已寫入 .env）
- 執行時間：2026-11-04T11:37:01+08:00

下一步：接著跑 `xprem-ota-onboard` skill
完成 app.config.js / eas.json / scripts/ota.mjs 等專案端設定。

## ota.mjs 渲染用佔位符（onboard 步驟 9 直接複製）

```
--set SERVER_URL=https://ota.moushih.com BRANCH=production CHANNEL=production
```
