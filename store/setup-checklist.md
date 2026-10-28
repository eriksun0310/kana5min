# 後台設定清單與進度

這些項目只跟已確定的商業模式有關。狀態依 PROGRESS.md「商店後台設定進度」，2026-10-28 更新。

## App Store Connect

- [x] App ID `com.ptalk.kana5min` 已註冊（含 In-App Purchase）
- [x] App 已建立（Apple ID 6827398112，SKU `kana5min`），主要語言繁體中文
- [x] 非消耗型內購 `com.ptalk.kana5min.punpack`，NT$90（文字見 app-store.md），已建立
- [x] App 隱私已發佈（見 privacy-labels.md）
- [x] 後台的名稱、副標、描述已改成最新文字（見 app-store.md；上架名稱「日文五十音｜白爛諧音記憶法」；草稿狀態，尚未送審）
- [ ] 內購審查截圖換成目前紅色版買斷頁（目前上傳的是舊琥珀色），送審時對內購按「新增以供審查」
- [ ] App 審查聯絡人資料、iOS 截圖（6.9 吋，見 screenshots.md）、build
- [ ] 確認付費 App 協議（Paid Apps Agreement）與稅務／銀行資料

## Google Play Console

- [x] 應用程式已建立（免費、`com.ptalk.kana5min`），應用程式內容 10 項已完成（隱私權政策、廣告＝是、目標對象 13 歲以上、資料安全性、內容分級等）
- [x] 商店資訊：512 圖示與 1024×500 主題圖已於 2026-10-28 上傳並存為草稿（檔案在 `store/graphics/`）
- [ ] 商店資訊：手機截圖（至少 2 張，需用 6.9 吋模擬器重截，見 screenshots.md）
- [x] 應用程式內產品 `com.ptalk.kana5min.punpack`（NT$90）已於 2026-10-28 在後台建立（需要先有含 Billing 權限的版本才能建立；PROGRESS.md 的 10-27 紀錄尚未更新這點）
- [ ] 付款資料（Google 付款資料）

## RevenueCat（project `81be02cb`，名稱 Kana 5min）

- [x] iOS App 與 Android App 已加入
- [x] Entitlement `pun_pack`、product `com.ptalk.kana5min.punpack`、offering `default`（lifetime package）
- [ ] Play Store App 上傳 service account JSON
- [ ] 把 iOS／Android 公開 SDK key 設成 EAS 環境變數 `EXPO_PUBLIC_RC_IOS_KEY`、`EXPO_PUBLIC_RC_ANDROID_KEY`

## AdMob（發布商 pub-7018554061213551）

不使用橫幅與插頁廣告，只需要獎勵廣告單元；所有請求固定非個人化，不要求 ATT。

- [x] iOS、Android 各一個 App（名稱 Kana 5min）
- [x] 獎勵廣告單元已於 2026-10-28 建立（`ios-rewarded`、`android-rewarded`，ID 見 admob-ids.md）。App 內設成 EAS 環境變數 `EXPO_PUBLIC_ADMOB_REWARDED_IOS`、`EXPO_PUBLIC_ADMOB_REWARDED_ANDROID`
- 既有的 Banner 與 Interstitial 單元不會用到，不必刪除，也不要填進環境變數
- [ ] 帳號層級付款資料
- [ ] 「隱私權與訊息」建立 GDPR 訊息（供 UMP 同意表單使用）；**不需要** IDFA／ATT 訊息
- [ ] 上架後在 AdMob 把兩個 App 連結到商店
