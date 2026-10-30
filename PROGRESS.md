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
  - 連結常數放在 `src/config.ts`（2026-10-28 已換成正式連結：App Store `id6774095306`、Google Play `com.ptalk.sushijp`），依平台開對應商店。
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
- `scripts/tts-overrides.json`（46 筆）：
  - h-ha → ハ、h-he → ヘ：避免念成助詞的 wa、e。
  - h-wo → オ：を 統一念 o。
  - h-di → ジ、h-du → ズ。
  - w-hono → ほんお：例字「ほんを」的 を 念 o。
  - 拗音 33 個改用片假名（キャ、シュ…）。
  - 2026-10-28 人工聽過後，依聽感從候選中改選：h-he → ヘ。、h-shu → シュー、h-hyu → ヒュー、h-rya → リャ。、w-heya → 部屋（只影響送給 TTS 的文字，App 顯示的字不變）。
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

- App 名稱：手機上顯示「諧音五十音」（app.json `name`），商店上架名稱「日文五十音｜白爛諧音記憶法」，副標「台灣人專屬｜平假名片假名 5 分鐘學會」。後台名稱與文字見 `store/app-store.md`、`store/google-play.md`（尚缺的後台項目見最後面「開發者待辦清單」）
- Bundle identifier（目前：com.ptalk.kana5min）
- ✅ 已完成（2026-10-28）：開發者用試聽頁人工聽過 62 個重點音檔（override 過的假名與單字、拗音 33 個、ASR 可疑的假名與單字）。有問題的 5 個（へ、しゅ、ひゅ、りゃ、へや）已依候選聽感換版，其餘 OK。其他一般假名音檔未逐一聽（原清單：は、へ、を、ん 與拗音）
- ✅ 已完成（2026-10-28）：片假名相關 overrides k-wo、k-di、k-du、w-otaku 已聽過，OK
- ✅ 已完成（h-i 於 2026-10-28 之前確認，k-i 於 2026-10-28 試聽頁聽過 OK）h-i／k-i（含慢速）：單獨念「い」「イ」時 TTS 尾端會多出一段雜音（聽起來像斷掉、多念一個音），已用 overrides「いー」「イー」重產，波形確認為單一段平滑發音
- App 圖示與啟動圖：`assets/images/` 仍是 Expo 範本圖。亮色啟動畫面的白色圖形幾乎看不見，上架前要換掉
- 外來語詞庫與例字（見「假設」的階段 3），特別是 ニョッキ、ヒューズ、リャマ 等較冷門的詞是否保留（建議保留；待開發者決定）
- 部分拗音例字較罕見（ひゅうが、みゅう 等），是否替換（建議保留；待開發者決定）
- Maestro 官方安裝程式在 `~/.zshrc` 加了 `export PATH=$PATH:$HOME/.maestro/bin`，並新建 `~/.bash_profile`；是否保留由使用者決定

## 上傳 TestFlight 的步驟

以下步驟都由開發者自己執行（需要 Apple 帳號登入）。Claude Code 沒有執行任何 eas 指令。

1. 上傳前確認「待確認事項」都已處理（App 圖示、壽司日檢連結與導流頁賣點已於 2026-10-28 完成）。
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

## 限時練習與中途接續（2026-10-28）
- 每日目標改成每輪的時間上限：只計練習畫面的時間（離開／背景暫停）；時間到等答完當下那題，詢問「結束這一輪」或「再練 5 分鐘」（固定 5 分鐘，可再次觸發）。結束＝部分提交（只提交已作答的字）。
- 中途離開（✕「先離開」）把這一輪存進 AsyncStorage（`kana5min-session`，與 SRS 分開）；首頁按鈕變「繼續今天的練習」＋小字「從頭開始」；隔天作廢。每日／自動／易混淆快速辨識共用。實作與測試見 docs/architecture.md 第 13 節、`src/logic/practiceTimer.ts`、`sessionSave.ts`、`src/store/__tests__/sessionResume.test.ts`、`maestro/phase6-timed-session.yaml`。
- 假設：
  - 新字的流程與其測驗不受時間限制：時間到時，剩下的新字題會排到前面，全部答完才詢問，所以「新字學完就超時」時會先做完新字的 2 題測驗再詢問是否繼續複習（否則新字沒測驗就不算學會）。
  - 自動練習與易混淆快速辨識固定 10 題，不限時，只共用存檔。
  - 只有一個存檔位：開始新的自動練習並答題後會蓋掉原本存起來的每日練習；重新開始每日練習（含「從頭開始」）也會丟掉舊存檔。
  - 新字階段接續時，從該新字的「看與聽」重新開始（不細存字內步驟）；什麼都還沒做就離開不存檔。
  - 結果頁「用時」改為實際練習時間（暫停不算）。測驗畫面右上新增「第幾題/總題數」，方便確認接續位置（截圖會與舊版不同）。
  - ✕ 對話框改為「要先離開嗎？／先離開」，maestro/common/exit-flow.yaml 與 phase3-unlock 同步更新。


