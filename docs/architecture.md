# 架構決策（由 Opus 決定，實作者照做）

CLAUDE.md、spec.md、goals/ 是上位規則；這份檔案補上它們沒寫、但實作時必須統一的決定。要偏離這份檔案時，先在 PROGRESS.md 的「假設」記下原因。

## 1. 專案與工具

- Expo SDK 58（`expo ~58.0.19`）、React Native 0.88、React 19.3、TypeScript ~6.0、pnpm（`.npmrc` 設 `node-linker=hoisted`）。用 `pnpm exec expo install` 安裝 Expo 相關套件，讓版本對齊 SDK。
- 導覽：expo-router。`app/(tabs)/` 放四個分頁（`index` 今天、`chart` 五十音表、`practice` 練習、`settings` 設定），自訂底部導覽列元件（照設計檔，不用預設 tab bar 外觀）。全螢幕流程放 `app/` 底下的 stack 路由，不顯示導覽列。
- URL scheme：`kana5min`。
- 狀態：zustand。設定與一般狀態（每日目標、主題、是否已完成歡迎頁、練習日期清單、畢業是否看過）用 zustand `persist` + AsyncStorage。每個假名的 SRS 進度與易混淆字答錯紀錄用 expo-sqlite。
- 音訊：expo-audio。所有播放走 `src/audio/playKana.ts` 的 `playKana(id, { slow })`。
- 字型：`@expo-google-fonts/klee-one` 的 `KleeOne_600SemiBold`，載入完成前顯示啟動畫面。介面文字用系統字型。
- 圖示：react-native-svg，統一放在 `src/components/Icon.tsx`，路徑直接取自設計檔（見第 7 節），stroke 1 色、`strokeWidth 2`、圓角線頭。畫面上不用 emoji。
- 提醒：expo-notifications，本機單次（DATE）通知，每次 App 啟動／回前景、練習完成、設定改動時由 `src/notifications/syncReminders.ts` 取消舊的再重排：未來 7 天的每日提醒（identifier `kana5min-reminder-YYYYMMDD`，今天練過或已過時間就不排今天）＋ 3、7 天沒開 App 的召回（`kana5min-recall-3`／`-7`，召回日不再排每日提醒）。「要排哪幾天」是純函式（`reminderPlan.ts`），文案是純函式（`reminderCopy.ts`：待複習 > 連續天數 > 通用，只有最近一則用即時資料）。召回只在提醒已開且已有通知權限時排，絕不主動請求權限；權限只在使用者開啟提醒時請求（設定頁開關、或第一輪練完後結果頁的詢問卡 `reminder-ask`，`reminderAsked` 旗標保證只問一次）。
- 測試：jest-expo（`pnpm test` 跑 `jest`）。業務邏輯寫成不依賴 React Native 的純函式，放 `src/logic/`，測試放 `src/logic/__tests__/`。

## 2. 目錄

```
app/                     expo-router 路由（畫面只組裝，不寫業務邏輯）
src/theme/               tokens.ts（亮暗兩組）、useTheme.ts
src/data/                kana.ts、words.ts、confusables.ts、hints.ts、puns.ts
src/logic/               srs.ts、romaji.ts、session.ts、quiz.ts、progressStats.ts …（純函式）
src/db/                  sqlite 初始化與 progress repository
src/store/               zustand stores
src/audio/               playKana.ts、audioMap.ts（由腳本產生）
src/components/          共用元件
assets/audio/            mp3（腳本產生）
assets/strokes/          KanjiVG 轉出的 JSON（腳本產生）
scripts/                 gen-audio.mjs、tts-overrides.json、build-strokes.mjs
maestro/                 phaseN-*.yaml
screenshots/phaseN/      截圖
```

## 3. 主題 token

`src/theme/tokens.ts` 匯出 `dark` 與 `light` 兩組，鍵名一致。除了 spec 第 7 節的 11 個 token，設計檔還用到下列，一併加入：

| token | 暗色 | 亮色 |
|---|---|---|
| next（首頁進度條的下一格，目前未使用） | `#5F5C4E` | `#A8A8A4` |
| faint（描寫的淡色字） | `#322F27` | `#ECECEA` |
| guide（田字格虛線） | `#3A382F` | `#E4E4E0` |
| correctSoft（答對底色） | `#233B28` | `#E8F4E2` |
| correctText（答對文字） | `#8FD99F` | `#3F7A4A` |
| wrongSoft（答錯底色） | `#3D281F` | `#FCE5DE` |
| wrongText（答錯文字） | `#F0A487` | `#A83A28` |
| accent（主色） | `#E8734F` | `#C44830` |
| onAccent（主色按鈕上的文字） | `#1C1B18` | `#FFFFFF` |

配色對齊同團隊的壽司日檢（`jlpt5minapp/constants/tokens.ts`）：主色 accent／wrong 對應 accentRed、accentSoft 對應 accentRedTint、correct 對應 accentGreen、答對／答錯底色與文字對應 correctCard／incorrectCard 系列、bg／surface／text／chip／line 對應 bg／card／ink／fill／line。壽司日檢沒有對應或對比不足的才自行推導：muted 沿用壽司日檢灰色色調、調到對 bg 與 surface 至少 4.5:1；亮色 accentText 用較深的 `#A83A28`（放在 accentSoft 上 `#C44830` 只有 4.37）；track、guide 取同色調、能在 bg 上看得見的淺灰。onAccent 兩主題不同：亮色紅底白字 4.86、暗色亮紅底深字 5.74（白字只有 3.0）。`src/theme/__tests__/theme.test.ts` 會檢查文字對比。

元件一律 `const t = useTheme()` 取色，元件檔裡不可出現色碼字串（`#` 開頭）。唯一例外是設定頁開關的白色圓鈕，也請放進 token（`knob: '#FFFFFF'`）。

`useTheme` 規則：設定為 `system` 時用 `useColorScheme()`，否則用設定值。StatusBar 樣式跟著切換。

## 4. 假名與 id

