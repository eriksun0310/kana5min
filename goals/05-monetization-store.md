# Goal 05：好笑記憶包內購、AdMob 廣告與雙平台上架資料

## 目標

在 goals/01～04 完成的基礎上，加入三件事：用 RevenueCat 做「好笑記憶包」買斷內購、用 AdMob 加入橫幅與插頁廣告，以及準備好 App Store 與 Google Play 上架需要填寫的所有資料。

這個階段結束後，開發者只需要到 RevenueCat、AdMob、App Store Connect、Google Play Console 建立項目、填入金鑰，並把 `store/` 裡的文字貼到後台即可。

## 本階段對 CLAUDE.md 的例外

CLAUDE.md 寫的「不要加入追蹤或分析 SDK」與「不要實作好笑記憶包付費機制」，在本階段改為：允許加入 RevenueCat（`react-native-purchases`）、AdMob（`react-native-google-mobile-ads`，含 UMP 同意表單）與 `expo-tracking-transparency`，並實作 spec 第 6 節與設計檔 F1～F5。除此之外的規則照舊，尤其不能把金鑰寫進程式碼、不能登入任何後台、不能 push。

## 參考

spec.md 第 6 節、`kana-puns.md`、設計檔 F1～F5（不在 `design/` 裡的畫面，依 spec 第 4 節的描述與 C2 系列的元件風格實作）。

## 一、好笑記憶包（RevenueCat）

內購項目為一個非消耗型產品，product id 為 `com.ptalk.kana5min.punpack`，RevenueCat entitlement 為 `pun_pack`。iOS 與 Android 的 RevenueCat public SDK key 從環境變數讀取（`EXPO_PUBLIC_RC_IOS_KEY`、`EXPO_PUBLIC_RC_ANDROID_KEY`），並建立 `.env.example`。

免費範圍為あ行與か行的諧音梗，其他假名在未購買時顯示 F2 的模糊預告卡片，點擊進入 F3 買斷頁。購買後立即解鎖全部諧音梗，並支援恢復購買。購買狀態以 RevenueCat 為準，本機快取一份，離線時依快取判斷。

諧音梗內容讀取 `kana-puns.md`，轉成 App 內的 JSON 資料。片假名與平假名同音共用同一句。

## 二、AdMob 廣告

廣告的原則是不打斷學習。購買好笑記憶包的使用者同時移除所有廣告，買斷頁的賣點要加上這一點。

橫幅廣告只出現在五十音表、練習入口與練習結果頁的底部，不出現在學新字、筆順、描寫、測驗作答與特殊音教學畫面。插頁廣告只在練習結果頁按下「回首頁」時有機會出現，限制為同一天最多 2 次、兩次之間至少間隔 3 輪練習，安裝後第一天不顯示。

開發與測試一律使用 AdMob 官方測試廣告單元。正式的 App ID 與廣告單元 ID 從環境變數讀取，App ID 透過 Expo config plugin 寫入 `app.config.ts`，並在 `.env.example` 列出所需變數。

iOS 在第一次要顯示廣告前，先顯示 UMP 同意表單，再請求 App Tracking Transparency 權限，`NSUserTrackingUsageDescription` 文案為「這個權限只用來顯示與你較相關的廣告，不影響任何學習功能。」使用者拒絕時改用非個人化廣告。設定頁新增「隱私權選項」入口，可重新開啟同意表單。

## 三、雙平台上架資料

`store/app-store.md`、`store/google-play.md`、`store/setup-checklist.md` 已經有開發者準備的初稿：保留原本的文案與已決定的設定（名稱、產品 ID、價格 NT$90），只依照實際做出來的功能修正不符合的地方並補上缺少的欄位，不要整份重寫。在 `store/` 資料夾完成下列檔案，所有內容以繁體中文（台灣）撰寫，字數必須符合各平台限制，並在檔案中標示字數：

`store/app-store.md`：App 名稱（Kana 5min - 五十音入門）、副標題（30 字內）、宣傳文字（170 字內）、描述、關鍵字（100 字元內，以逗號分隔）、類別（教育）、年齡分級問卷的建議答案、App 隱私權營養標籤的建議填法（依實際使用的 RevenueCat 與 AdMob 蒐集項目）、App 內購項目的參考名稱與描述、審查備註。

`store/google-play.md`：應用程式名稱（30 字內）、簡短說明（80 字內）、完整說明（4000 字內）、類別、內容分級問卷建議答案、資料安全性表單的建議填法、目標對象建議設定、廣告聲明、應用程式內產品的名稱與說明。

`store/privacy-policy.md`：隱私權政策全文，說明學習紀錄只存在裝置上、廣告與內購由 AdMob 與 RevenueCat 處理及其蒐集的資料、聯絡方式（佔位 `[聯絡信箱]`）。網址佔位為 `[隱私權政策網址]`。

`store/screenshots.md`：兩個平台各需要的截圖尺寸，以及建議使用哪些畫面、每張截圖上的標語。並用模擬器實際截出 iPhone 6.9 吋尺寸的建議畫面，存到 `store/screenshots/`。

目標對象一律設定為非兒童導向（13 歲以上），避免觸發兒童相關的廣告政策，並在 PROGRESS.md 說明理由。

## 完成條件

- [ ] RevenueCat 已整合，未購買時 F2 預告卡片與 F3 買斷頁正常顯示，購買與恢復購買流程完整；金鑰來自環境變數
- [ ] 購買後全部諧音梗解鎖，F4 總覽與 F5 分享卡可用，離線時依本機快取判斷購買狀態
- [ ] 諧音梗資料由 `kana-puns.md` 轉成 JSON，あ行與か行免費，其他鎖定
- [ ] 橫幅廣告只出現在指定的三個畫面，插頁廣告的觸發與頻率限制符合上方規則；有單元測試覆蓋頻率限制
- [ ] 購買好笑記憶包後所有廣告消失
- [ ] 開發版本使用 AdMob 測試廣告單元，正式 ID 來自環境變數，`.env.example` 已列出所有變數
- [ ] iOS 依序顯示 UMP 同意表單與 ATT 權限請求，拒絕時改用非個人化廣告；設定頁有隱私權選項入口
- [ ] `store/` 內四個檔案與截圖都已產生，所有文字符合字數限制並標示字數
- [ ] 隱私權營養標籤與資料安全性表單的建議填法，與實際使用的 SDK 一致
- [ ] iOS 與 Android 都能以 development build 編譯並在模擬器啟動，廣告顯示測試廣告
- [ ] `maestro/phase5-*.yaml` 涵蓋：未購買時看到預告卡片並進入買斷頁、結果頁出現橫幅廣告，全部跑通
- [ ] 第一到第四階段的 Maestro 流程仍然全部跑通
- [ ] `pnpm typecheck` 沒有錯誤，`pnpm test` 全部通過
- [ ] PROGRESS.md 列出開發者需要到 RevenueCat、AdMob、App Store Connect、Google Play Console 手動完成的步驟清單，並 commit