## 諧音梗分享卡與詳情頁對照（2026-10-28）
- **F5 分享卡**（spec 6.4 已寫入樣式與分享方式）：`src/logic/shareCard.ts` 組資料（亮／暗 token、片假名替換沿用 `punFor`、依第一個對應假名切出強調片段），`ShareCard` 元件以 360pt 設計稿渲染，`PunShareButton` 畫面外渲染 → `react-native-view-shot` 輸出 1080×1080 PNG → `expo-sharing` 開系統分享面板。入口在已解鎖的 PunCard 右上（詳情頁與 F4 總覽共用，testID `pun-share`）；鎖住或沒有諧音句的字沒有。新增 Icon `share`。
- 新增套件（`expo install`）：`react-native-view-shot` 6.1.1、`expo-sharing` 58.0.20（app.json 自動加入 `expo-sharing` plugin）。沒有動到 minimumReleaseAgeExclude（版本已過冷卻期）。原生套件，Debug build 需重新編譯。
- 開發用 `kana5min://share-preview?id=h-ku`（只在 `__DEV__`）直接顯示分享卡，截圖存在 `screenshots/phase5/F5-share-card-{light,dark,kata-light}.png`、`F5-share-sheet.png`。
- Maestro：`maestro/phase5-share.yaml`（分享圖示 → 系統分享面板 → 關閉、鎖住的字沒有圖示、總覽有圖示、預覽截圖、對照あ→ア→あ）在 iPhone 16 通過。
- **詳情頁「對照」**：`src/logic/counterpart.ts` 以同 kind＋同 romaji 找對應字，ぢ／づ（與じ／ず同 romaji）改用片假名的 `hiraganaId` 欄位精確對應；按鈕在大字下方（testID `detail-compare`），`router.replace` 切換，不動每日流程與 SRS。
- 假設：分享卡句子保留 emoji；強調字為句中第一個對應假名（含片假名版）；輸出圖在 360pt 設計稿上放大成 1080px；分享失敗時只跳 Alert。
- 環境備註：Mac 預設 locale 會讓 `pod install` 因 Unicode 編碼錯誤失敗，需要 `LANG=en_US.UTF-8`。
- 未解決：沒有在實機驗證 view-shot 離螢幕擷取（模擬器的分享面板縮圖正確顯示卡片）。

## 第五階段收尾（2026-10-28）

- **隱私權選項入口**：設定頁「資料」區新增「隱私權選項」（testID `row-privacy-options`），`src/monetization/privacyOptions.ts`：`AdsConsent.getConsentInfo()` 若 `privacyOptionsRequirementStatus` 為 UNKNOWN 先 `requestInfoUpdate()`，只有 `REQUIRED` 才顯示（判斷為純函式 `shouldShowPrivacyOptions`），按下呼叫 `AdsConsent.showPrivacyOptionsForm()`。離線或錯誤時視為不需要（不顯示）。需在 AdMob 後台建立 GDPR 訊息、且使用者落在需要的地區，這一列才會出現；實機驗證需開發者進行。
- **已購買不出現廣告入口**：`punCardState`、`canWatchRewardedAd`（`src/logic/punUnlock.ts`）抽成純函式，PunCard 與 PunUnlockSheet 共用；已購買時 PunCard 一律是已解鎖卡、解鎖面板不渲染看廣告鈕、`watch()` 直接返回，不會呼叫 `showRewardedAd`。
- **移除 RECORD_AUDIO**：專案內沒有任何錄音或麥克風程式（`src` 與 `app` 沒有 expo-audio 的 recorder、expo-av、getUserMedia）。RECORD_AUDIO 來自 expo-audio config plugin 的預設（`recordAudioAndroid` 預設為 true），所以 app.json 同時移除 `android.permissions` 的 `RECORD_AUDIO`，並把 expo-audio plugin 設為 `recordAudioAndroid: false`。保留 `MODIFY_AUDIO_SETTINGS`、`FOREGROUND_SERVICE`、`FOREGROUND_SERVICE_MEDIA_PLAYBACK`（播放音檔用）。iOS：`microphonePermission: false`，app.json 的 `infoPlist` 沒有 `NSMicrophoneUsageDescription`；以 `expo config --type introspect` 確認輸出的 Info.plist 與 Android 權限都沒有麥克風項目。原本待確認事項中「Android RECORD_AUDIO」一條已處理。

- **App 名稱統一**：手機上顯示「諧音五十音」（app.json `name`，slug、bundle id、scheme 不變）；CLAUDE.md、docs/architecture.md、goals/05 已改，商店上架名稱不變。RevenueCat／AdMob 後台的 `Kana 5min` 是後台名稱，沒有改。Maestro 流程沒有 assert App 名稱（只有 `common/preset.yaml` 的註解與「打開」按鈕比對）。
- **store/ 補齊**：新增 `privacy-policy.md`、`screenshots.md`、`privacy-labels.md`（Apple 隱私標籤＋Google 資料安全性）；`app-store.md`、`google-play.md` 各欄位標示程式計算的字數（名稱 13、副標 19、宣傳文字 79、關鍵字 41 字元／91 位元組、描述 543、簡短說明 40、IAP 名稱 5、IAP 描述 21／59），原稿寫的「14 字元」「約 20 字元」已更正。`setup-checklist.md` 改為依後台實際進度勾選，移除 Banner／Interstitial／ATT。
- **假設**：`privacy-labels.md` 中 Apple 各類型的用途與「連結到使用者」細項是依 SDK 行為整理的建議，後台實際值以後台為準；Google「4 種資料」我解讀為 4 大類（財務資訊、應用程式活動、應用程式資訊與成效、裝置或其他 ID）。`screenshots/` 現有截圖是 1206×2622（6.3 吋），不是 App Store 6.9 吋尺寸，Google Play 也會因長寬比超過 2:1 被退，需在 6.9 吋模擬器重截，記在 `store/screenshots.md`。
- **測試指令備註**：在這個 `.claude/worktrees/` 下的 worktree 執行 jest 時，`--testPathIgnorePatterns '.claude/worktrees'` 會把自己也忽略（找不到任何測試）；在 worktree 內直接 `pnpm exec jest` 即可（336→341 個測試通過）。

## 開發者待辦清單（只列還沒做的，依優先順序；2026-10-28 更新）