- 平假名 id：`h-<romaji>`；片假名：`k-<romaji>`。romaji 用平文式（Hepburn）：し shi、ち chi、つ tsu、ふ fu、じ ji、を wo、ん n。
- 撞名的處理：ぢ id `h-di`（顯示 ji）、づ id `h-du`（顯示 zu）；片假名同理 `k-di`、`k-du`。
- を 的顯示 romaji 為 `wo`，音檔念 o（見 overrides），記在 PROGRESS.md 假設。
- 拗音 id：`h-kya`、`h-sha`、`h-ja` …，清單照設計檔 C2-03 的 33 個（不含 ぢゃ 行）。
- 清音 46 個依五十音順序，每個有 `row`（a, ka, sa, ta, na, ha, ma, ya, ra, wa；ん 歸 wa 行）。
- 筆畫數以 `src/data/strokes.json`（KanjiVG）為準：濁點算 2 筆、半濁點算 1 筆（例如 が 5、ぱ 4）。kana 資料的 `strokes` 必須等於 strokes.json 該字的筆畫陣列長度，並有單元測試檢查。拗音的筆畫數 = 兩字相加。
- 學習順序：清音 46 個，依序；每日新字 = 尚未學過的前 3 個（跨行就跨行）。
- 例字：每個平假名清音一個只用「到該字為止已學過的清音」組成的常見單字最理想，做不到時用常見單字即可；含中文意思。片假名例字用外來語。id 用 `w-<romaji>`，重複時加後綴。

## 5. 學習、測驗與 SRS

- 「已學」= 該字完成過一次學新字流程並作答過（`learnedAt` 有值）。
- 每日練習 = 新字（最多 3 個）+ 到期複習字（`nextReviewAt <= now` 且已學）。沒有新字也沒有到期複習時，首頁按鈕改成「今天完成了」狀態並可進入自動練習。
- 流程：每個新字依序 看與聽 → 筆順 → 描寫（2 次，可重寫），全部新字學完後進測驗。
- 測驗題目：每個新字 2 題（看字選音 1 題、聽音選字 1 題）；每個複習字 1 題（題型隨機）。題目順序打散，但同一個字的兩題不相鄰。選項 4 個，干擾選項優先取已學過的字，不足時取同類型其他字；易混淆字組的另一個字優先當干擾項。
- 單題作答：答對 `correctStreak + 1`；答錯 `correctStreak = 0`、`wrongCount + 1`。
- 一輪結束後，每個字依「這輪該字的所有題目是否全對」更新等級：全對 `level = min(level + 1, 5)`（新字從 0 升到 1）；有錯 `level = 0`。`nextReviewAt = now + interval[level]`，interval：0→10 分、1→1 天、2→3 天、3→7 天、4→14 天、5→30 天。
- 練習中不重複出題；答錯文案的「等一下會再出現」由 10 分鐘後的 SRS 達成。
- 羅馬拼音淡出：`romajiAutoHide` 開啟且 `correctStreak >= 3` 時，學習與測驗畫面隱藏該字的羅馬拼音。設定頁的「顯示羅馬拼音」開關 = `romajiAutoHide`（開＝熟練後自動隱藏；關＝一律顯示）。五十音表與詳情頁一律顯示。
- 結果頁的狀態文字：新字全對「新學會」；有錯「答錯 N 次」（用答錯色）；複習字 level ≥ 3「記得很熟」，其他「記得」。下次時間顯示「10 分鐘後／明天／N 天後」。
- 一行學完：本輪結束時，若某一行的所有字都已學，且是這輪才湊滿，結果頁之後顯示 C2-11。單字清單只列由已學假名組成的字（`src/data/words.ts` 篩選）。
- 首頁「已學」= 已學清音數 / 46；「待複習」= 現在到期數；「今天新字」= 今天會學的新字數（0–3）；各行進度條（あ行～わ行共 10 段，片假名階段為ア行～ワ行）：每段依該行已學字數填滿 accent，其餘 = track；下一個新字所在的行外加 accent 外框，標題右側顯示「學到○行」。右上角火焰數字 = 連續練習天數（今天或昨天有練才延續）。
- 測驗發音速度設定（一般／慢速）影響測驗題目的預設播放速度。

## 6. 儲存

- sqlite 資料庫 `kana5min.db`，表 `progress(kana_id TEXT PRIMARY KEY, level INT, next_review_at INT, correct_streak INT, wrong_count INT, learned_at INT NULL)`，表 `confusion(group_id TEXT PRIMARY KEY, wrong_count INT, updated_at INT)`。
- 存取透過 `ProgressRepository` 介面（`getAll`、`upsertMany`、`reset` …），sqlite 實作一份、記憶體實作一份給單元測試。
- 時間一律用 epoch 毫秒；邏輯函式接收 `now` 參數，不在內部呼叫 `Date.now()`，方便測試。

## 7. 圖示路徑（24×24 viewBox，取自設計檔）

| 名稱 | 內容 |
|---|---|
| flame | `M12 3c1 3 4 4.5 4 9a4 4 0 0 1-8 0c0-2 1-3 1-3s.5 2 2 2c0-3-1-5 1-8z` |
| home | `M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z` |
| grid | 四個 rect：(3,3)(14,3)(3,14)(14,14)，7×7，rx 1.5 |
| practice | `M9 11l3 3 8-8` + `M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9` |
| settings | circle(12,12,r3) + `M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1` |
| back | `M15 18l-6-6 6-6` |
| chevronRight | `M9 6l6 6-6 6` |
| speaker | `M4 9v6h4l5 4V5L8 9z` + `M16 9a4 4 0 0 1 0 6` + `M18.5 6.5a8 8 0 0 1 0 11` |
| speakerSmall | `M4 9v6h4l5 4V5L8 9z` + `M16 9a4 4 0 0 1 0 6` |
| slow | circle(12,12,r9) + `M10 9l5 3-5 3z` |
| close | `M6 6l12 12M18 6L6 18` |
| replay | `M3 12a9 9 0 1 0 3-6.7` + `M3 4v5h5` |
| check | `M5 12l5 5 9-10` |

## 8. 測試識別（Maestro）

