# Goal 05：好笑記憶包內購、AdMob 廣告與雙平台上架資料

## 目標

在 goals/01～04 完成的基礎上，加入三件事：用 RevenueCat 做「好笑記憶包」買斷內購、用 AdMob 加入獎勵廣告解鎖，以及準備好 App Store 與 Google Play 上架需要填寫的所有資料。

這個階段結束後，開發者只需要到 RevenueCat、AdMob、App Store Connect、Google Play Console 建立項目、填入金鑰，並把 `store/` 裡的文字貼到後台即可。

## 本階段對 CLAUDE.md 的例外

CLAUDE.md 寫的「不要加入追蹤或分析 SDK」與「不要實作好笑記憶包付費機制」，在本階段改為：允許加入 RevenueCat（`react-native-purchases`）與 AdMob（`react-native-google-mobile-ads`，含 UMP 同意表單），並實作 spec 第 6 節與設計檔 F1～F5。不使用 `expo-tracking-transparency`、不要求 ATT。除此之外的規則照舊，尤其不能把金鑰寫進程式碼、不能登入任何後台、不能 push。

## 參考

spec.md 第 6 節、`kana-puns.md`、設計檔 F1～F5（不在 `design/` 裡的畫面，依 spec 第 4 節的描述與 C2 系列的元件風格實作）。

## 一、好笑記憶包（RevenueCat）

內購項目為一個非消耗型產品，product id 為 `com.ptalk.kana5min.punpack`，RevenueCat entitlement 為 `pun_pack`。iOS 與 Android 的 RevenueCat public SDK key 從環境變數讀取（`EXPO_PUBLIC_RC_IOS_KEY`、`EXPO_PUBLIC_RC_ANDROID_KEY`），並建立 `.env.example`。

免費範圍為あ行與か行的諧音梗，其他假名在未購買時顯示 F2 的模糊預告卡片，點擊進入 F3 買斷頁。購買後立即解鎖全部諧音梗，並支援恢復購買。購買狀態以 RevenueCat 為準，本機快取一份，離線時依快取判斷。

諧音梗內容讀取 `kana-puns.md`，轉成 App 內的 JSON 資料。片假名與平假名同音共用同一句。

## 二、AdMob 廣告

現行設計（spec 6.2、docs/architecture.md 第 12 節）是「只用獎勵廣告」：不做橫幅、不做插頁、不要求 ATT。使用者在學新字或字詳情頁點「解鎖諧音」後，主動看一支獎勵廣告，永久解鎖 3 個讀音；買斷好笑記憶包後不再出現廣告入口。所有廣告請求固定 `requestNonPersonalizedAdsOnly: true`。

開發與測試一律使用 AdMob 官方測試廣告單元（`__DEV__` 用 `TestIds.REWARDED`）。正式的獎勵廣告單元 ID 從環境變數 `EXPO_PUBLIC_ADMOB_REWARDED_IOS`／`EXPO_PUBLIC_ADMOB_REWARDED_ANDROID` 讀取，App ID 透過 `react-native-google-mobile-ads` 的 config plugin 寫入 app.json，並在 `.env.example` 列出所需變數。

第一次要顯示廣告前先跑 UMP 同意流程（`AdsConsent.gatherConsent()`），失敗就略過。設定頁在需要時顯示「隱私權選項」入口，可重新開啟同意表單。

## 三、雙平台上架資料

`store/app-store.md`、`store/google-play.md`、`store/setup-checklist.md` 已經有開發者準備的初稿：保留原本的文案與已決定的設定（名稱、產品 ID、價格 NT$90），只依照實際做出來的功能修正不符合的地方並補上缺少的欄位，不要整份重寫。在 `store/` 資料夾完成下列檔案，所有內容以繁體中文（台灣）撰寫，字數必須符合各平台限制，並在檔案中標示字數：

`store/app-store.md`：App 名稱（商店上架名稱「日文五十音｜白爛諧音記憶法」，手機上顯示「諧音五十音」）、副標題（30 字內）、宣傳文字（170 字內）、描述、關鍵字（100 字元內，以逗號分隔）、類別（教育）、年齡分級問卷的建議答案、App 隱私權營養標籤的建議填法（依實際使用的 RevenueCat 與 AdMob 蒐集項目）、App 內購項目的參考名稱與描述、審查備註。

`store/google-play.md`：應用程式名稱（30 字內）、簡短說明（80 字內）、完整說明（4000 字內）、類別、內容分級問卷建議答案、資料安全性表單的建議填法、目標對象建議設定、廣告聲明、應用程式內產品的名稱與說明。

