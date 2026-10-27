# PROGRESS.md

Claude Code 每完成一個階段就更新這份檔案。完成條件的勾選以 `goals/` 裡各檔案為準。

## 階段狀態

| 階段 | 檔案 | 狀態 | commit |
|---|---|---|---|
| 1 | goals/01-hiragana.md | 完成 | phase 1 complete |
| 2 | goals/02-practice-special.md | 完成 | phase 2 complete |
| 3 | goals/03-katakana.md | 未開始 | |
| 4 | goals/04-graduate-release.md | 未開始 | |

## 每階段紀錄

（每個階段完成後，在這裡寫下做了什麼、遇到什麼問題、怎麼解決。）

架構決策統一記在 `docs/architecture.md`。

### 階段 1：平假名 MVP（2026-10-27）

- 專案：Expo SDK 58、React Native 0.88、expo-router、TypeScript、zustand（設定用 AsyncStorage persist）、expo-sqlite（progress、confusion 兩張表）、expo-audio、Klee One、react-native-svg、expo-notifications。
- 資料：平假名清音 46、濁音半濁音 25、拗音 33（`src/data/kana.json`），例字與「一行學完」單字池 164 筆（`src/data/words.json`）。
- 邏輯（`src/logic/`，純函式加單元測試）：SRS（5.3 間隔）、羅馬拼音淡出、每日練習組成與出題、首頁統計與連續天數、描寫判定、自動練習；記憶體版 repository 測試保存與讀回。
- 畫面：C2-01～C2-12 全部完成，練習分頁為簡版（自動練習 10 題）。每日提醒用本機排程通知。
- 筆順：`scripts/build-strokes.mjs` 從 KanjiVG 取 151 個假名（含片假名與 ー）的筆畫路徑，輸出 `src/data/strokes.json`。授權見 `assets/strokes/LICENSE-KanjiVG.txt` 與設定頁「關於」。
- 音檔：`scripts/gen-audio.mjs` 產生 536 檔（見下方音檔清單）。
- 測試：`npm test` 12 個 suite、128 個測試通過；`maestro --device <UDID> test maestro/` 跑 phase1 四個流程（onboarding、daily-practice、chart-detail、theme）全部通過。`maestro/config.yaml` 只收集 `phase*.yaml`。
- 截圖：`screenshots/phase1/` 有 C2-01～C2-12 的亮暗截圖，另外加上作答狀態與已學標記。重跑指令：`maestro/screenshots/run-phase1.sh <UDID>`。
- 遇到的問題：
  - CocoaPods 需要 UTF-8 語系，要先 `export LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8` 再 `npx expo run:ios`。
  - Metro 用 `CI=1` 啟動時不監看檔案，新路由不會進 bundle，所以開發時不要帶 `CI=1`。
  - 設定頁的 header 用 minHeight 加 padding 會把內容擠成 0 高，已改成固定高度。
  - 歡迎頁的推入動畫會讓截圖偏移，已改成無動畫。
  - 開發版偶發「onAnimatedValueUpdate with no listeners」警告，來源是 expo-router 的 tab 動畫，已用 `LogBox.ignoreLogs` 忽略這一條。

### 階段 2：練習、易混淆字、特殊音（2026-10-27）

- 練習分頁（C2-13）：自動練習、最近常搞混（依答錯次數排序）、三個特殊音入口。
- 易混淆字（`src/data/confusables.ts`、`src/logic/confusion.ts`）：
  - 5 組，id 分別是 nume、ruro、wanere、shitsu、son。
  - 答錯時立即寫入 sqlite 的 confusion 表。
  - 自動練習出易混淆題時，依權重 1 + 答錯次數抽組。
  - シツ、ソン 在片假名解鎖前不會出現。
- 對比頁（C2-14）：可切換字組，「快速辨識 10 題」只出該組的題目。
- 特殊音（C2-15～17）：`app/special/[kind].tsx` 與 `app/special-quiz.tsx`（每類 6 題，聽音二選一，不影響 SRS）；拍數方塊元件 `MoraBoxes`。新增 15 個對立詞並產生音檔。
- 開發用進度預設：`kana5min://debug?preset=hiragana-done|all-done|reset`，只在 `__DEV__` 生效（`src/dev/`、`app/debug.tsx`）。
- 測試：`npm test` 15 個 suite、171 個測試通過；`maestro test maestro/` 跑 7 個流程（phase1 四個、phase2 三個）全部通過。
- 截圖：`screenshots/phase2/`，重跑指令 `maestro/screenshots/run-phase2.sh <UDID>`。

### 音檔清單（階段 1）

- 共 536 檔，等於（104 個假名 + 164 個單字）× 2（一般、慢速），約 3.2 MB。
  - 聲音 `ja-JP-NanamiNeural`，24kHz 48kbps mono mp3；慢速 rate -40%。
  - 產生後用 ffmpeg 裁掉頭尾的靜音。