- 主要可點元件都要有 `testID`，命名 kebab-case，例如 `goal-5`、`start-learning`、`tab-chart`、`next-step`、`trace-done`、`trace-redo`、`play-audio`、`theme-dark`。
- 測驗選項：開發版本（`__DEV__`）中，正確選項 testID 為 `opt-correct`，錯誤選項為 `opt-wrong-0..2`；正式版本一律 `opt-0..3`，不透露答案。
- 描寫畫布 testID `trace-canvas`。描寫判定改為逐筆比對（見本節下方「描寫判定」）；開發版本另外允許長按畫布 1 秒直接判定完成，方便 Maestro。其他 testID：`trace-done`、`trace-redo`、`trace-hint`（失敗提示）、`trace-praise`（通過時的「描得很好」）、`trace-skip`（失敗 3 次後的「先跳過」）、`trace-missing-<索引>`（亮起的漏筆）。
- 除錯選單（第四階段）：只在 `__DEV__` 下存在，用 `if (__DEV__)` 包住 `require`，讓正式包被 Metro 常數折疊移除。可用深連結 `kana5min://debug?preset=hiragana-done|all-done|reset` 觸發，Maestro 用 `openLink`。

### 描寫判定（`src/logic/traceShape.ts`，2026-10-28 改版）

舊版只看筆畫數達一半與第一筆方向，亂畫也會過。新版 `evaluateTrace(userStrokes, referencePaths)` 逐筆比對，仍然寬鬆（手指描本來就不準），但每一筆都要大致落在淡色字的那條線上、方向正確。

- 取樣：使用者每一筆與標準每一筆都在 viewBox（109）座標下，先重取樣成 48 點、做兩次 3 點移動平均（抹掉手抖鋸齒）、再依弧長重取樣成 24 點。長度用平滑後再取 7 點的粗折線量（短筆如濁點在手抖時長度不會被灌大）。長度 < 6 的線視為輕點，不算一筆。
- 一筆對上一筆的條件（`strokeMatchCost`）：平均點對點距離 ≤ 18；起點距離、終點距離各 ≤ 27（18 × 1.5，等於要求方向正確）；長度 ≥ 標準 × 0.4，且 ≤ 標準 × 2.2 + 20。
- 配對：位元遮罩 DP，每個標準筆畫最多對上一次、每個使用者筆畫最多對一個，先求對上最多筆、再求總成本最小。不強制筆順。
- 通過：標準筆畫數 ≤ 4 全部對上；≥ 5 允許漏 1 筆；多畫（沒對上）的筆：標準 1～2 筆的字 0 筆（多畫一筆就是寫錯，2026-10-30 起；之前容許 1 筆），3～4 筆的字 ≤ 1，5 筆以上 ≤ 2。使用者有效筆畫數 > 標準筆畫數 + 容許多畫數時直接 `too-many`。沒有標準筆畫資料（拗音）時視為通過。
- 輸出 `TraceEvaluation`：`passed`、`strokeCount`（有效筆畫數）、`matched`（已對上的標準筆畫索引）、`missing`（沒對上的標準筆畫索引）、`extra`（多餘筆數）、`reason`（`too-few`／`shape`／`too-many`，通過時沒有）。
- 回饋：失敗時 `missing` 的標準筆畫用 `t.accent` 在淡色字上亮起（閃爍約 2 秒後持續亮著），提示「這一筆還沒描到，跟著亮起來的線再描一次」；`too-many` 提示按「重寫」。使用者已畫的筆保留，補畫後即時重新比對，亮起的線只剩還沒描到的。通過時顯示 0.8 秒「描得很好」再進下一步（非阻擋）。
- 失敗 3 次可跳過：同一次描寫（同一個字、同一輪）按「完成」被判失敗累計 3 次後出現「先跳過」（`trace-skip`），按下視為通過（不扣分、不影響 SRS）。「重寫」不重置次數；通過、進下一輪或下一字時歸零。邏輯在 `src/logic/traceAttempts.ts`。
- 閾值依據（`src/logic/__tests__/traceShape.test.ts`，用 kana.json 中所有有筆畫資料的假名，共 142 個）：
  1. 標準筆畫加抖動（每點 ±5、整體平移 ±8、縮放 0.9～1.1，各假名 × 20 組亂數種子）通過率 100%；筆順打亂也 100%。這個測試決定了平均距離 18（16 在含平移最大值時偶爾失敗）、長度寬容量 20（點、濁點很短，手抖鋸齒會讓長度比例失真）與粗折線長度。
  2. 拿另一個假名的標準筆畫當輸入（142×141 = 20022 組）：失敗率 98.03%。誤通過分兩類：形近字 115 組（extra = 0，如 ろ／る、ね／れ、へ／ヘ、り／リ、ば／ぱ，寬鬆判定本來分不開），以及 280 組是「標準字的筆畫是對方字的一部分」（extra ≥ 1，如 く／す、こ／に）。ぬ／め、あ／お、さ／ち、わ／ね、い／り 等易混淆組都被分開（測試檢查）。
  3. 隨機直線、大圓、單點、空白全部失敗；Z 字形對所有字都失敗，唯一例外是 ニ（兩條橫線剛好在 Z 的上下，多出的斜線在容許範圍內）。
  4. 漏一筆：≤ 4 筆的字失敗且 `missing` 指出那一筆；≥ 5 筆通過。整字反向畫（對全部筆畫都是開口的字）失敗；多畫 3 筆（單筆與兩筆字多畫 1 筆、3～4 筆字多畫 2 筆）失敗。

## 9. 第二階段：練習、易混淆字、特殊音