1. ✅ EAS 環境變數已於 2026-10-28 全部設好（production 環境）：`EXPO_PUBLIC_RC_IOS_KEY`、`EXPO_PUBLIC_RC_ANDROID_KEY`（開發者自己貼入真的 key）、`EXPO_PUBLIC_ADMOB_REWARDED_IOS`、`EXPO_PUBLIC_ADMOB_REWARDED_ANDROID`。
2. ✅ 導流頁已於 2026-10-28 補齊：壽司日檢真實圖示（`assets/images/sushi-jp-icon.png`，取自 `jlpt5minapp`）、正式商店連結（iOS 開 App Store、Android 開 Google Play）、三個賣點（取自壽司日檢 App Store 商店說明：N5 到 N1 全等級單字、假名標音、每天 5 分鐘＋收集 26 種可愛壽司）。
3. **RevenueCat**：Play Store App 上傳 service account JSON（之後 Android 商品才會變成有效）。
4. **AdMob**：帳號付款資料；「隱私權與訊息」建立 GDPR 訊息（UMP；不需要 IDFA／ATT）；上架後把兩個 App 連結到商店。
5. ✅ 商店截圖 8 張已於 2026-10-28 上傳（Google Play 草稿、App Store 1.0 版本頁；檔案在 `store/screenshots/`）。App Store 的欄位接受的是 6.1／6.3 吋尺寸（1206×2622），不是 6.9 吋。
6. **Apple**：App 審查聯絡人資料、付費 App 合約與稅務／銀行資料；上傳 build 後，送審時對內購按「新增以供審查」（內購審查截圖已於 2026-10-28 換成紅色版；App Store 截圖也已上傳）。
7. **Google Play**：付款資料；AAB 已上傳內部測試，內購商品已建立並啟用，商店資訊（圖示、主題圖、手機截圖）已存為草稿。
8. **兩平台沙盒購買與恢復購買實測**（iOS Sandbox 帳號、Google Play 授權測試人員）。
9. **Android 實機測試**：確認兩平台都看到測試獎勵廣告，隱私權選項（歐盟地區）可開啟表單。
10. **人工聽音檔（選做）**：重點 62 個已於 2026-10-28 聽完並修正；其餘一般假名音檔有空可再抽聽。

已完成（2026-10-28）：App 圖示與啟動圖（`assets/images/`，紅底「あ」加「啊」對話框）、Google Play 512 圖示與 1024×500 主題圖（`store/graphics/`，已上傳並存草稿）、Apple 內購審查截圖換新、合併後全套 Maestro（15 個流程）通過。

## 新手教學（2026-10-28）

- 新增首次導覽 3 頁（`app/tour.tsx`）、學新字三則提示氣泡（`CoachTip`）、首頁「？」說明面板（`HomeHelpSheet`）、設定「重看教學」；旗標 `tourSeen`、`learnTipsSeen` 持久化，舊使用者遷移為已看過（純函式 `src/logic/tour.ts` 有單元測試）。細節見 spec 5.10、docs/architecture.md 第 14 節。
- Maestro：`common/onboard.yaml`、`phase1-onboarding.yaml`、`phase6-timed-session.yaml`、`screenshots/phase1-capture.yaml` 加上略過導覽；新增 `phase7-tour.yaml`。
- 假設：提示氣泡「離開畫面也算看過」；氣泡排在版面內而不是浮層，避免攔截點擊；重看教學結束後回到設定頁；「重看教學」放在「關於」區第二列（版本列之後）。
- 環境備註：這台模擬器上的 Debug App 預設只連 localhost:8081 的 Metro，深連結指定其他埠不一定有效；8081 空著時直接用 8081 最穩。


## 本地提醒優化＋召回通知＋看字選音揭曉顯示假名（2026-10-28）

- **看字選音揭曉**：作答後各選項右側顯示「假名 拼音」（正確「う u・正確」、選錯「さ sa」、其他「あ a」；片假名用片假名）。拼音自動淡出時假名仍顯示（「う・正確」），選錯一律顯示拼音。組裝抽成純函式 `revealTag`（`src/logic/quizSee.ts`）。選項的 accessibilityLabel 在揭曉後包含標記文字（Maestro 斷言用）。
- **提醒**：改為「滾動排未來 7 天單次 DATE 通知」（`src/notifications/reminder.ts`、`reminderPlan.ts`、`reminderCopy.ts`、`reminderTime.ts`、`syncReminders.ts`）；舊版每天固定的通知（`kana5min-daily-reminder`）升級後會被清掉。排程時機：App 啟動／回前景（`app/_layout.tsx`）、`finish()` 內 `markPracticed` 之後（`sessionStore`）、設定頁開關／改時間。召回 3、7 天（`kana5min-recall-3/-7`，時間用提醒時間），只在提醒已開且已有權限時排；召回日不再排每日提醒（避免同一時間響兩次）。
- **第一輪練完詢問**：`app/result.tsx` 的詢問卡，testID `reminder-ask`、`reminder-ask-yes`、`reminder-ask-no`；設定旗標 `reminderAsked`（`settingsStore`，集中在一塊並加註解）。權限被拒時 Alert 說明並維持關閉。
- **設定頁**：提醒列說明文字加上「練過的日子不會打擾你」，權限被拒文案更清楚。
- **測試**：jest 新增 `src/notifications/__tests__`（排哪幾天：跨月跨年、已過時間、今天已練、召回讓位；文案優先順序；召回排程與取消、有開才排、不請求權限），`revealTag` 測試；`jest.setup.js` 新增 expo-notifications mock。Maestro：`maestro/phase8-reminder.yaml`。
- **假設**：1) 「第一次完成一輪」＝從未問過且提醒未開，所以升級的舊使用者下一次練完也會被問一次。2) 每日提醒窗口為 7 個「有排的日子」（今天不排時從明天起 7 天）；窗口與召回日重疊的那天讓位給召回。3) 最近一則的待複習數與連續天數用排程當下的資料；其餘天用通用文案。4) 7 天召回「已學字數」＝已學的假名數（平假名＋片假名）。
- **待真機驗證**：通知準時跳；練完後當天不跳（已練的日子之後仍會跳）；3、7 天沒開 App 的召回（可暫時改系統時間）；iOS 權限被拒後的 Alert 與「前往設定」；通知文案在鎖定畫面不被截斷。
- **驗證**：iPhone 17 模擬器、Metro 8081。Maestro 全套 16 個流程中 15 個通過（含新的 `phase8-reminder`，看字選音揭曉斷言 `".*聲音 . .+ .*・正確"`、詢問卡出現與只問一次、設定頁說明文字）；`phase4-graduate` 失敗是舊的導流頁賣點文案斷言（「從 N5 基礎單字開始」，主分支已改文案，非本次造成）。截圖（亮暗各一）在 `screenshots/phase8/`（看字選音揭曉、結果頁詢問卡、設定頁提醒列），文字沒被切掉，兩種主題顏色正確。截圖腳本 `maestro/screenshots/run-phase8.sh`。
- **備註**：設定頁提醒列是 Pressable，accessibilityLabel 會蓋掉子文字，所以說明文字也放進了 accessibilityLabel（Maestro 才看得到）。
## 描寫判定改版（2026-10-28，分支 claude/jovial-haibt-7071a7）

