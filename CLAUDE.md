# CLAUDE.md — 五十音 App

這份檔案是給 Claude Code 的工作規則。開始任何工作前先讀完這份、`spec.md`，以及目前階段的 `goals/0N-*.md`。

## 工作方式

依照順序完成四個階段：`goals/01-hiragana.md` → `goals/02-practice-special.md` → `goals/03-katakana.md` → `goals/04-graduate-release.md`。前一個階段的完成條件沒有全部勾選前，不要開始下一個階段。

每個階段的流程固定如下：

1. 讀該階段的 goal 檔與它引用的 spec 章節、設計檔。
2. 實作，並為邏輯寫單元測試（SRS、羅馬拼音淡出、進度保存等）。
3. 為該階段寫 Maestro 流程檔，放在 `maestro/phaseN-*.yaml`。
4. 在 iOS 模擬器上跑 Maestro 流程，截圖存到 `screenshots/phaseN/`，亮色與暗色主題各截一次。
5. 逐張對照 `design/` 裡對應的畫面檔，有明顯差異就修正後重跑。
6. 完成條件逐條確認後，在 goal 檔裡把核取方塊改成 `[x]`。
7. 在 `PROGRESS.md` 記錄這個階段完成了什麼、做了哪些假設。
8. `git commit`，訊息為 `phase N complete: <摘要>`。只 commit，不要 push。

遇到需要決定、但 spec 和這份檔案都沒寫的事情時，選最簡單、最符合 spec 精神的做法，並記錄在 `PROGRESS.md` 的「假設」段落，不要停下來等待回覆。

## 技術選擇（已決定）

框架為 Expo SDK（使用目前穩定版）、React Native、TypeScript，套件管理用 npm。狀態管理用 Zustand；設定與一般狀態用 AsyncStorage 保存；學習進度（每個假名的 SRS 資料）用 expo-sqlite 保存。不需要後端，也不要加入任何帳號、追蹤或分析 SDK。

Bundle identifier 先用 `com.ptalk.kana5min`，App 名稱用「Kana 5min - 五十音入門」，兩者都記在 `PROGRESS.md` 的待確認事項。

音檔用 msedge-tts（Node 套件，免 API key）預先產生 mp3，打包在 App 內的 `assets/audio/`，不上傳任何雲端。語音使用日文神經語音（例如 `ja-JP-NanamiNeural`），所有音檔用同一個聲音。產生腳本放在 `scripts/gen-audio.mjs`，可重複執行、會跳過已存在的檔案，也能用參數只重產指定的檔案。

每個假名、例字與外來語都產生一般速度和慢速兩個檔案（慢速用較低的 rate），檔名用穩定的 id，例如 `h-ku.mp3`、`h-ku.slow.mp3`。單獨念假名時 TTS 可能念錯，例如 は、へ 被念成助詞的 wa、e，を 的念法也要統一，所以要建立 `scripts/tts-overrides.json`，讓特定假名用替代文字產生音檔（例如用片假名 ハ、ヘ）。促音 っ 單獨不發音，不產生音檔，播放時改播含促音的例字。

App 內所有播放都經過同一個 `playKana(id, { slow })` 函式，用 expo-av 或 expo-audio 播放打包的檔案，之後要換音檔時只需要替換檔案。產生完的音檔清單與 overrides 內容記在 PROGRESS.md，供開發者人工聽過確認。

筆順與描寫使用 KanjiVG 的假名筆畫資料（CC BY-SA 3.0），只取需要的平假名與片假名，轉成 App 內的 JSON 資產。設定頁的「關於」區塊要標示 KanjiVG 的來源與授權。描寫練習只需要判斷「有畫出大致方向正確的筆畫」，不需要精準的筆跡辨識。

字型：假名使用 Klee One（透過 `@expo-google-fonts/klee-one`），介面文字使用系統字型。

## 設計檔怎麼讀

`design/` 裡是每個畫面的設計原始檔，檔名對應 spec 第 4 節的畫面編號。沒有 `-L` 的是暗色版，有 `-L` 的是亮色版。

這些檔案是 HTML 模板：版面寫在 inline style 裡，`{{t.bg}}`、`{{t.text}}` 這類寫法對應 spec 第 7 節的顏色 token，`{{accent}}` 是主色 `#F2B54A`，`{{onAccent}}` 是 `#15171B`。（2026-10-28 起 App 改用壽司日檢的紅色配色，實作一律以 spec 第 7 節與 `src/theme/tokens.ts` 為準；設計檔仍是琥珀色，對照截圖時配色不同是預期中的。）檔案最後的 `<script>` 區塊裡有畫面用到的範例資料和互動邏輯，例如測驗選項、設定開關。`<sc-for>` 是迴圈，`<sc-if>` 是條件顯示。

實作時以設計檔的版面、間距、字級與配色為準，畫面尺寸以 390×844 為基準。設計檔裡的數字（例如「7 / 46」「連續 7 天」）只是範例，實作時要接真實資料。

## 主題

顏色一律從 token 取用，不要在元件裡寫死色碼。主題設定有「跟隨系統／亮色／暗色」三種，用 `useColorScheme` 取得系統主題，再依使用者設定覆蓋。每個階段的截圖都要確認兩種主題下沒有元件顏色沒跟著切換。

## 模擬器與截圖

在 Mac 上用 Xcode 的 iOS 模擬器（iPhone 15 或相近尺寸）。用 `npx expo run:ios` 或 development build 安裝 App。Maestro 若尚未安裝，依官方說明安裝。截圖可以用 Maestro 的 `takeScreenshot`，或 `xcrun simctl io booted screenshot <path>`。

截圖比對只需要抓明顯問題：排版跑掉、文字被切掉、元件缺少、主題顏色錯誤、畫面結構與設計檔明顯不同。字距等細微差異不用反覆修。

## 不要做的事

不要 push 到遠端、不要把音檔上傳到 R2 或任何雲端、不要執行 `eas submit` 或任何需要 Apple 帳號登入的指令、不要在程式碼或設定檔中寫入任何金鑰。好笑記憶包的付費機制（spec 第 6 節的內購與 F1～F5 畫面）不在這四個階段的範圍內，不要實作。