- 易混淆字組（練習用）只有 spec 的 5 組：`ぬめ`、`るろ`、`わねれ`、`シツ`、`ソン`。group id 用 ascii（`nume`、`ruro`、`wanere`、`shitsu`、`son`）。資料放 `src/data/confusables.ts`，每組含 members（kana id）、label（`ぬ・め`）、script、差異說明 tip（照設計檔 C2-14 文字；わねれ 自寫）。kana.json 裡額外的 き/さ、は/ほ 只給詳情頁「容易搞混」用，不進練習清單。
- 片假名組（シツ、ソン）在片假名解鎖前（平假名清音 46 個全部已學之前）不出現在任何清單或題目。用一個純函式 `isKatakanaUnlocked(progress)` 判斷，第三階段共用。
- 答錯紀錄：任何題目只要「正確答案的字屬於某組」且答錯，該組 `wrong_count + 1`（寫 sqlite `confusion` 表）。不因答對而減少。
- 練習入口「最近常搞混」：列出所有可用組，依 wrong_count 由大到小（同分依預設順序），顯示「錯 N 次」。
- 新題型引擎（批 3，`src/logic/groupGames.ts`、`wordRead.ts`，純函式、rng 注入；舊的 `odd` 找不同已移除）。設計原則是「作弊測試」：完全不認識假名的人不能靠猜或排除法答對，所以每種題型都讓「看得到的結構」對每個選項完全對稱，測試見 `src/logic/__tests__/cheatTest.test.ts`（把題目轉成「不認識假名的人看到的樣子」再用各種不看假名的策略去答）。
  - `findall` 找出所有：只給拼音與聲音，不顯示字形與數量。格子 = 3 對（片假名 2 對）「成對的易混淆字」，每個字形各出現 m 次（m 隨機 1 或 2），全部洗牌；全選對才算對。答案字形的次數、位置、是否成對都和干擾字一樣。
  - `readseq` 念出一串：3～5 個假名（只用同組成員），從固定位置的拼音鍵盤輸入（依五十音表排版，只放已學的字，整列沒有鍵就不顯示）；鍵盤內容與題目無關，作答前不播放聲音。
  - `seq` 聽音選字串：4 個不重複的字（目標、同組另一個、另外兩個其他字組的字），其中 3 個位置上三個選項是同一組字的三種輪換、第 4 個位置三個選項相同；兩兩距離都是 3、組成相同，聽到的聲音型態無法用來配對。
  - `wordread` 看詞選拼音（`wordRead.ts`）：用外來語詞庫（`loanwords()`，不含 exampleOnly），4 個拼音只在同一個音節不一樣（兩兩距離 1）；替換的音節依詞庫頻率加權抽，所以答案不會比較常見；答完才顯示意思並播放，作答前沒有播放鈕。取代舊的 `loanword`（舊型別保留給舊存檔）。
  - 計分（`src/scoring/index.ts`，sqlite 的 `kana_stat`、`confusion_pair` 兩張表，PRAGMA user_version = 2，只加表）：`recordKanaResult(kanaId, correct)`、`recordConfusion(truth, picked)`、`confusedWith(truth)`；多字題型每個字各自記一筆，選錯記「把 X 當成 Y」。SRS 仍只在一輪結束時提交，與這兩張表分開。
  - Debug 版 testID：findall 目標格 `all-target-N`、其他格 `all-wrong-N`，readseq 與 findall 都有 `dev-solve`，seq／wordread 正確選項 `opt-correct`；正式版一律不透露答案。
- 自動練習 10 題：看字選音、聽音選字、找出所有、念出一串、聽音選字串、看詞選拼音（片假名有可讀外來語時）混合，同一種題型最多 2 題（`planTypes`：可用題型 × 2 >= 10 時成立，題型較少時平均分配；沒有易混淆字組可用時維持每個已學字最多 2 題）。易混淆字題的出題組以權重抽：weight = 1 + wrong_count，只考慮「至少 2 個成員已學」的組；沒有符合的組時就不出這類題。以注入 rng 的純函式實作並寫測試（驗證答錯多的組被抽中機率較高）。
- 易混淆字對比頁的「快速辨識 10 題」：找出所有、念出一串、聽音選字串、看字選音、聽音選字（組內）各 2 題，答案字限該組成員（找出所有、聽音選字串會混入同一種文字的其他字組當干擾）。已學的字照常更新 SRS 與 correctStreak；未學的字只更新答錯紀錄，不寫 SRS。
- 特殊音練習（長音／促音／拗音）：每類一組最小對立詞（每對兩個詞、意思不同），題目＝播放其中一個詞，二選一選出聽到的詞。每類 6 題（3 對 × 正反）。不影響 SRS。詞彙加入 words.json（含中文意思）並重跑 `node scripts/gen-audio.mjs` 產生音檔。建議詞對：
  - 長音：おばさん／おばあさん、おじさん／おじいさん、ゆき／ゆうき
  - 促音：きて／きって、おと／おっと、かこ／かっこ
  - 拗音：びよういん／びょういん、じゆう／じゅう、りよう／りょう
- 拍數方塊（C2-15～17）：每格一拍，46×52、radius 12、chip 底；長音延長拍 = accentSoft 底 + accent 2px 實框；促音 っ 格 = 透明底 + accent 2px 虛框、字用 accentText；拗音小字格 = accentSoft 底 + accent 實框（照設計檔）。拗音 きゃ 這種兩字一拍的情況，設計檔把 ょ 單獨成格標色，照設計檔即可。
- 特殊音三頁用同一路由 `app/special/[kind].tsx`（kind = long | sokuon | youon），上方分頁 replace 切換。

## 10. 第三階段：片假名

