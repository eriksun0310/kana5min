# PROGRESS.md

Claude Code 每完成一個階段就更新這份檔案。完成條件的勾選以 `goals/` 裡各檔案為準。

## 階段狀態

| 階段 | 檔案 | 狀態 | commit |
|---|---|---|---|
| 1 | goals/01-hiragana.md | 完成 | phase 1 complete |
| 2 | goals/02-practice-special.md | 完成 | phase 2 complete |
| 3 | goals/03-katakana.md | 完成 | phase 3 complete |
| 4 | goals/04-graduate-release.md | 完成 | phase 4 complete |

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

### 階段 3：片假名（2026-10-27）

- 資料：片假名清音 46、濁音半濁音 25、拗音 33。每個字都有對照的平假名（`hiraganaId`）與差異說明（`diffNote`）。
- 外來語詞庫：97 個可出題的外來語，另有 15 個只當例字用的詞。
- 音檔：總數變成 998 檔，約 6.1 MB。
- 解鎖與首頁：平假名清音 46 個學完後，回首頁會顯示一次 C2-18。之後每日新字改從片假名依序取，首頁顯示片假名的進度。
- 學新字：C2-19 和平假名共用 `/learn/intro` 路由，依 script 切換版面。筆順、描寫、測驗、結果、一行學完都沿用原本的畫面。
- 讀外來語題（C2-20）：只出由已學片假名組成的詞（`src/logic/loanword.ts`）。每日練習與自動練習各加 1～2 題，不影響假名的 SRS。
- 五十音表的片假名分頁解鎖；シ・ツ、ソ・ン 在片假名解鎖後出現。
- 開發預設：新增 `hiragana-almost`（平假名除 ん 外都已學，片假名尚未解鎖）與 `katakana-started`。
- 測試：
  - `npm test` 17 個 suite、247 個測試通過。
  - `maestro test maestro/` 跑 10 個流程（phase1 四個、phase2 三個、phase3 三個），全部通過。
- 截圖：`screenshots/phase3/`，重跑指令 `maestro/screenshots/run-phase3.sh <UDID>`。
- 記憶小提示已依 `kana-puns.md` 的最新狀態同步：あ行、か行用 ✅ 的句子；け 是 ❌，不顯示卡片；か 句子的 emoji 已去掉。

### 階段 4：畢業、導流、TestFlight 準備（2026-10-27）

- 畢業（C2-21，`app/graduate.tsx`）：
  - 兩種假名的清音都學完後，回首頁會顯示一次。
  - 數字來自真實資料，練習天數是有練習的不同日期數。
  - 之後可從設定「畢業紀念」再次進入。
- 導流（C2-22，`app/next.tsx`）：
  - 連結常數放在 `src/config.ts`，目前是佔位字串，點按鈕會顯示「連結尚未設定」。
  - 可以關閉回首頁。
  - 之後可從首頁的「下一步：壽司日檢」連結或設定頁再次進入。
- 除錯選單（`src/dev/DebugMenu.tsx`）：
  - 只在開發版的設定頁最下方出現，有「平假名全部完成」「全部完成」「重設進度」三個按鈕。
  - Release 版的 `main.jsbundle`（Hermes bytecode）經檢查，不含除錯選單的任何字串（UTF-8 與 UTF-16 都查過，並用對照字串確認檢查方式有效）。
  - Release 版開啟除錯深連結也不會改變進度。
- `app.json`：
  - 名稱、bundle id、版本 1.0.0、buildNumber 1、`userInterfaceStyle: automatic`。
  - 啟動畫面分亮暗背景，App 圖示用佔位圖。
  - `ITSAppUsesNonExemptEncryption: false`、`supportsTablet: false`。
  - `privacyManifests`：不追蹤、不收集資料，UserDefaults 的使用理由是 CA92.1。
  - expo-notifications 設 `enableRemoteNotifications: false`，只用本機通知。
