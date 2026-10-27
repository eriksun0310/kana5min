# 架構決策（由 Opus 決定，實作者照做）

CLAUDE.md、spec.md、goals/ 是上位規則；這份檔案補上它們沒寫、但實作時必須統一的決定。要偏離這份檔案時，先在 PROGRESS.md 的「假設」記下原因。

## 1. 專案與工具

- Expo SDK 58（`expo ~58.0.19`）、React Native 0.88、React 19.3、TypeScript ~6.0、npm。用 `npx expo install` 安裝 Expo 相關套件，讓版本對齊 SDK。
- 導覽：expo-router。`app/(tabs)/` 放四個分頁（`index` 今天、`chart` 五十音表、`practice` 練習、`settings` 設定），自訂底部導覽列元件（照設計檔，不用預設 tab bar 外觀）。全螢幕流程放 `app/` 底下的 stack 路由，不顯示導覽列。
- URL scheme：`kana5min`。
- 狀態：zustand。設定與一般狀態（每日目標、主題、是否已完成歡迎頁、練習日期清單、畢業是否看過）用 zustand `persist` + AsyncStorage。每個假名的 SRS 進度與易混淆字答錯紀錄用 expo-sqlite。
- 音訊：expo-audio。所有播放走 `src/audio/playKana.ts` 的 `playKana(id, { slow })`。
- 字型：`@expo-google-fonts/klee-one` 的 `KleeOne_600SemiBold`，載入完成前顯示啟動畫面。介面文字用系統字型。
- 圖示：react-native-svg，統一放在 `src/components/Icon.tsx`，路徑直接取自設計檔（見第 7 節），stroke 1 色、`strokeWidth 2`、圓角線頭。畫面上不用 emoji。
- 提醒：expo-notifications，本機每日排程通知。
- 測試：jest-expo（`npm test` 跑 `jest`）。業務邏輯寫成不依賴 React Native 的純函式，放 `src/logic/`，測試放 `src/logic/__tests__/`。

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
| next（首頁進度條的下一格） | `#6B6760` | `#A7A198` |
| faint（描寫的淡色字） | `#2A2E35` | `#ECE8E1` |
| guide（田字格虛線） | `#2C3038` | `#E2DDD5` |
| correctSoft（答對底色） | `#1D2E28` | `#E5F3EC` |
| correctText（答對文字） | `#9FDCC2` | `#1F6B49` |
| wrongSoft（答錯底色） | `#33221F` | `#FBE9E5` |
| wrongText（答錯文字） | `#F7B0A4` | `#A23A28` |
| accent（兩主題相同） | `#F2B54A` | `#F2B54A` |
| onAccent（兩主題相同） | `#15171B` | `#15171B` |

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
- 首頁「已學」= 已學清音數 / 46；「待複習」= 現在到期數；「今天新字」= 今天會學的新字數（0–3）；46 格進度條：已學 = accent，下一個新字 = next，其餘 = track。右上角火焰數字 = 連續練習天數（今天或昨天有練才延續）。
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
- 描寫畫布 testID `trace-canvas`。描寫判定：使用者畫出的筆畫數 ≥ 該字筆畫數的一半（四捨五入，至少 1）且第一筆的大致方向（起點→終點向量與 KanjiVG 第一筆起終點向量夾角 < 90°）即算完成；不需要精準辨識。開發版本另外允許長按畫布 1 秒直接判定完成，方便 Maestro。
- 除錯選單（第四階段）：只在 `__DEV__` 下存在，用 `if (__DEV__)` 包住 `require`，讓正式包被 Metro 常數折疊移除。可用深連結 `kana5min://debug?preset=hiragana-done|all-done|reset` 觸發，Maestro 用 `openLink`。

## 9. 第二階段：練習、易混淆字、特殊音

- 易混淆字組（練習用）只有 spec 的 5 組：`ぬめ`、`るろ`、`わねれ`、`シツ`、`ソン`。group id = 組內字依序串接（如 `ぬめ`）。資料放 `src/data/confusables.ts`，每組含 members（kana id）、label（`ぬ・め`）、script、差異說明 tip（照設計檔 C2-14 文字；わねれ 自寫）。kana.json 裡額外的 き/さ、は/ほ 只給詳情頁「容易搞混」用，不進練習清單。
- 片假名組（シツ、ソン）在片假名解鎖前（平假名清音 46 個全部已學之前）不出現在任何清單或題目。用一個純函式 `isKatakanaUnlocked(progress)` 判斷，第三階段共用。
- 答錯紀錄：任何題目只要「正確答案的字屬於某組」且答錯，該組 `wrong_count + 1`（寫 sqlite `confusion` 表）。不因答對而減少。
- 練習入口「最近常搞混」：列出所有可用組，依 wrong_count 由大到小（同分依預設順序），顯示「錯 N 次」。
- 新題型 `confuse`：播放組內某字的聲音，選項為該組所有成員（2～3 個），不足 4 個不補。
- 自動練習 10 題：題型隨機混合 see／hear／confuse。confuse 題的出題組以權重抽：weight = 1 + wrong_count，只考慮「至少 2 個成員已學」的組；沒有符合的組時就不出 confuse 題。被抽的字以已學為主。以注入 rng 的純函式實作並寫測試（驗證答錯多的組被抽中機率較高）。
- 易混淆字對比頁的「快速辨識 10 題」：只出該組的 confuse 題與看字選音題（選項限該組成員），10 題。已學的字照常更新 SRS 與 correctStreak；未學的字只更新答錯紀錄，不寫 SRS。
- 特殊音練習（長音／促音／拗音）：每類一組最小對立詞（每對兩個詞、意思不同），題目＝播放其中一個詞，二選一選出聽到的詞。每類 6 題（3 對 × 正反）。不影響 SRS。詞彙加入 words.json（含中文意思）並重跑 `node scripts/gen-audio.mjs` 產生音檔。建議詞對：
  - 長音：おばさん／おばあさん、おじさん／おじいさん、ゆき／ゆうき
  - 促音：きて／きって、おと／おっと、かこ／かっこ
  - 拗音：びよういん／びょういん、じゆう／じゅう、りよう／りょう
- 拍數方塊（C2-15～17）：每格一拍，46×52、radius 12、chip 底；長音延長拍 = accentSoft 底 + accent 2px 實框；促音 っ 格 = 透明底 + accent 2px 虛框、字用 accentText；拗音小字格 = accentSoft 底 + accent 實框（照設計檔）。拗音 きゃ 這種兩字一拍的情況，設計檔把 ょ 單獨成格標色，照設計檔即可。
- 特殊音三頁用同一路由 `app/special/[kind].tsx`（kind = long | sokuon | youon），上方分頁 replace 切換。