- 資料：kana.json 補片假名清音 46、濁音半濁音 25、拗音 33，id `k-<romaji>`（ヂ `k-di`、ヅ `k-du`），規則同平假名。每個片假名多兩個欄位：`hiraganaId`（同讀音的平假名 id）與 `diffNote`（跟平假名的差異說明，照設計檔 C2-19 的語氣，一句話，例如「跟平假名 か 很像，少了右邊那一點，線條也比較直。」）。清音的例字一律用外來語（`exampleWordId` 指向 script 為 katakana 的詞）。
- 外來語詞庫：words.json 中 `script: "katakana"` 的詞，每個要有 `meaning`（中文）與選填的 `note`（讀外來語題的補充說明，例如 コーヒー 的「ー」是長音）。至少 40 個常見、初學者懂的詞（カメラ、コーヒー、テレビ、ケーキ、バス、タクシー、ホテル、メニュー、パン、ノート、トマト、バナナ、レモン、ミルク、ピアノ、ギター、テニス、ラジオ、ドア、シャツ、カレー、ラーメン、アイス、ゲーム、スキー…），並涵蓋 46 個清音每個至少出現一次，當作該字的例字。清單記在 PROGRESS.md 假設。
- 「可讀」判斷（讀外來語題只出可讀的詞）：詞裡每個字元都必須是：已學的片假名清音；或濁音／半濁音且其清音已學；或小字 ャュョッァィゥェォ 且對應的大字已學；或長音符 ー（一律可讀）。寫成純函式並測試。
- 解鎖：平假名清音 46 個全部已學 → 片假名解鎖（沿用 `isKatakanaUnlocked`）。五十音表的片假名分頁不受鎖定限制、隨時可瀏覽，未解鎖時只多一行說明。解鎖後第一次回首頁時顯示 C2-18 片假名開始畫面（settings 加 `kataIntroSeen`，看過就不再自動顯示）；「開始片假名」直接開始今天的練習。
- 學習順序：平假名清音學完後，每日新字改從片假名清音依序取。到期複習兩種假名都包含。進度分開：首頁在片假名階段標題顯示「片假名」，「已學」與各行進度條改算片假名。
- 片假名學新字：流程同平假名（看與聽 → 筆順 → 描寫 → 測驗），但第一步用 C2-19 版面（「片假名新字」標籤、對照的平假名卡＋diffNote、外來語例字卡可播放）。筆順、描寫、測驗、結果、一行學完沿用 C2-06～C2-11，文字中的「平假名」改依 script 顯示。
- 讀外來語題型 `loanword`（C2-20）：顯示片假名詞＋播放鈕，4 個中文意思選項（干擾項取其他外來語的意思），作答回饋照設計檔（答對「答對了！コーヒー 讀作 kōhī，「ー」是長音。」—有 note 才接 note）。片假名階段的每日練習在有可讀詞時加 1～2 題讀外來語；自動練習在片假名解鎖後也可抽到此題型。讀外來語題不更新任何假名的 SRS。
- 五十音表：片假名分頁解鎖後可切換，已學標記照片假名進度。
- 開發用深連結（只在 `__DEV__`）：`kana5min://debug?preset=hiragana-done|all-done|reset`。hiragana-done＝平假名清音 46 個設為已學（level 3、nextReviewAt 為一週後、correctStreak 3），片假名全部未學；all-done＝平假名與片假名清音都已學；reset＝清空進度（不清設定的 onboarded）。實作放 `src/dev/`，用 `if (__DEV__)` 包住 require，第三階段 Maestro 用它，第四階段再加除錯選單 UI。

## 11. 第四階段：畢業、導流、TestFlight 準備

- 畢業條件：平假名與片假名清音（各 46）全部已學。達成後，在練習結果流程結束回首頁時（若有一行學完畫面，接在它之後）顯示一次 C2-21（`app/graduate.tsx`），settingsStore 的 `graduateSeen` 設為 true，之後不再自動顯示。數字：平假名 46、片假名 46（取真實已學數）、練習天數＝practiceDates 的不同日期數。「看看下一步」→ C2-22；「回首頁繼續複習」→ 首頁。
- 導流頁 C2-22（`app/next.tsx`）：連結常數放 `src/config.ts`：`SUSHI_JP_APP_STORE_URL`（`https://apps.apple.com/app/id6774095306`）與 `SUSHI_JP_PLAY_STORE_URL`（`https://play.google.com/store/apps/details?id=com.ptalk.sushijp`）；`src/logic/links.ts` 的 `sushiStoreLink(os, urls)` 依平台選連結（Android → Google Play，其餘 → App Store），按鈕文字為「到 App Store 看看」或「到 Google Play 看看」；介紹卡顯示壽司日檢真實圖示（`assets/images/sushi-jp-icon.png`，testID `next-sushi-icon`）與三個賣點；連結不是 http(s) 時顯示「連結尚未設定」提示。
- 再次進入：設定頁「關於」區加兩列：「下一步：壽司日檢」（一律顯示，testID `row-next`）與「畢業紀念」（只在已畢業後顯示，testID `row-graduate`）。首頁在已畢業後於主按鈕下方加一個文字連結「下一步：壽司日檢」（testID `home-next-link`）。
- 除錯選單：設定頁最下方「開發者」區，只在 `__DEV__` 顯示，三個按鈕：平假名全部完成（`debug-hiragana-done`）、全部完成（`debug-all-done`）、重設進度（`debug-reset`），套用後回首頁。元件放 `src/dev/DebugMenu.tsx`，設定頁用 `const DebugMenu = __DEV__ ? require('../../src/dev/DebugMenu').default : null` 引用。驗收方式：Release 打包後的 main.jsbundle 不得包含 DebugMenu 裡的唯一字串（例如 `開發者選單`、`debug-all-done`）。
- app.json：name「諧音五十音」、version `1.0.0`、ios.bundleIdentifier `com.ptalk.kana5min`、ios.buildNumber `1`、android.package `com.ptalk.kana5min`、android.versionCode 1、userInterfaceStyle `automatic`、splash（背景色用亮色 bg，另設 dark 背景）、icon 佔位圖（assets/images/icon.png 可沿用範本，記在待確認事項）、`ios.infoPlist.ITSAppUsesNonExemptEncryption: false`、`ios.supportsTablet: false`（只做 iPhone 版面）。plugins 加 expo-notifications（若需要）。
- Privacy manifest：App 不收集資料。`ios.privacyManifests`：`NSPrivacyTracking: false`、`NSPrivacyTrackingDomains: []`、`NSPrivacyCollectedDataTypes: []`，`NSPrivacyAccessedAPITypes` 列 UserDefaults（`CA92.1`，AsyncStorage 使用）。
- eas.json：`cli.version` 下限、`cli.appVersionSource: "local"`；`build.development`：`distribution: internal`、`ios.simulator: true`；`build.production`：`autoIncrement: true`（iOS buildNumber）；`submit.production` 留空物件（不填 Apple 帳號資訊）。不執行任何 eas 指令。
- 驗證：`npx expo-doctor` 0 錯誤；`npx expo run:ios --configuration Release --no-bundler --device <UDID>` 成功並能啟動。