- `eas.json`：
  - development profile 是 internal、simulator 版。
  - production profile 設 `autoIncrement`，`appVersionSource: local`。
- `npx expo-doctor`：20/20 通過。為此補裝了 `expo-asset`，它是 expo-audio 需要的 peer dependency。
- 以 `npx expo run:ios --configuration Release` 在模擬器完成編譯，App 可正常啟動。
- 測試：
  - `npm test` 19 個 suite、261 個測試通過。
  - `maestro test maestro/` 跑 12 個流程（phase1～phase4），全部通過。
- 截圖：`screenshots/phase4/`，重跑指令 `maestro/screenshots/run-phase4.sh <UDID>`。
- 遇到的問題：`npx expo prebuild -p ios` 會重新產生 `ios/` 資料夾（已 gitignore），之後要再跑 `pod install`（需要 UTF-8 語系）。

### 好笑記憶包：廣告解鎖與買斷（2026-10-28）

- 商業模式由使用者決定（spec 6.2／6.3、architecture 第 12 節）：あ行、か行免費；從さ行起看一支獎勵廣告永久解鎖 3 個讀音；NT$90 買斷全部解鎖、永久免廣告。平假名與片假名以讀音共用解鎖。
- App 名稱改為「諧音五十音」（app.json `name`、通知標題、設定頁）。scheme、bundle id、package 不變。因為名稱全是中文，`expo prebuild` 產生的 Xcode 專案與 scheme 名稱變成 `app`，不影響 bundle id 與 EAS build。
- 諧音資料 `src/data/puns.ts`：只收 kana-puns.md 標 ✅ 的 41 句；け、つ、ひ（❌）與 ふ、へ（未審）不顯示卡片。半形括號改全形、去掉 emoji。片假名畫面把句中的平假名換成片假名。
- 新增：`react-native-google-mobile-ads` 17.4.0、`react-native-purchases` 10.16.0；`src/monetization/`（ads、purchases）、PunCard、PunUnlockSheet、買斷頁 `app/punpack.tsx`、總覽頁 `app/puns.tsx`、設定頁「好笑記憶包」區、片假名開始畫面的買斷連結。
- 廣告只用獎勵廣告，全部請求非個人化廣告，不跳 ATT。開發版用 Google 測試廣告（已在模擬器實際播過並確認會解鎖）。
- 正式版的 RevenueCat key 與 AdMob 獎勵廣告 unit id 從環境變數讀（`.env.example` 列出變數名稱）；沒設時買斷與廣告顯示「暫時無法使用」，App 其他功能正常。
- 驗證：tsc 0 錯誤、單元測試 21 suites／292 tests 全過、Maestro 新增 `phase5-puns.yaml`，亮暗截圖在 `screenshots/phase5/`。
- 沒做：F5 分享卡；實機購買流程未測（需 RevenueCat key 與沙盒帳號）。

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

### 階段 3

- 外來語詞庫（讀外來語題，97 個）：
  - ア～ナ行：アイス、イヤホン、ウイスキー、エアコン、オレンジ、カメラ、キウイ、クラス、ケーキ、コーヒー、コーラ、サラダ、シャツ、スキー、スープ、セーター、ソース、ソファ、タクシー、チーズ、ツアー、テレビ、テニス、トマト、ナイフ、ニュース、ヌードル、ネクタイ、ノート
  - ハ～ワ行：ハム、ハンバーガー、ヒーター、フルーツ、フォーク、ヘルメット、ホテル、マスク、ミルク、ムービー、メニュー、モデル、ユーモア、ヨーグルト、ラジオ、ラーメン、リモコン、ルール、レモン、ロボット、ワイン
  - 其他：パン、バナナ、カレー、トイレ、パーティー
  - 濁音、半濁音：ガス、ギター、グラス、ゲーム、ゴルフ、ピザ、ジーンズ、ズボン、ゼリー、ゾンビ、ダンス、デパート、ドア、バス、ビール、ブーツ、ベッド、ボール、ピアノ、プール、ペット、ポスト
  - 拗音：キャンプ、キュート、シュークリーム、ショッピング、チャーハン、チューリップ、チョコレート、ニョッキ、ヒューズ、ミャンマー、ミュージック、リャマ、リュック、ギャグ、ギョウザ、ジャム、ジュース、ジョギング、ビュッフェ、コンピューター