- **問題**：舊版 `evaluateTrace` 只檢查筆畫數達一半與第一筆方向，亂畫、寫成別的字都會通過，也沒有回饋。
- **做了什麼**：新增 `src/logic/traceShape.ts`（逐筆重取樣比對、位元遮罩 DP 配對、不強制筆順、允許漏 1 筆（≥ 5 筆字）與多畫 2 筆）；`TraceCanvas` 新增 `highlight`（漏掉的筆用 `t.accent` 閃爍後持續亮著）；`app/learn/trace.tsx` 改為失敗時亮起漏筆＋提示、通過時 0.8 秒「描得很好」、失敗 3 次出現「先跳過」（`src/logic/traceAttempts.ts`）。舊 `evaluateTrace`／`MAX_FIRST_STROKE_ANGLE` 從 `trace.ts` 移除，新版從 `traceShape.ts` 匯出同名函式。
- **測試**：`traceShape.test.ts` 用真實 KanjiVG 資料做屬性測試（142 個假名 × 20 種子正例 100% 通過；反例 20022 組失敗率 98.03%；亂塗、漏筆、反向、多畫皆符合），閾值與理由寫在 docs/architecture.md 第 8 節。新增 `maestro/phase9-trace.yaml`。
- **假設**：(1) 平均距離閾值定 18（建議值 16 在 ±8 平移加 ±5 雜訊的極端組合下偶爾失敗）；(2) 長度比例上限加固定寬容量 20，且標準只有 1～2 筆的字多畫上限為 1 筆（否則 く 之類會被多筆字蓋過）；(3) 誤通過的不逐對列白名單（形近字 115 組、多畫容許 280 組），改在測試印出並檢查易混淆組；(4) 失敗後補畫時即時重新比對、亮起的線只剩還沒描到的；(5) 開發版長按通過也會顯示「描得很好」0.8 秒。
- **尚未完成**：Maestro 流程（含既有 trace 相關流程）與亮暗兩種主題的截圖（`screenshots/phase9/`）尚未跑，等 8081 可用。

## 濁音、半濁音、拗音諧音梗接進 App（2026-10-29，分支 claude/puns-dakuon-yoon-856add）

- **做了什麼**：`scripts/gen-puns.mjs` 同時讀 `kana-puns.md` 與 `kana-puns-dakuon-yoon.md`（只收 ✅），產生 `PUNS`（清音，romaji 為 key）與新的 `VOICED_PUNS`（濁音／半濁音／拗音，平假名 kana id 為 key，如 `h-za`、`h-cha`；ぢ、づ 不會蓋掉じ、ず）。`--check`、`--list`、`pnpm gen:puns`、`pnpm check:puns` 都涵蓋兩份檔；目前 53 句（清音 42＋濁拗 11：ざ じ ぜ ぞ ど び ぶ べ ちゃ ちゅ じゃ）。之後使用者在 md 填更多句子，重跑 `pnpm gen:puns` 即更新。
- **App**：`soundOf` 對濁拗回傳 `h-xxx` key；片假名版 `toKatakana` 改成整串轉換（拗音整組換）。字詳情頁、學新字、分享卡、買斷頁範例都經 `punFor`，自動涵蓋；沒句子的字不顯示卡片。好笑記法總覽頁（F4）新增「清音／濁音・半濁音／拗音」分頁（沒句子的格子標「—」）。
- **測試**：jest 400 個全過、`tsc --noEmit` 通過（含解析 key 衝突、拗音片假名轉換、濁拗只能買斷的解鎖判斷、md 同步檢查）。`maestro/phase5-puns.yaml` 新增 F 段（未買斷鎖住且面板無看廣告、が 無卡片、買斷後詳情與總覽看得到；買斷頁斷言改為「53 句」）。
- **假設**：(1) 解鎖規則最簡單：濁音／拗音只透過買斷解鎖，不進看廣告的 3 字批次，面板上有說明；免費清單維持あ行、か行；已買斷全部可看。(2) 買斷頁「解鎖全部 N 句」用總句數（含濁拗）。(3) 總覽頁沒句子的格子點了無反應。
- **尚未完成**：Maestro 流程與亮暗截圖（`screenshots/phase5/`）**沒有跑**——這台機器的 8081 被不相干的 vite（`/Users/jiayu/Desktop/slm-upper`，pid 3178）佔用，Debug App 只連 8081，我沒有去關別人的服務；試過 Metro 8082＋`RCT_jsLocation` 也無效。8081 空出後：`pnpm exec expo start`，再跑 `maestro test maestro/phase5-puns.yaml`（亮暗截圖檔名 `F1-Dakuon-Locked-light` 等需補暗色）。
- **備註**：用 `--testPathIgnorePatterns '.claude/worktrees'` 在 worktree 內會把自己的測試也排除（顯示 No tests found），在 worktree 內直接 `pnpm exec jest --watchman=false`。

## 介面整理：能按與不能按（2026-10-29）

- 原因：整個 App 用「surface 底＋細邊框」同時畫能按與不能按的東西，使用者分不出來。照使用者逐頁選定的方案整理（預覽頁的選擇清單見對話記錄）。
- 規則：純資訊的卡片一律用無邊框的 `flat` 底（新 token `flat`，`Card flat`、`StatCard`）；能點的磚塊或列有箭頭或圖示；純文字連結一律用 `TextLink`（主色加底線）。
- 改動：首頁、五十音表（已學右上角紅勾，說明移到上方）、練習（自動練習、常搞混、特殊音改清單列）、設定（每日提醒拆成「時間」「開關」兩列）、字詳情（「看相似的字」兩塊磚，容易搞混可以點進去）、易混淆組（大卡右上喇叭）、特殊音、學新字、練習結果、完成一行、片假名開始、畢業、下一步、買斷頁、導覽、好笑記法總覽（沒有諧音的格子不顯示）。
- 假設：字詳情「筆畫」改成大字下方一行小字；特殊音拗音格子放小喇叭（不是箭頭，因為它是播放聲音）。
- 截圖：`screenshots/ui-affordance/`（亮暗各 7 張，`maestro/screenshots/run-ui-affordance.sh`）。