## 12. 好笑記憶包：廣告解鎖與買斷（2026-10-28 使用者決定）

商業模式（spec 6.2／6.3 已更新）：あ行、か行諧音免費（10 個讀音）；從さ行起，看一支獎勵廣告永久解鎖 3 個讀音；NT$90 買斷全部解鎖、永久免廣告。App 名稱改為「諧音五十音」。

### 資料
- `src/data/puns.ts`：以「讀音」（清音的 romaji，例如 `ku`）為 key，只收 `kana-puns.md` 標 ✅ 的句子（清音目前 42 句；け、つ、ひ 為 ❌，ふ、へ 未審，都不收）。整理規則：半形括號改全形「（）」、去掉 emoji、去掉多餘空白；文字其餘照原句。
- 濁音、半濁音、拗音（2026-10-29）：句子來自 `kana-puns-dakuon-yoon.md`（只收 ✅），存在 `VOICED_PUNS`，key 是平假名 kana id（`h-za`、`h-cha`）而不是 romaji，因為 romaji 會重複（ぢ=ji、づ=zu 與じ、ず同音）。`gen:puns`／`check:puns` 同時讀兩份 markdown。
- `soundOf(kanaId)`：回傳「key」。清音的 h-／k- id 回傳 romaji（`h-ku`、`k-ku` → `ku`）；濁音、半濁音、拗音回傳平假名 id（`k-za` → `h-za`）；不存在的 id 回傳 undefined。`isSeionKey(key)` 判斷是不是清音 key。
- `punOfSoundKatakana`：把句中第一個對應平假名「整組」換成片假名（`toKatakana` 逐字元轉換，拗音 ちゃ→チャ）。
- `punFor(kanaId)`：平假名回傳原句；片假名回傳把句中第一個對應平假名字元換成片假名的句子（く→ク：「你是在ク（哭）喔？」）。沒有句子回傳 undefined。
- 原本的 `hintFor` 改成從 puns.ts 取資料（保留函式名稱給既有呼叫端），原 HINTS 常數移除。
- 免費讀音：`a i u e o ka ki ku ke ko`。

### 解鎖邏輯（純函式，`src/logic/punUnlock.ts`，要有單元測試）
- `isPunUnlocked(key, { purchased, unlocked })`：purchased、或（清音 key 且為免費讀音／在 unlocked 內）。濁音、半濁音、拗音 key 只有買斷才解鎖；`nextUnlockBatch` 與 `canWatchRewardedAd` 對它們回傳空／false，解鎖面板改顯示「濁音、拗音的諧音梗只能買斷解鎖」（testID `pun-buy-only`）。
- `nextUnlockBatch(sound, unlocked)`：回傳最多 3 個讀音：點到的讀音，加上照清音順序（`seionOrder`）在它之後、有諧音、尚未解鎖、非免費的 2 個；之後不足就從它之前的同條件讀音補。點到的讀音本身沒有諧音或已解鎖時，它不算在內。
- `shouldPromptPurchase(adsWatched, alreadyPrompted)`：adsWatched ≥ 2 且還沒提示過。
- 狀態放 settingsStore（AsyncStorage persist，升 version 並用預設值補欄位）：`punPackPurchased`（已有）、`punUnlocked: string[]`、`punAdsWatched: number`、`punPromptAfterAdsShown: boolean`、`punPromptKataShown: boolean`。

### 廣告（`src/monetization/ads.ts`）
- 套件 `react-native-google-mobile-ads`（17.x，peer 需 RN ≥ 0.86）。app.json plugin 設 `androidAppId`、`iosAppId`（公開 ID，值見 `store/admob-ids.md` 的 App ID 兩列）。不要求 ATT，不設 `userTrackingUsageDescription`；所有請求 `requestNonPersonalizedAdsOnly: true`。
- 只用獎勵廣告（Rewarded）。unit id：`__DEV__` 用 `TestIds.REWARDED`；正式版讀 `process.env.EXPO_PUBLIC_ADMOB_REWARDED_IOS`／`EXPO_PUBLIC_ADMOB_REWARDED_ANDROID`，沒有值就回報「廣告暫時無法使用」。
- `showRewardedAd(): Promise<'rewarded' | 'dismissed' | 'unavailable'>`：第一次呼叫時才 `mobileAds().initialize()`（之前先 `AdsConsent.gatherConsent()`，錯誤忽略）；載入逾時 15 秒視為 unavailable；收到 EARNED_REWARD 才算 rewarded。
- jest 用 mock，不載入原生模組。

### 內購（`src/monetization/purchases.ts`）
- 套件 `react-native-purchases`（10.x）。key 讀 `process.env.EXPO_PUBLIC_RC_IOS_KEY`／`EXPO_PUBLIC_RC_ANDROID_KEY`；沒有 key 就不 configure，所有函式回傳 unavailable，App 其他功能照常。key 不寫進任何檔案，不 log。新增 `.env.example`（只有變數名稱、值留空），`.env` 已在 .gitignore 確認。
- entitlement `pun_pack`；offering `default` 的 lifetime package（`$rc_lifetime`），產品 `com.ptalk.kana5min.punpack`。
- `initPurchases()`（App 啟動時呼叫；成功後讀 customerInfo 同步 `punPackPurchased`）、`getPunPackPrice(): Promise<string | null>`（商店在地化價格字串，失敗回傳 null，畫面 fallback「NT$90」）、`buyPunPack(): Promise<'purchased' | 'cancelled' | 'error' | 'unavailable'>`、`restorePunPack(): Promise<'restored' | 'none' | 'error' | 'unavailable'>`。購買或恢復成功即寫 `punPackPurchased = true`。