- 只當例字的詞（15 個，標 `exampleOnly`，不進讀外來語題）：ヤギ、ヲタク、ハナヂ、ツヅク、キョウリュウ、コンニャク、ヒャク、ヒョウ、ミョウガ、リョコウ、ギュウニュウ、サンビャク、ビョウイン、ロッピャク、ピョンピョン。這些字（ヤ、ヲ、ヂ、ヅ 與部分拗音）幾乎沒有初學者看得懂的外來語，所以用慣用片假名書寫的日語詞。
- ヲ 的例字是 ヲタク，音檔用 オタク 產生；k-wo 念 o。tts-overrides 新增 k-wo→オ、k-di→ジ、k-du→ズ、w-otaku→オタク。
- 外來語的 romaji 用長音符（kōhī），配合設計檔 C2-20 的回饋文案；平假名詞維持 obaasan、kyuu 這類寫法。
- 讀外來語的「可讀」規則：
  - 已學的清音可讀。
  - 濁音、半濁音要對應的清音已學。
  - 小字要對應的大字已學。
  - ー 一律可讀。
- 讀外來語題進題時不自動播放，讓使用者先自己讀；可以按播放鈕聽。最後一題的按鈕是「完成，看結果」。
- C2-18 的範例卡固定是 あ→ア、か→カ、へ→ヘ。學完平假名的最後一輪，一行學完畫面的按鈕改成「回首頁」，回首頁後接 C2-18。
- phase2 的兩個 Maestro 流程改用 `hiragana-almost`，因為 `hiragana-done` 現在會先跳出 C2-18。

### 階段 4

- 畢業畫面的觸發做法和 C2-18 一樣，由首頁取得焦點時檢查，條件是「已畢業、還沒看過、已看過片假名開始畫面」。
  - 先設定「已看過」再顯示畫面，避免重複跳出。代價是在畢業畫面時強制關閉 App，就不會再自動顯示，但仍可從設定進入。
- 畢業與導流頁沒有返回手勢，只能用畫面上的按鈕離開。這些按鈕都會回到「今天」分頁。
- 設定頁「關於」區的「下一步：壽司日檢」一律顯示；「畢業紀念」只在畢業後顯示。
- 所有開發預設都會把「已看過畢業畫面」設回否，方便測試。
- eas.json 的 development profile 沒有開 `developmentClient`，因為專案沒有安裝 expo-dev-client。它是一般的 debug 版，會連到 Metro。

## 待確認事項