## 介面整理第二輪＋找不同題型（2026-10-29）

- 首頁統計改成可點的磚塊（有箭頭）：待複習／今天新字點開面板（列出是哪幾個字，下面「開始今天的練習」／「開始學新字」），已學到五十音表。練習結果、畢業頁的統計維持純數字（無卡片無細線）。
- 練習頁自動練習：還沒有任何已學的字時顯示鎖頭與「完成今天第一輪練習後解鎖」，不再是點了沒反應的灰卡。
- 五十音表：拿掉「可以先瀏覽，平假名學完後開始學片假名」紅色提示（片假名一直可瀏覽）。
- 新題型 odd／all／seq（`src/logic/groupGames.ts`），取代易混淆字的兩選一：快速辨識 10 題與自動練習的易混淆字題都改用。元件 `QuizOdd`、`QuizAll`、`QuizSeq`、`QuizGridCell`；`app/quiz.tsx` 依題型切換。
- 假設：待複習面板的主按鈕沿用「開始今天的練習」（每日練習本來就會帶出所有到期字，不另做只複習的流程）；字串題（seq）只記目標字的對錯，避免一題答錯被算成兩次答錯。
- 測試：單元測試 409 個、Maestro 19 個流程全過；新增 `maestro/phase10-affordance.yaml`；截圖 `screenshots/ui-new/`（`maestro/screenshots/run-ui-new.sh`）。

## 批 0、批 1：最常搞混的目錄（2026-10-30）

- 練習頁「最近常搞混」改名「最常搞混的」，只放最常錯的 3 組（沒有答錯紀錄時預設 ぬ・め、る・ろ、シ・ツ；片假名未解鎖時用 わ・ね・れ 補上），下面「看全部 N 組」進完整目錄頁 `app/confuse/index.tsx`（平假名／片假名標籤，目前共 5 組，之後補組再加分類）。純函式 `topConfusionGroups`、`groupsByTab`（`src/logic/confusion.ts`）有單元測試。
- 首頁待複習／今天新字兩個面板改成共用同一個 Modal，避免 iOS 上前一個還在收起時下一個開不起來。
- 掉字歸類手感實驗 `app/drop-lab.tsx`（只有開發版在練習頁看得到入口）：手指拖字到籃子、5.5 秒掉到底、同時最多 2 個、第一次的教學動畫。正式版要做的事見實作計畫（批 5）。
- 還原了舊的「找出所有」改一半的修改；題型引擎整個之後在批 3 重寫。
- 假設：phase10 的 Maestro 流程中，「待複習」面板要重開 App 再測，因為同一次啟動裡 Maestro 讀不到第二個 Modal 的內容（畫面實際有開，截圖確認過）。
- 截圖：`screenshots/ui-batch1/`（`maestro/screenshots/run-ui-batch1.sh`）。

## 批 2：「你可以這樣記」（2026-10-30）

- 對比頁（`app/confuse/[id].tsx`）在「差在哪裡」下面加一列「你可以這樣記」（有箭頭，點開底部面板 `MnemonicSheet`）。面板每個字一張卡：左邊是用筆畫資料畫的字（`MnemonicGlyph`），要提醒的地方用紅色疊上去並重複播放（る、ぬ、ね 圈出尾巴的圈；シ、ツ 依序描出兩點和長筆，看得到筆畫方向），右邊一句話；最下面一句話講怎麼分。
- 資料在 `src/data/mnemonics.ts`；審核表 `mnemonics-batch2.md`（使用者審核後再改句子）。ソ・ン 先標 `pending`，面板顯示「這組的記法還在整理中」。單元測試 `src/data/__tests__/mnemonics.test.ts`（每組都有、成員一致、筆畫編號存在）。
- 紅色用 `wrong` token；紅圈座標用 KanjiVG viewBox 估的，有偏差之後在 `mnemonics.ts` 調。
- 假設：句子是用使用者先前同意的關鍵字（滷肉飯、路、麵、眼、碗、貓、腳）重寫的草稿；わ・ね・れ 的わ、れ、ぬ・め 的め、ろ 沒有紅色標記（用文字說明）。
- `package.json` 的 jest 加上 `testPathIgnorePatterns`（忽略 `/.claude/`），避免 worktree 裡的測試被主專案一起跑。
- Maestro：`maestro/phase10-mnemonic.yaml`（面板內容；ソ・ン 重開 App 再測，同批 1 的原因）；截圖 `screenshots/ui-batch2/`（`maestro/screenshots/run-ui-batch2.sh`）。

## 批 3：新題型引擎（2026-10-30，分支 claude/quiz-engine-3fda90）

- **目標**：之前的「找不同」等題型太容易被猜出來，改成「作弊測試」（完全不認識假名的人不能靠猜或排除法答對）過關的題型。設計與細節見 docs/architecture.md 第 9 節。
- **題型**（`src/logic/groupGames.ts`、`src/logic/wordRead.ts`；元件 `QuizFindAll`、`QuizReadSeq`、`QuizSeq`、`QuizWordRead`；`QuizOdd`、`QuizAll` 已刪）：
  - 找出所有 `findall`：給拼音＋聲音，不顯示字形與答案數量；3 對（片假名 2 對）易混淆字、每個字形各出現 1 或 2 次、全部洗牌；全對才算對。
  - 念出一串 `readseq`：3～5 個假名，從固定位置的拼音鍵盤（依五十音表排版，只放已學的字）輸入；作答前不播放聲音。
  - 聽音選字串 `seq`：4 個不重複的字，三個選項是其中 3 個位置的三種輪換，兩兩距離相同、型態相同。
  - 看詞選拼音 `wordread`：外來語詞庫看詞選拼音，選項只在一個音節不同；答完才顯示意思並播放。
  - 10 題一輪同一題型最多 2 題（`planTypes`）：自動練習、快速辨識（る・ろ 這類組：找出所有／念出一串／聽音選字串／看字選音／聽音選字各 2 題）。