### 畫面（沒有設計檔，沿用現有 token、Card、PrimaryButton、Icon 的樣式；不放 emoji，圖示用單線條 SVG）
- `src/components/PunCard.tsx`（F1／F2）：輸入 kanaId。沒有諧音 → 不渲染。已解鎖 → Card：標題「好笑記法」（accentText）、句子、下方小字「諧音只是幫你記，念法以音檔為準」（muted）。未解鎖 → Card：標題同上、3 條灰色圓角條（假裝模糊文字）、鎖頭圖示、按鈕「解鎖諧音」，testID `pun-locked`，點擊開解鎖面板。已解鎖卡片 testID `pun-card`。
- `src/components/PunUnlockSheet.tsx`：底部 Modal。標題「解鎖諧音梗」。主按鈕「看廣告解鎖 3 個字」（testID `pun-watch-ad`），下方小字列出這次會解鎖的字（例如「さ・し・す」，依目前畫面的 script 顯示平假名或片假名）。次按鈕「{價格} 全部解鎖・永久免廣告」（testID `pun-buy`）→ 關面板並 `router.push('/punpack')`。關閉 testID `pun-sheet-close`。看廣告時顯示載入中；unavailable 顯示「廣告暫時無法載入，請稍後再試」。rewarded → 解鎖 batch、`punAdsWatched + 1`；若 `shouldPromptPurchase` 為真，設 `punPromptAfterAdsShown = true` 並 `router.push('/punpack?from=ads')`。
- 出現位置：平假名與片假名學新字第一步（取代原本的「記憶小提示」卡）、五十音表字詳情頁（C2-04）。
- `app/punpack.tsx`（F3 買斷頁）：右上關閉（testID `punpack-close`）。`from=ads` 時頂部一行「已經看了 2 支廣告，{價格} 以後都不用看」。標題「好笑記憶包」；2 句免費範例（く、こ）；三點：「解鎖全部 N 句諧音梗（平假名＋片假名）」（N 從資料算）、「永久免廣告」、「之後新增的諧音梗自動取得」；主按鈕「{價格} 買斷」（testID `punpack-buy`）；文字連結「恢復購買」（testID `punpack-restore`）。已購買時改顯示「已購買，感謝支持！」與返回按鈕。結果用 Alert 告知（取消不跳）。
- `app/puns.tsx`（F4 總覽）：清音 46 格照五十音表排法（沿用 `seionGrid`），上方切換平假名／片假名（片假名未解鎖時只顯示平假名）。每格顯示假名與狀態（已解鎖：accent 點；未解鎖：鎖頭；沒有諧音：淡色「—」）。點已解鎖格 → 下方展開顯示 PunCard；點未解鎖格 → 解鎖面板。testID `puns-cell-<sound>`。
- 設定頁新增「好笑記憶包」區：「好笑記法總覽」（testID `row-puns`）、未購買時「買斷好笑記憶包」（testID `row-punpack`）、「恢復購買」（testID `row-restore`）。
- 片假名開始畫面（C2-18）：未購買且 `punPromptKataShown` 為 false 時，主按鈕下方顯示一行文字連結「片假名也有諧音梗：好笑記憶包」（testID `kata-punpack-link`）→ `/punpack`，顯示後設 `punPromptKataShown = true`。
- F5 分享卡（spec 6.4）：`src/logic/shareCard.ts` 的 `buildShareCard(kanaId, theme)` 組資料（大字、讀音、依第一個對應假名切成一般／強調片段、App 名稱、取自 token 的 bg／text／muted／accent）；`src/components/ShareCard.tsx` 以 360pt 設計稿渲染；`PunShareButton` 放在已解鎖 PunCard 右上（testID `pun-share`），畫面外渲染 ShareCard → `react-native-view-shot` 輸出 1080×1080 PNG（tmpfile）→ `expo-sharing` 開系統分享面板。開發用深連結 `kana5min://share-preview?id=h-ku` 把分享卡直接顯示在螢幕上（`app/share-preview.tsx`，只在 `__DEV__`）。

### 開發與測試
- 除錯預設（只在 `__DEV__`）新增 `pun-reset`（清空 punUnlocked／punAdsWatched／兩個 prompt 旗標，punPackPurchased=false）與 `pun-purchased`（punPackPurchased=true），除錯選單加對應按鈕。
- Maestro `maestro/phase5-puns.yaml`：學到さ行時新字畫面出現 `pun-locked` → 開面板看到 `pun-watch-ad`、`pun-buy` → 進買斷頁 → 關閉；`pun-purchased` 後新字畫面與總覽看得到 `pun-card`。不在 Maestro 裡真的播廣告。截圖亮暗各一份存 `screenshots/phase5/`。

### App 名稱
- app.json `name`：「諧音五十音」。通知標題、設定頁 fallback、通知權限 Alert 文字同步改。scheme（`kana5min://`）、bundle id、package 不變。

## 13. 限時練習與中途接續（2026-10-28）