- App 名稱已定為「諧音五十音」，副標「台灣人的白爛日文記憶法」。App Store Connect 與 Google Play 後台的名稱、副標、描述尚未改（文字見 `store/app-store.md`、`store/google-play.md`）
- AdMob 尚未建立「獎勵廣告」單元（目前只有 Banner 與 Interstitial，新模式用不到這兩個）。建立後把 unit id 設成 EAS 環境變數 `EXPO_PUBLIC_ADMOB_REWARDED_IOS`／`EXPO_PUBLIC_ADMOB_REWARDED_ANDROID`
- RevenueCat 公開 SDK key 尚未設定：設成 EAS 環境變數 `EXPO_PUBLIC_RC_IOS_KEY`／`EXPO_PUBLIC_RC_ANDROID_KEY`（見 RELEASE.md）
- 好笑記憶包 F5 分享卡尚未實作
- 內購審查截圖：用模擬器的買斷頁（`screenshots/phase5/F3-PunPack-light.png`）
- Bundle identifier（目前：com.ptalk.kana5min）
- 壽司日檢 App Store 連結
- 導流頁第三個賣點文案
- 人工聽過所有單一假名音檔，特別是 は、へ、を、ん 與拗音（音檔清單由 Claude Code 列在上方「音檔清單」）
- 人工聽過片假名相關的 overrides：k-wo（オ）、k-di（ジ）、k-du（ズ）、w-otaku（オタク）
- 人工聽過 h-i／k-i（含慢速）：單獨念「い」「イ」時 TTS 尾端會多出一段雜音（聽起來像斷掉、多念一個音），已用 overrides「いー」「イー」重產，波形確認為單一段平滑發音
- App 圖示與啟動圖：`assets/images/` 仍是 Expo 範本圖。亮色啟動畫面的白色圖形幾乎看不見，上架前要換掉
- 導流頁壽司日檢卡的 App 圖示佔位（虛線框）
- 外來語詞庫與例字（見「假設」的階段 3），特別是 ニョッキ、ヒューズ、リャマ 等較冷門的詞是否保留
- 部分拗音例字較罕見（ひゅうが、みゅう 等），是否替換
- `src/logic/autoQuiz.ts` 已不再使用，是否刪除
- Android：expo-audio 在 Android 會帶入 RECORD_AUDIO 權限（iOS 不受影響），上 Google Play 前需處理
- eas.json 的 `cli.version` 下限（目前 `>= 16.0.0`），請依實際安裝的 eas-cli 版本確認
- 好笑記憶包、內購、廣告（goals/05）不在這四個階段的範圍內，尚未實作
- App 圖示
- `kana-puns.md` 的 ❌ 句子（お、け 等）換新句後，同步更新 `src/data/hints.ts`
- Maestro 官方安裝程式在 `~/.zshrc` 加了 `export PATH=$PATH:$HOME/.maestro/bin`，並新建 `~/.bash_profile`；是否保留由使用者決定

## 上傳 TestFlight 的步驟

以下步驟都由開發者自己執行（需要 Apple 帳號登入）。Claude Code 沒有執行任何 eas 指令。

1. 上傳前先補齊「待確認事項」：App 圖示與啟動圖、壽司日檢 App Store 連結（`src/config.ts` 的 `SUSHI_JP_APP_STORE_URL`），以及導流頁的第三個賣點（`app/next.tsx`）。
2. 安裝並登入 EAS CLI：
   ```bash
   pnpm install
   ```
   ```bash
   pnpm exec eas login
   ```
3. 第一次使用時，連結 EAS 專案（會在 app.json 寫入 `extra.eas.projectId`）：
   ```bash
   pnpm exec eas init
   ```
4. 確認版本號：app.json 的 `version` 為 `1.0.0`、`ios.buildNumber` 為 `1`。`eas.json` 的 production profile 設了 `autoIncrement`，每次打包會自動遞增 buildNumber（`appVersionSource: local`，所以會寫回 app.json，記得 commit）。
5. 打包 production（憑證與 provisioning profile 由 EAS 依提示自動建立）：
   ```bash
   pnpm exec eas build --platform ios --profile production
   ```
6. 上傳到 App Store Connect，處理完成後就會出現在 TestFlight：
   ```bash
   pnpm exec eas submit --platform ios --profile production --latest
   ```
   第一次上傳時會詢問 App Store Connect 的 App（Apple ID 6827398112）與 API key，依提示選擇即可。
7. 在 App Store Connect 的 TestFlight 頁面填寫「測試內容」、加入內部測試人員。出口合規已用 `ITSAppUsesNonExemptEncryption: false` 宣告，不會再被詢問。

在本機確認 Release 版能正常運作（不需要帳號）：
```bash
LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 pnpm exec expo run:ios --configuration Release
```

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

## 諧音梗資料同步（2026-10-28）