- **作弊測試**（`cheatTest.test.ts`，N = 4000 的抽樣）：findall 每種字形次數相同、答案字形的種類序號／格子位置／數量均勻、亂勾幾乎不可能全對；readseq 鍵盤不隨題目變、亂按答對率 < 1%；seq 每個選項到其他選項的距離總和相同、聲音型態與字形型態一致、答案位置與「三個選項相同的位置」均勻；wordread 選項兩兩距離 1、答案位置均勻、「選詞庫裡較常見的音節」的答對率不顯著高於 25%。
- **計分介面（給另一個 session 的掉字遊戲用）**：`import { recordKanaResult, recordConfusion, confusedWith } from '../src/scoring'`
  - `recordKanaResult(kanaId: string, correct: boolean, now?)`：某個假名的一次對錯（累計到 sqlite `kana_stat`），不影響 SRS。
  - `recordConfusion(truth: string, picked: string, now?)`：「把 truth 當成 picked」（兩個都是 Kana id，相同不記），累計到 `confusion_pair`。
  - `confusedWith(truth)`：回傳 `{ pickedId, count }[]`，次數由多到少。
  - 都不會丟錯（repository 尚未載入時只更新記憶體）。需要寫進 SRS 的掉字遊戲仍用 `sessionStore.recordAnswer(s)`，或自己呼叫 `progressStore.commitRound`。
- **SQLite migration**：`src/db/sqliteRepository.ts` 新增 `kana_stat`、`confusion_pair` 兩張表（`CREATE TABLE IF NOT EXISTS`，舊資料庫升級只多出新表，`progress`／`confusion` 資料不動），`PRAGMA user_version = 2`；`ProgressRepository` 新增 `getKanaStats/addKanaResult/getConfusionPairs/addConfusionPair`（記憶體版同步，`reset` 一併清掉）。`progressStore` 新增 `kanaStats`、`confusionPairs` 狀態。
- **流程**：`sessionStore.recordAnswers(perKana)`（一題多個假名各記一筆，整題只算作答一次）；`app/quiz.tsx` 依 `AnswerDetail` 記混淆（選擇題答錯記「把正確的字當成選到的字」）。`SESSION_SAVE_VERSION` 1 → 2：舊存檔（含已移除的 odd／all 題）一律作廢。
- **「最常搞混的」排序**：`topConfusionGroups` 維持現有行為（只加不改），之後可以改用 `confusion_pair`。
- **測試**：tsc 乾淨；jest 全過（新增 groupGames、cheatTest、wordRead、planTypes、計分／repository 測試，既有 sessionStore／confusion 測試改為新題型）。
- **假設**：
  1. 詞庫是 `loanwords()` = 97 個（使用者說 112：含 15 個 `exampleOnly` 的例字，這些原本就不進外來語題）；ギョウザ 的拼音（ō 長音）拼不出來，自動排除，其餘 96 個都能出題。
  2. 每個假名各自計分後，結果頁的「答對 X／Y」是依作答筆數算：一題多字的題型會算成好幾筆。
  3. findall 的「全選」位置沒有顯示數量；m = 1 時一種字形只出現一次，所以不一定「有很多個」。
  4. seq 與 findall 為了對稱會混入同一種文字的其他字組當干擾（所以快速辨識 シ・ツ 的題目也會出現 ソ・ン）；答案字仍限該組。
  5. 平假名階段 K = 3 對、片假名 K = 2 對，因為只有 5 組易混淆字；需要更多組才能增加格子數。
  6. 作答前不提供聲音的題型：readseq、wordread（聲音會直接洩漏答案）；作答後才播放。
- **沒有在模擬器驗證**：8081 目前被主 checkout（/Users/jiayu/Desktop/kana5min）的 Metro 佔用（Debug 版只連 8081），我沒有關它。新增 `maestro/phase11-new-quiz-types.yaml`、更新 `common/answer-quiz.yaml`、`answer-one.yaml`、phase2-auto-practice、phase2-confuse、phase3-loanword、phase8-reminder 及截圖腳本（新增 `maestro/screenshots/run-ui-batch3.sh` → `screenshots/ui-batch3/`），**全部尚未跑過**。合併到 main 後請在 iPhone 17 跑全套 Maestro 與截圖（亮暗各一），並看一下 findall 6 格與 12 格、readseq 鍵盤（10 列時）是否擠在一個畫面。

## 批 4：遮一半猜字、默寫自我檢查、抓錯字（2026-10-30，分支 claude/quiz-engine-3fda90）

- **遮一半猜字 `maskhalf`**（`src/logic/maskHalf.ts`、`QuizMaskHalf`）：KanjiVG 筆畫只露出一半，選項只放拼音，兩對選項結構對稱；露出的那半要和其他選項的字有足夠差異（ぬ／め 遮掉圈就不可用，單元測試固定）。進自動練習與快速辨識（有易混淆字組時）。
- **默寫自我檢查 `recall`**（`QuizRecall`）：看拼音＋聲音，翻面核對、自評。只在有易混淆字組可用時進自動練習，占用看字選音／聽音選字的名額。
- **抓錯字 `spoterr`**（`src/logic/spotError.ts`、`QuizSpotError`）：引擎、計分、介面都做完並有測試（用佔位詞），**詞沒有放進 App、沒有產音檔**：候選詞在 `words-spot-error.md`（平假名 21 個、片假名 13 個，含讀音、意思、易混淆字）等你核可。核可前 `SPOT_ERROR_IN_PRACTICE = false`，正式版不會出現抓錯字；開發版用 `kana5min://quiz?mode=dev-spot` 看介面（`sessionStore.startQuestions`）。
- **作弊測試**（`maskHalf.test.ts`、`spotError.test.ts`）：maskhalf 選項只有拼音、答案位置均勻、兩對結構對稱、隨機選 ≈ 25%；spoterr 被換位置在所有易混淆字中均勻、亂點易混淆字的答對率 ≈ 1／個數。
- **Maestro**：新增 `maestro/phase12-spot-error.yaml`（抓錯字佔位詞、默寫自我檢查）；`common/answer-quiz.yaml`、`answer-one.yaml`、phase2-auto-practice、phase2-confuse、phase3-loanword、phase11 都加了 maskhalf／recall／spoterr 的處理。刪掉 `ui-new-capture.yaml`／`run-ui-new.sh`（已被 `ui-batch3-capture.yaml`／`run-ui-batch3.sh` 取代，裡面還有已移除的 `quiz-odd`）。`maestro/screenshots/phase2-capture.yaml`、`phase3-capture.yaml`、`ui-affordance-capture.yaml` 的測驗迴圈在批 3 之前就沒處理找出所有／字串題，這次也沒更新（只是截圖腳本，不是驗收流程）。
- **假設**：
  1. 抓錯字的詞池規則：每個詞至少 2 個易混淆字（同字重複算 1 種，所以 ろくろ 不合格；候選清單有列出這個決定請你決定）。
  2. 默寫自我檢查的對錯完全是自評，直接進 SRS 與計分；沒有另外的防作弊。
  3. maskhalf 的「看得出來」用 KanjiVG 筆畫取樣判斷，畫面也用 KanjiVG 筆畫繪製（和判斷用同一份資料）；字型（Klee One）的字形不會用在這題。