- **計時**（`src/logic/practiceTimer.ts`，純函式）：`usedMs`（已累積）＋`runningSince`（目前這一段）＋`limitMs`（上限，0＝不限時）。`FlowHeader` 內的 `useSessionTimer`（`src/hooks`）在畫面取得焦點且 App 在前景時 `resumeTimer`，失去焦點／背景時 `pauseTimer`；所以看與聽、筆順、描寫、測驗都計入，離開就暫停。只有每日練習限時（`limitMs = 每日目標分鐘 × 60000`）；自動練習與易混淆快速辨識固定 10 題，`limitMs = 0`。
- **時間到**：`sessionStore.advanceQuiz(now)` 在答完一題後回 `'next' | 'timeup' | 'done'`。最後一題一律 `'done'`（直接提交，不詢問）。時間到時先用 `newQuestionsFirst` 把後面的新字題排到前面，新字題都答完才回 `'timeup'`（新字一定要測驗完才算學會）。`app/quiz.tsx` 跳 Alert「已經練習 N 分鐘了，要繼續嗎？」：「結束這一輪」＝`finish()`（只提交 `answers` 裡有的字＝部分提交，沒做到的複習字不動）；「再練 5 分鐘」＝`extendTime`（新上限 = 已練習時間 + 5 分鐘，可再次觸發）。接續時進測驗畫面用 `timeUpDue` 先檢查一次。
- **存檔**：單一存檔位，AsyncStorage key `kana5min-session`（`src/store/sessionSaveStorage.ts`），內容見 `src/logic/sessionSave.ts` 的 `SavedSession`（模式、階段、新字／複習／已學 id、題目清單、下一題位置、答對錯、已用時間、上限、存檔日期）。與 SRS（sqlite）分開，SRS 仍只在 `finish` 時寫入。寫入時機：每答一題、`advanceNew`、暫停計時、離開。`qIndex` 存「下一題」（已作答的題目位置 +1，接續才不會重答）。沒有進度（沒答過題、沒學完任何新字）不存。
- **接續**：`sessionStore.saved`（App 啟動 `loadSaved`、首頁取得焦點 `refreshSaved`）；本地日期（`toDateKey`）不是存檔當天就作廢。首頁有 `saved` 時主按鈕「繼續今天的練習」（`start-today`）→ `resumeSavedAndGo`（`src/nav/startDaily.ts`）：新字階段回到該新字的「看與聽」（字內步驟不細存），測驗回到離開時的題目，題目都答完則直接提交；小字「從頭開始」（`restart-today`）＝重新 `startDaily`（會丟掉存檔）。一輪提交後只清自己寫的存檔（`savedOwner === sid`）。
- **✕**：`confirmExitFlow`「要先離開嗎？」→「先離開」呼叫 `sessionStore.leave`（暫停＋存檔＋清除狀態）。
- **結果頁用時**：`buildResultSummary` 的 `elapsedMs` 用 `usedMs`（只算練習畫面的時間）。
- **測試用**：debug 深連結 `kana5min://debug?preset=all-done&due=1&timescale=0.001`：`due=1` 讓全部進度到期（只有複習題）、`timescale` 縮放每日目標與「再練 5 分鐘」（`timeConfig.scale`，只有開發版會設）。Maestro：`maestro/phase6-timed-session.yaml`。
- 本機驗證用的 Debug build 不是 dev client：改 Metro 位置要 `xcrun simctl spawn <udid> defaults write com.ptalk.kana5min RCT_jsLocation localhost:<port>`。

## 14. 新手教學（2026-10-28）

- 路由：`app/tour.tsx`（3 頁 ScrollView pagingEnabled，testID `tour-page-1..3`／`tour-next`／`tour-skip`／`tour-start`）。`app/(tabs)/_layout.tsx` 用純函式 `entryRoute({onboarded, tourSeen})`（`src/logic/tour.ts`）決定導去 `/tour`、`/welcome` 或留在首頁。已完成歡迎頁（`onboarded`）時進導覽視為「重看」：結束或略過後 `router.back()`，不進歡迎頁。
- 設定旗標（settingsStore 內「新手教學」區塊）：`tourSeen`、`learnTipsSeen {intro, stroke, trace}`；方法 `setTourSeen`、`setLearnTipSeen(key)`、`resetTutorial()`。persist version 3，`migrate` 呼叫 `migrateTourFlags`：沒有新欄位且 `onboarded=true` 的舊資料兩者都設為已看過。
- `CoachTip`（`src/components/CoachTip.tsx`）：反色氣泡＋朝上箭頭，排在版面流程內（不是浮層），Pressable 設 `accessible={false}` 讓文字可被 Maestro 讀到；卸載時也會呼叫 `onDismiss`。testID `coach-intro`／`coach-stroke`／`coach-trace`。
- `HomeHelpSheet`（`src/components/HomeHelpSheet.tsx`）：Modal 底部面板，內容 `homeHelpItems(goal)`；testID `home-help`（首頁按鈕）、`home-help-sheet`、`home-help-close`、`home-help-backdrop`。設定頁列 `row-replay-tour`。
- 開發深連結預設（`applyDebugPreset`）一律把 `tourSeen` 與三個提示設為已看過。Maestro：`common/onboard.yaml` 清除狀態後先點 `tour-skip`；`maestro/phase7-tour.yaml` 測導覽、說明面板、提示氣泡與重看教學。

## 15. 批 4：遮一半猜字、默寫自我檢查、抓錯字（2026-10-30）

- `maskhalf` 遮一半猜字（`src/logic/maskHalf.ts`、`QuizMaskHalf`）：用 KanjiVG 筆畫（react-native-svg）畫字，只露出上／下／左／右一半；選項只放拼音（不放字形，不認識假名的人沒辦法拿露出的筆畫去對選項），4 個選項 = 兩對（目標＋同組一個、另一組一對）。遮哪邊要「看得出來」：把筆畫取樣成點（間距 2 單位），露出的部分裡有 `MIN_VISIBLE_DISTANCE`（12 單位）以上的筆畫在其他選項的字露出部分附近（7 單位內）找不到才算（ぬ／め 遮掉下面的圈就看不出來，測試固定這個例子）。作答後露出全字（淡色）。
- `recall` 默寫自我檢查（`QuizRecall`）：看拼音、聽聲音，想好後「翻面核對」看字，再自評「我寫對了／沒寫出來」；對錯由自評決定，記入 SRS 與計分。只在有易混淆字組可用時進自動練習（剛開始學維持單純的看字選音／聽音選字），占用看字選音／聽音選字的名額。
- `spoterr` 抓錯字（`src/logic/spotError.ts`、`QuizSpotError`、`src/data/spotErrorWords.ts`）：3 個詞（同一種文字），其中一個字被換成同組的另一個字，點出來再確認；被換的位置在所有易混淆字中均勻抽，所有字都可點，作答前不播放。**詞庫尚未核可**（`words-spot-error.md`）：正式版詞池只有 words.json 裡本來就有的 3 個詞，所以 `SPOT_ERROR_IN_PRACTICE = false`、不進練習；開發版用 `kana5min://quiz?mode=dev-spot` 以佔位詞看介面（`DEV_PLACEHOLDER_WORDS`，不是真的詞、沒有音檔）。核可後：詞加進 words.json、產音檔、旗標改 true。
- 計分：maskhalf 沿用選擇題（答錯記「把答案當成選到的字」）；spoterr 選錯時被換的字記錯、記「把原本的字當成換上去的字」；recall 為自評。