`store/privacy-policy.md`：隱私權政策全文，說明學習紀錄只存在裝置上、廣告與內購由 AdMob 與 RevenueCat 處理及其蒐集的資料、聯絡方式（佔位 `[聯絡信箱]`）。網址佔位為 `[隱私權政策網址]`。

`store/screenshots.md`：兩個平台各需要的截圖尺寸，以及建議使用哪些畫面、每張截圖上的標語。建議畫面指向 `screenshots/` 內現有檔案（不複製、不另外產生）。

目標對象一律設定為非兒童導向（13 歲以上），避免觸發兒童相關的廣告政策，並在 PROGRESS.md 說明理由。

## 完成條件

狀態標記於 2026-10-28 補上。`[x]` 有程式與測試或 Maestro 證據；`[ ]` 附註還缺什麼。

- [x] RevenueCat 已整合（`src/monetization/purchases.ts`、`purchases.test.ts`），未購買時 F2 預告卡片與 F3 買斷頁正常顯示（phase5-puns 通過），購買與恢復購買流程程式完整；金鑰來自環境變數。
  - [ ] 沙盒購買與恢復購買的實測：需開發者實機驗證（RevenueCat SDK key 尚未設成 EAS 環境變數）
- [x] 購買後全部諧音梗解鎖，F4 總覽與 F5 分享卡（1080×1080 PNG，跟隨主題，系統分享面板，詳見 spec 6.4）可用（phase5-puns、phase5-share 通過），購買狀態由 settingsStore persist，離線時依本機快取判斷
- [x] 諧音梗資料由 `kana-puns.md` 轉成 `src/data/puns.ts`（`scripts/gen-puns.mjs`，單元測試檢查同步），あ行與か行免費，其他鎖定
- [x] 獎勵廣告：只在使用者主動點「解鎖諧音」後顯示，看完永久解鎖 3 個讀音；不做橫幅、不做插頁、不要求 ATT（已取代原本的橫幅與插頁條目）
- [x] 購買好笑記憶包後不再出現獎勵廣告入口，也不會呼叫 `showRewardedAd`：判斷邏輯抽成 `punCardState`／`canWatchRewardedAd`（src/logic/punUnlock.ts），單元測試覆蓋；PunCard 與解鎖面板都使用它
- [x] 開發版本使用 AdMob 測試廣告單元（`__DEV__` 用 `TestIds.REWARDED`），正式獎勵廣告 ID 來自環境變數，`.env.example` 已列出所有變數
- [x] 所有廣告請求固定非個人化；UMP 同意表單保留（`AdsConsent.gatherConsent()`）；設定頁有「隱私權選項」入口（見第五階段收尾）
  - [ ] UMP 訊息本身尚未在 AdMob「隱私權與訊息」建立（GDPR 訊息），需開發者在後台完成
- [ ] `store/` 內檔案與截圖建議：privacy-policy、screenshots、app-store、google-play、setup-checklist 已於第五階段收尾補齊並標示字數；goals 原本要求的 `store/screenshots/` 實際截圖改為指向 `screenshots/` 現有檔案（不另外產生）。商店圖片素材（512 圖示、1024×500 主題圖）尚缺，待 App 圖示完成
- [x] 隱私營養標籤與資料安全性表單的建議填法，與實際使用的 SDK 一致（沒有 ATT），並與兩個後台已填內容一致（見 store/privacy-labels.md）
- [ ] iOS 與 Android 都能以 development build 編譯並在模擬器啟動，廣告顯示測試廣告：iOS 模擬器已能編譯與啟動；Android 編譯與兩平台看到測試獎勵廣告，需開發者實機驗證
- [x] `maestro/phase5-*.yaml` 涵蓋：未購買時看到預告卡片並進入買斷頁（phase5-puns）、分享卡（phase5-share），已通過（結果頁橫幅條目已隨設計改為獎勵廣告而取消）
- [ ] 第一到第四階段的 Maestro 流程仍然全部跑通：2026-10-28 全套 13 個流程通過；本次收尾改了 App 名稱字串，需重跑確認
- [x] `pnpm typecheck` 沒有錯誤，`pnpm test` 全部通過（以 `tsc --noEmit` 與 jest 確認）
- [x] PROGRESS.md 列出開發者需要到 RevenueCat、AdMob、App Store Connect、Google Play Console 手動完成的步驟清單（見最後面「開發者待辦清單」）