- **沒有在模擬器驗證**（同批 3：8081 被主 checkout 的 Metro 佔用，我沒有關它）：`QuizMaskHalf`、`QuizRecall`、`QuizSpotError`、`QuizReadSeq`、`QuizFindAll`、`QuizWordRead` 六個新畫面全都沒看過實際版面；phase11、phase12 與更新過的 Maestro 流程沒跑；亮暗色截圖（`screenshots/ui-batch3/`）沒有。合併後請在 iPhone 17 跑 `maestro test maestro/phase11-new-quiz-types.yaml maestro/phase12-spot-error.yaml`、`maestro/phase2-auto-practice.yaml`、`phase2-confuse`、`phase3-loanword` 與全套，並用 `maestro/screenshots/run-ui-batch3.sh` 截圖。需要特別看：念出一串鍵盤 10 列時的高度、找出所有 6 格（3 欄）與 12 格（4 欄）的版面、遮一半的 SVG 在暗色下的筆畫顏色。

## 批 5：掉字歸類正式版（2026-10-30）

- 入口：練習頁「掉字歸類」卡片（所有人都看得到，取代原本只有開發版的手感實驗，`app/drop-lab.tsx` 已刪）。對比頁底下多一顆「用這一組玩掉字」（該組所屬推薦字組、學過的字至少 3 個才出現）。
- 選字（`app/drop/index.tsx`）：推薦最多 3 組（依對應易混淆組的答錯次數排序，同分預設し・つ・そ・ん → る・ろ・ぬ・め → ぬ・め・わ・ね・れ，只放學過的字至少 3 個的組）、隨機（從學過的字抽 4 個）、自己選 3～6 個。學過的字不到 3 個時顯示「先學會 3 個字就能玩」。「怎麼玩」可以隨時重看。
- 遊戲（`app/drop/play.tsx`）：一關 12 個字，同時最多 2 個，5.5 秒掉到底；籃子 3～4 個一列、5～6 個兩列，每關重新打散順序。四個階段依序進階：片假名→平假名、平假名→片假名、片假名→拼音、平假名→拼音（片假名還沒解鎖或選的字沒有片假名時只玩最後一個）。沒有愛心：放錯或掉到底各算錯一個，錯 1 個以內過關，沒過關可以再試同一階段，一關一定玩完 12 個。
- 暫停：左上 ✕ 暫停（字停住），也會在 App 進背景時自動暫停；暫停選單可以繼續、重看怎麼玩、離開。離開或中途放棄不計分，只有打完一關才寫進計分。
- 計分：打完一關後用批 3 的介面逐字記錄（`recordKanaResult`；歸錯的另外 `recordConfusion`，用掉下來的那種文字）。
- 設定：「掉字遊戲操作」（拖曳／點籃子，預設拖曳）；點籃子模式下點哪個籃子，最早掉下來的字就放進去。教學只在第一次進遊戲出現（`dropTutorialSeen`），之後從「怎麼玩」看。
- 純邏輯在 `src/logic/dropGame.ts`（有單元測試 13 個）；拖曳手勢的籃子判定用 `slotAtPoint`（也給 worklet 用）。
- 假設：推薦字組是固定三組（見 `DROP_PRESETS`），對比頁的組對應到包含它的字組；不同組合的片假名階段，要所有選的字都有片假名對應字。拖曳本身 Maestro 模擬不了，流程用開發版的「dev 全對／全錯」直接結算一關；手感以你在實機上測為準。
- 順帶：phase2-confuse、phase1-theme 流程因為新增卡片把內容擠到螢幕外，改成先捲動；Metro 因為刪檔案出現快取錯誤，重啟並清過快取。
- Maestro：`maestro/phase13-drop.yaml`；截圖 `screenshots/ui-batch5/`（`maestro/screenshots/run-ui-batch5.sh`）。

### 批 2 改版：「你可以這樣記」改成對比＋記憶包諧音（2026-10-30）

- 原因：記憶包本來就有每個字的諧音句，面板再寫一套會重複、還會衝突（ぬ＝麵 vs 記憶包「奴才」）。改成：面板每個字旁邊放「差異提示」（例如「底部有圈」）加紅圈／紅線動畫，諧音句直接沿用記憶包。
- 諧音句遵守記憶包的收費：已解鎖（或買斷）的字顯示句子；沒解鎖顯示「解鎖諧音」，點下去關掉面板、過 400ms 開記憶包的解鎖面板（`PunUnlockSheet`，同時開兩個彈出層 iOS 會失敗）。沒有諧音句的字（例如 つ）什麼都不顯示。
- 資料 `src/data/mnemonics.ts` 不再有句子，只有 `cue`、`marks`、`howToTell`。標記新增 `path`（自訂路徑）；ソ 的紅線是「長筆＋手畫的下半彎」近似昭和寫法的 そ，位置是估的，之後可在 `mnemonics.ts` 微調。`MnemonicGlyph` 的標記改成依序播放（先描筆畫再畫圈或路徑）。
- 沒有記法資料的組也會列出每個字與諧音句（批 6 新增的組不用另外寫記法）。
- 作廢：`mnemonics-batch2.md`（句子審核表）已刪除；`confusable-groups-batch6.md` 裡各字的「待補」句子欄不用填，諧音一律用記憶包。
- Maestro：`phase10-mnemonic.yaml` 更新（差異提示、鎖頭、點鎖頭開解鎖面板、ソ 的昭和そ）；截圖 `screenshots/ui-batch2/`。