- 新增 `scripts/gen-puns.mjs`：從 `kana-puns.md`（只收「狀態」含 ✅、且句子含該假名的列）產生 `src/data/puns.ts` 的 PUNS 區塊（`pnpm gen:puns`／`pnpm check:puns`）。整理規則：半形括號改全形、合併空白，emoji 保留。
- 第一次同步後，`puns.ts` 有 10 句變更、新增 ふ（共 42 句）；`と` 的句子原本沒有「と」，已在 md 補成「と（偷）偷喜歡我就直說！」。
- 單元測試加入「puns.ts 與 kana-puns.md 同步」檢查。

## 首頁進度條改為各行進度（2026-10-28）
- 原本 46 格點點沒有說明、看不懂 → 改成 10 段「各行進度條」：每段依該行已學字數填滿，目前行外加框，標題寫「各行進度／學到○行」。`HomeStats.rows`、`currentRowLabel` 為新增欄位，`dots` 保留（測試仍用）。

## 2026-10-28 UI 調整收尾

- **詳情頁**：拼音（如 ka）移進田字格內、位於字下方；播放改為等寬的「正常／慢速」兩顆並排按鈕（testID `play-audio`、`play-slow`）。
- **五十音表片假名分頁隨時可瀏覽**：未解鎖時分頁可切換，頂端顯示說明列「可以先瀏覽，平假名學完後開始學片假名」（`katakana-locked-hint`）；學習仍在平假名學完後才開始。假設：未解鎖時詳情頁的「描寫練習」不擋（只是瀏覽與練習描寫，不影響 SRS 進度）。
- **首頁各行進度條**：見上一段「首頁進度條改為各行進度」，已用截圖確認（亮色與暗色、平假名與片假名階段）。
- **按開始練習不再閃白畫面**：新增 `src/nav/startDaily.ts` 的 `startDailyAndGo`，先建立 session 再直接導到第一個畫面（`/learn/intro`、`/quiz` 或自動練習）；`/learn` 入口路由保留，供舊深連結使用。
- **Maestro 全套重跑**：`maestro/` 下 13 個流程全數通過（phase1-chart-detail、daily-practice、onboarding、theme；phase2-auto-practice、confuse、special；phase3-learn-katakana、loanword、unlock；phase4-graduate、next；phase5-puns），iPhone 17（iOS 26.5）。
- **截圖更新**：`screenshots/phase1/` 的 C2-02 首頁、C2-03 五十音表、C2-04 詳情頁，新增 `C2-03-Chart-katakana-locked-*`（片假名未解鎖）；`screenshots/phase3/` 全部重截。亮色與暗色皆已看過，顏色有跟著切換。完整的 `phase1-capture.yaml` 在重截時因描寫手勢（長按 trace-canvas）偶爾不穩而失敗兩次（失敗點不同，判斷為模擬器手勢時序），所以新增較精簡的 `phase1-ui-capture.yaml`／`run-phase1-ui.sh` 只截今天改過的畫面；phase1 其餘截圖（C2-05～C2-12）未重截。
- **expo 修補版升級**：`expo` ~58.0.19 → ~58.0.20、`expo-router` ~58.0.26 → ~58.0.27（SDK 58 內；`expo install` 同時把新發佈的相依版本加進 `pnpm-workspace.yaml` 的 `minimumReleaseAgeExclude`，冷卻期過後可刪）。`tsc --noEmit` 通過；jest（排除 `.claude/worktrees`）295/296 通過，唯一失敗是 `kana-puns.md` 有未 commit 的工作區修改導致 puns 同步測試不一致（非這次升級造成，需要另行 `pnpm gen:puns` 或還原 md）；`expo-doctor` 19/20，唯一未過是 `eas-cli` 在專案相依中（既有狀況）。因 expo-modules-core 升版，重跑 `pod install`（需 `LANG=en_US.UTF-8`，否則 CocoaPods 會因編碼錯誤失敗）並重新編譯 Debug build，升級後再跑 phase1-daily-practice、phase3-unlock、phase5-puns 皆通過。
