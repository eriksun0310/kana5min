# PROGRESS.md

Claude Code 每完成一個階段就更新這份檔案。完成條件的勾選以 `goals/` 裡各檔案為準。

## 階段狀態

| 階段 | 檔案 | 狀態 | commit |
|---|---|---|---|
| 1 | goals/01-hiragana.md | 未開始 | |
| 2 | goals/02-practice-special.md | 未開始 | |
| 3 | goals/03-katakana.md | 未開始 | |
| 4 | goals/04-graduate-release.md | 未開始 | |

## 每階段紀錄

（每個階段完成後，在這裡寫下做了什麼、遇到什麼問題、怎麼解決。）

## 假設

（spec 沒寫清楚、由 Claude Code 自行決定的事情記在這裡，例如外來語例字清單。）

## 待確認事項

- App 名稱（目前：五十音）
- Bundle identifier（目前：com.ptalk.kana5min）
- 壽司日檢 App Store 連結
- 導流頁第三個賣點文案
- 人工聽過所有單一假名音檔，特別是 は、へ、を、ん 與拗音（音檔清單由 Claude Code 列在下方）
- App 圖示

## 上傳 TestFlight 的步驟

（第四階段完成時由 Claude Code 補上。）

## 商店後台設定進度（2026-10-27）

### App Store Connect（已完成，Apple ID 6827398112）
- Bundle ID `com.ptalk.kana5min` 已註冊（含 In-App Purchase），App「Kana 5min - 五十音入門」已建立，SKU `kana5min`
- 版本頁文字、副標題、類別（教育／參考）、年齡分級（4+，廣告題答「是」）、定價（免費、台灣 TWD 基準、175 國）已填
- App 隱私已發佈：收集裝置識別碼、購買記錄、產品互動、廣告資料、當機、效能；皆未用於追蹤（假設只送非個人化廣告）
- 內購 `com.ptalk.kana5min.punpack`（非消耗性，NT$90，全部國家，家人共享開，繁中名稱「好笑記憶包」）已建，ID 6827399902
- 尚缺：內購審查截圖（需真實購買頁）、App 審查聯絡人資料、iOS 截圖、build、付費 App 協議確認

### AdMob（已完成建立，帳號 authuser=1）
- iOS、Android 各一個 App「Kana 5min」，各有 Banner 與 Interstitial；ID 見 `store/admob-ids.md`
- 尚缺：「隱私權與訊息」的 GDPR／IDFA 訊息（UMP）；帳號層級付款資料未完成（AdMob 首頁有紅色提醒）

### Google Play（進行中，用 Chrome `u/6`＝Nick Chi，developer 帳號 5402855160538606160，appId 4973571865030022233）
- App「Kana 5min - 五十音入門」已建立（免費、`com.ptalk.kana5min`；兩項法律聲明由使用者本人勾選）
- 應用程式內容已完成：隱私權政策、廣告（是）、登入詳細資料（否）、廣告 ID（是，用途＝廣告或行銷）、政府（否）、金融（無）、健康（無）、目標對象（13 歲以上）
- 內容分級已完成（IARC）：語言題答「是／不嚴重咒罵／很少」，數位商品＝是，戰利品箱＝否，教育產品＝是；結果 ESRB E、PEGI 3（聯絡信箱 connect.ptalk@gmail.com）。「粗俗幽默」題（身體功能笑點）答否，因諧音梗不屬此類
- 資料安全性已完成並儲存（假設：購買記錄＝收集／App 功能；裝置 ID＝收集＋分享／功能＋廣告；應用程式互動、當機、診斷、其他效能＝收集＋分享／數據分析（含功能）；與 Apple 隱私答案方向一致但 Play 較保守）。其他：收集資料＝是、傳輸加密＝是、不允許建立帳戶；6 個類型皆已填完用途與分享
- 類別＝教育、聯絡信箱 connect.ptalk@gmail.com、網站已存；商店資訊的名稱、簡短說明、完整說明已存為草稿。儀表板「設定應用程式」11 項已完成 10 項，商店資訊待補圖片素材後完成
- 尚缺：商店資訊的圖片素材（512 圖示、1024×500 主題圖、手機截圖）；AAB 上傳後建立內購商品與送審
- 網址規則：直連 `/main-store-listing` 會被導回首頁，要從儀表板或 app-content/overview 點進去

### RevenueCat（已完成，project `81be02cb`）
- 專案 Kana 5min（Education／React Native）；App Store app（`com.ptalk.kana5min`，沿用共用 IAP key NR7VBAFW8V，Valid credentials）；Play Store app（`com.ptalk.kana5min`，尚未上傳 service account JSON）
- Product `com.ptalk.kana5min.punpack`（iOS、Android 各一，Non-consumable）→ entitlement `pun_pack` → offering `default` 的 Lifetime package（`$rc_lifetime`）
- 尚缺：public SDK key 未寫入 `.env`（Project → API keys 自行複製 `EXPO_PUBLIC_RC_IOS_KEY`／`EXPO_PUBLIC_RC_ANDROID_KEY`）；Android 商品要等 Play 內購建好後才會變成有效

### 決定記錄（2026-10-27，使用者）
- 諧音梗可能含台語粗俗用語：Google Play 內容分級「粗俗語言」題答「是」，接受分級約 12+。Apple 年齡分級目前答「無」，兩邊要保持一致，下次調整 Apple 時改成對應等級。
- Apple 年齡分級已同步改為「粗俗或粗魯幽默＝偶爾／輕微」，計算結果 9+（原 4+）。Google Play IARC 待使用者勾條款後填問卷，粗俗語言答「是」。