## 批 6：新增 13 組易混淆字（2026-10-30）

- 新增 13 組（`src/data/confusables.ts`，審核表 `confusable-groups-batch6.md` 的第一批）：平假名 は・ほ、き・さ、こ・に、す・む、ま・よ、の・め、つ・う、あ・お、は・ば・ぱ（把 ほ・ぼ・ぽ 併進同一組）；片假名 ウ・ワ・フ、ル・レ、ナ・メ、コ・ユ。共 18 組。每組只有「差在哪裡」說明（筆畫數由 KanjiVG 資料核對），「你可以這樣記」面板沒有記法資料的組只列字與記憶包現有的諧音句。
- 預設（沒答錯紀錄時）練習頁「最常搞混的」不變（ぬ・め、る・ろ、シ・ツ）；其餘在「看全部」。目錄頁沒有另外分「濁音」分頁，は・ば・ぱ 放在平假名裡。
- 一個字可以同時屬於好幾組（例如 め 在 ぬ・め 和 の・め），所以：答錯 め 會兩組都累計；題型引擎修正——找出所有的格子與聽音選字串的干擾字、遮一半的干擾字，都不能是目標字所在組的字，也不重複（`groupGames.ts`、`maskHalf.ts`）。
- 對比頁的組切換從換行排列改成一列可左右滑的膠囊（18 顆排不下），選中的自動滑到可見。
- 影響（要知道）：あ・お 是新字很早就學到的兩個字，所以剛學完 あ、お 就會出現易混淆字題（自動練習解鎖後）；之前要學到 ぬ・め 以後才有。覺得太早的話可以把 あ・お 組拿掉。
- 抓錯字：因為組變多，words.json 現有的詞就有 60 個符合（含 2 個以上易混淆字）；仍然需要你核可才放進練習（`SPOT_ERROR_IN_PRACTICE` 還是 false）。
- 測試：單元測試 490 個；舊測試寫死「5 組」的地方改成不依賴組數，作弊測試用原本 5 組固定比對。

## 描寫判定收緊多畫（2026-10-30）

- 使用者回報：い 左邊一筆、右邊畫了兩筆（多一筆）還是判「描得很好」。原因：標準只有 1～2 筆的字容許多畫 1 筆（`maxExtraFor`），那一筆只要不對上任何標準筆畫就當成「多畫」放過。
- 改成：標準 1～2 筆 → 0 筆多畫、3～4 筆 → 1 筆、5 筆以上 → 2 筆（`src/logic/traceShape.ts`）。對應地 `traceShape.test.ts` 的 Z 字形不再讓 ニ 通過，並新增使用者案例的回歸測試（3 筆畫 い 失敗 `too-many`、只畫 2 筆仍通過）。
- 沒改距離門檻：平均誤差 18（約 5 毫米量級）與端點限制是依手指抖動模型校準的，收到 16 就會讓「標準筆畫加抖動」的測試掉到不是 100% 通過；使用者那兩筆的誤差還在範圍內，需要的話之後再調。
- 同時要知道：「描得很好」顯示位置（標題位置）是使用者自己改的 `app/learn/trace.tsx`，還沒 commit。

## 實機回報修正（2026-10-30 晚）

- 念出一串的鍵盤縮成細線：上一輪修正把鍵盤的 JSX 放進「刪除一個」那一列裡，已改回獨立區塊（`QuizReadSeq.tsx`）。
- 描寫、掉字、測驗被往右滑就返回（iOS 26 的全螢幕滑動返回）：`app/_layout.tsx` 對 `learn/trace`、`drop/play`、`quiz`、`special-quiz` 設 `gestureEnabled: false`、`fullScreenGestureEnabled: false`。
- 默寫自我檢查：改成真的可以用手指寫（`TraceCanvas` 新增 `guide` 屬性；翻面才顯示淡色標準字，仍是自評，不比對筆畫）。
- 看字選音揭曉格式改成「い (i)」（`revealTag`）；結果頁標題「下次複習」、每列「10 分鐘後再練」。
- 發音偶爾第一下沒聲音：`playKana` 加「載入完成後還沒開始播就再 play 一次」，**只在實機能確認**。
- 「差在哪裡」說明每句一行（`tipLines`）。
- 描寫判定收緊多畫見上一節。
- 測試：單元 495 個；Maestro 重跑 phase2-confuse、phase8、phase9、phase11、phase12、phase2-auto-practice 通過；截圖 `screenshots/ui-fixes/`（`maestro/screenshots/run-ui-fixes.sh`）。

## 掉字歸類加「拼音 → 平假名」「拼音 → 片假名」（2026-10-30 晚）

- 原因：片假名要平假名清音全部學完才解鎖，剛學的人只玩得到「平假名 → 拼音」一種，每次都一樣（畫面「階段 1/1」）。
- 現在六個階段，由簡單到難：平假名 → 拼音、拼音 → 平假名、片假名 → 拼音、拼音 → 片假名、片假名 → 平假名、平假名 → 片假名。片假名沒解鎖（或選的字沒有片假名）只玩前兩關。
- 拼音掉下來時，計分記的是籃子上那種字（拼音 → 平假名記平假名的字、拼音 → 片假名記片假名的字），歸錯的「把 X 當成 Y」也用那種字（`stageScript`）。
- 每一關仍是 12 個字、錯 1 個以內過關才換下一關；沒有關內混著出。
- 驗證：單元測試 497 個；`phase13-drop.yaml` 加了「只有平假名兩關」和「點籃子模式真的玩完一關」（拖曳仍無法在 Maestro 驗證）；截圖 `screenshots/ui-drop-stage2/`。
- 提示文字改成「按住掉下來的，拖到對的籃子」。