- 用法：`node scripts/gen-audio.mjs`，可加 `--force`、`--only id,id`、`--list`、`--no-trim`。
- `scripts/tts-overrides.json`（39 筆）：
  - h-ha → ハ、h-he → ヘ：避免念成助詞的 wa、e。
  - h-wo → オ：を 統一念 o。
  - h-di → ジ、h-du → ズ。
  - w-hono → ほんお：例字「ほんを」的 を 念 o。
  - 拗音 33 個改用片假名（キャ、シュ…）。
- **請人工聽**（ASR 辨識結果可疑）：
  - 假名：ぬ、ら、り、れ、ぶ、ぷ、び、りゃ、りゅ、ぎゃ、ぎょ、ちゃ。
  - 單字：あう（w-au）、りゅう（w-ryuu）、へや（w-heya）、みゃく（w-myaku）、いう。

## 假設

（spec 沒寫清楚、由 Claude Code 自行決定的事情記在這裡，例如外來語例字清單。）

### 階段 1

- 假名 id：平假名 `h-<romaji>`，片假名 `k-<romaji>`。ぢ、づ 的 id 是 `h-di`、`h-du`，顯示為 ji、zu。を 顯示 wo、發音念 o。
- 筆畫數以 KanjiVG 為準：濁點算 2 筆、半濁點算 1 筆（例如 が 5 畫），拗音為兩字相加。
- 記憶小提示只用在 あ行、か行。`kana-puns.md` 標 ❌ 的句子（お、け）不顯示卡片；き 用新的 ✅ 句子。
- 「已學」的定義：完成一次學新字流程，並在測驗中作答過。
- 每輪新字固定最多 3 個，依五十音順序，可以跨行。
- 每輪最多帶 20 個到期複習字，其餘留到下一輪。
- 測驗出題：每個新字 2 題（看字選音、聽音選字各 1），每個複習字 1 題。
  - 一輪結束後，某個字全對就升一級，有錯就回到 0 級（10 分鐘後到期）。
  - 答錯的題目在同一輪不重出，「等一下會再出現」靠 10 分鐘後的 SRS 達成。
- 看字選音的選項是聲音，需要先聽再選：第一次點選項會播放並暫選，再點一次或按「選這個」才確定作答。
- 答錯時一律顯示羅馬拼音，不套用淡出規則。
- 描寫判定：畫出的筆畫數至少要有該字筆畫數的一半，且第一筆的方向和標準方向夾角小於 90°。開發版長按畫布 1 秒視為通過，給 Maestro 用。
- 筆順動畫與描寫底字用 KanjiVG 骨架路徑，不是 Klee One 字形。
- 結果頁「再練一輪」直接進自動練習；若這輪剛學完一行，按「回首頁」或關閉時會先顯示一行學完畫面。
- 自動練習（簡版）：從已學的字隨機出 10 題。
- 易混淆字：kana 資料多加了 き／さ、は／ほ，只用於詳情頁「容易搞混」，不進練習清單。
- 片假名在解鎖前，五十音表的切換鈕點了只顯示「平假名學完後解鎖」。
- 設定頁是分頁，所以不顯示設計檔的返回箭頭。
- 部分拗音例字較罕見（例如 ひゅうが、みゅう），只是為了補齊，可以再替換。

### 階段 2

- 「最近常搞混」列出所有可用的組，沒答錯過的顯示「錯 0 次」。對比頁的切換膠囊固定預設順序，不依答錯次數重排。
- 答錯紀錄：只要題目的正確答案屬於某組且答錯，該組就 +1，答對不會減少。
- 快速辨識時，已學的字照常更新 SRS；未學的字只記答錯，不寫 SRS。
- 自動練習：有可用字組時出 2～4 題易混淆題，其餘是看字選音、聽音選字。已學的字太少時，題數可能少於 10 題。
- 易混淆題的選項就是該組成員（2～3 個），不補滿 4 個。
- 特殊音練習的對立詞：
  - 長音：おばさん／おばあさん、おじさん／おじいさん、ゆき／ゆうき
  - 促音：きて／きって、おと／おっと、かこ／かっこ
  - 拗音：びよういん／びょういん、じゆう／じゅう、りよう／りょう
- 特殊音練習在作答前，選項的拍數方塊不標出特殊拍，避免直接透露答案。
- 對比頁的大字卡、拗音表的格子都可以點擊播放（設計檔沒有這個互動）。
- `src/logic/autoQuiz.ts` 已被 `buildAutoPractice10` 取代、不再使用。依規則未經同意不刪檔，所以先保留。

## 待確認事項

- App 名稱（目前：Kana 5min - 五十音入門）
- Bundle identifier（目前：com.ptalk.kana5min）
- 壽司日檢 App Store 連結
- 導流頁第三個賣點文案
- 人工聽過所有單一假名音檔，特別是 は、へ、を、ん 與拗音（音檔清單由 Claude Code 列在下方）
- App 圖示
- `kana-puns.md` 的 ❌ 句子（お、け 等）換新句後，同步更新 `src/data/hints.ts`
- Maestro 官方安裝程式在 `~/.zshrc` 加了 `export PATH=$PATH:$HOME/.maestro/bin`，並新建 `~/.bash_profile`；是否保留由使用者決定

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
