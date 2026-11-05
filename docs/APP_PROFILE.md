# 諧音五十音 App 檔案
最後更新：2026-11-05｜版本：1.0.0（app.json）｜Bundle ID：com.ptalk.kana5min（iOS、Android 相同）

> 以程式碼為準盤點。商店上架名稱「日文五十音｜白爛諧音記憶法」（`store/app-store.md`），手機上顯示「諧音五十音」（`app.json` name）。

## 一句話（20 字內）
台灣人專屬的平假名片假名諧音記憶法

## 給誰用
- **主要使用者**：完全沒學過日文、要從平假名／片假名開始的台灣人（介面全中文）。
- **痛點**：假名看了就忘、長得像的字分不清（シ／ツ、ソ／ン、ぬ／め）、長音促音拗音聽不出差別。
- **不適合誰**：已認得假名、要學單字文法的人 → 壽司日檢（`app/next.tsx`、`src/config.ts`）；想要日文聽力或口說會話的人 → 待確認（本 App 沒有口說與會話內容）。
- **前一步建議先用**：無（零基礎起點）。
- **學完下一步**：壽司日檢（畢業頁 `app/graduate.tsx` →「下一步」`app/next.tsx`，設定頁「更多 PTalk App」也可進入壽司日檢商店頁）。

## 學習地圖定位（只能用以下固定選項）
- 語言：日文
- 階段：零基礎
- 技能：認字、手寫、聽力
  - 未列「單字」：只有 179 個平假名＋97 個外來語（片假名）例字，用來輔助認字，不是單字學習；沒有文法、閱讀、口說內容。

## 功能清單
免費或付費欄：「免費」＝全部免費；「部分付費」＝免費可用但有一部分要看廣告或買斷。平台欄：未特別註明＝iOS、Android 皆有。

| 功能 | 使用者看到的說明 | 免費或付費 | 平台 | 出處 |
|---|---|---|---|---|
| 首次導覽與每日目標 | 首次開啟 3 頁導覽，再選每天練習 3／5／10 分鐘；設定可重看教學 | 免費 | 兩者 | `app/tour.tsx`、`app/welcome.tsx`、`app/(tabs)/_layout.tsx:14` |
| 今天（每日學習） | 每輪最多 3 個新字＋到期複習；顯示進度、連續天數、「再學 3 個」「練剛學的字」 | 免費 | 兩者 | `app/(tabs)/index.tsx`、`app/learn/index.tsx`、`src/logic/srs.ts` |
| 學新字：看與聽 | 大字、羅馬拼音、一般／慢速發音（附發音，TTS 預錄）、例字 | 免費 | 兩者 | `app/learn/intro.tsx`、`src/audio/playKana.ts` |
| 筆順動畫 | 依 KanjiVG 筆畫資料播放筆順 | 免費 | 兩者 | `app/learn/stroke.tsx`、`src/components/StrokeAnimation.tsx`、`src/data/strokes.json` |
| 描寫練習 | 在田字格依筆順描寫，系統判定筆畫形狀與順序 | 免費 | 兩者 | `app/learn/trace.tsx`、`src/logic/trace.ts`、`src/logic/traceShape.ts` |
| 間隔複習（SRS） | 答對升級、答錯 10 分鐘後再出現；羅馬拼音隨熟練度逐步淡出 | 免費 | 兩者 | `src/logic/srs.ts`、`src/logic/romaji.ts` |
| 測驗題型 | 看字選音、聽音選字、易混淆選擇、找出全部、讀一串、排順序、遮一半猜字、默寫（手寫由系統比對）、看詞選拼音 | 免費 | 兩者 | `src/logic/session.ts:102`、`src/logic/confusion.ts:206`、`app/quiz.tsx` |
| 讀外來語 | 用已學片假名組成的外來語出題，答完顯示中文意思 | 免費 | 兩者 | `src/logic/loanword.ts`、`src/components/QuizLoanword.tsx` |
| 五十音表 | 平假名／片假名分頁（清音、濁音半濁音、拗音），點字進詳情看大字、發音、筆順、容易搞混的字 | 免費 | 兩者 | `app/(tabs)/chart.tsx`、`app/kana/[id].tsx` |
| 自動練習 | 從已學字隨機出題（含易混淆題） | 免費 | 兩者 | `app/(tabs)/practice.tsx`、`src/logic/confusion.ts` |
| 掉字歸類（遊戲） | 字掉下來拖到對的籃子，六關由易到難（平假名↔拼音、片假名↔拼音、片↔平）；可改成點籃子操作 | 免費 | 兩者 | `app/drop/index.tsx`、`app/drop/play.tsx`、`src/logic/dropGame.ts:25` |
| 易混淆字對比 | 18 組長得像的字，並排比較、快速辨識 10 題；答錯自動累計「最近常搞混」 | 免費（但組內「記憶包諧音」部分付費） | 兩者 | `app/confuse/index.tsx`、`app/confuse/[id].tsx`、`src/data/confusables.ts` |
| 差異提示 | 易混淆組的記法提示（如 ソ 的紅線）；7 組 | 免費 | 兩者 | `src/data/mnemonics.ts`、`src/components/MnemonicSheet.tsx` |
| 特殊音教學與練習 | 長音、促音、拗音：拍數方塊＋最小對立詞聽音二選一（每類 6 題） | 免費 | 兩者 | `app/special/[kind].tsx`、`app/special-quiz.tsx`、`src/data/specialSounds.ts` |
| 好笑記憶包（諧音梗） | 每個假名一句中文諧音梗；あ行、か行（除け）免費，其餘看獎勵廣告解鎖 3 個讀音，或買斷全部 | 部分付費 | 兩者 | `src/data/puns.ts`、`src/components/PunCard.tsx`、`src/logic/punUnlock.ts`、`app/puns.tsx`、`app/punpack.tsx` |
| 諧音梗分享 | 把諧音梗做成圖片，透過系統分享面板分享 | 免費（需先解鎖該句） | 兩者 | `src/components/PunShareButton.tsx`、`src/components/PunCard.tsx:42` |
| 每日提醒與召回通知 | 本機通知，滾動排 7 天；3、7 天沒開 App 召回；練過的日子不打擾 | 免費 | 兩者（權限行為各平台不同，待確認） | `src/notifications/reminder.ts`、`app/(tabs)/settings.tsx:173` |
| 畢業紀念 | 平假名與片假名清音都學完後顯示統計（真實已學數、練習天數） | 免費 | 兩者 | `app/graduate.tsx`、`src/logic/graduate.ts` |
| 學完推薦下一款 App | 畢業頁帶到推薦卡（目前推薦壽司日檢，圖示＋一句話＋「去下載」，可關閉）；iOS 開 App Store、Android 開 Google Play。名單與 `released` 開關集中在 `src/content/ptalkApps.ts`（壽司轉珠已備好但隱藏） | 免費 | 兩者 | `app/next.tsx`、`src/content/ptalkApps.ts`、`src/components/PtalkAppIcon.tsx` |
| 更多 PTalk App（設定） | 設定頁依日文、英文分組列出另外已上架的 PTalk App（不含自己、未上架者），點了開商店 | 免費 | 兩者 | `app/(tabs)/settings.tsx`、`src/content/ptalkApps.ts` |
| 看我們更多產品（設定） | 設定頁「更多 PTalk App」第一列，開 PTalk 學習地圖官網 | 免費 | 兩者 | `app/(tabs)/settings.tsx`、`src/logic/appStore.ts` |
| 給我們五星好評 | 設定頁「支持我們」：直接開商店評分頁（iOS App Store 寫評論、Android Google Play 評論），打不開時開網頁版商店 | 免費 | 兩者 | `app/(tabs)/settings.tsx`、`src/logic/appStore.ts` |
| 推薦給朋友 | 設定頁「支持我們」：系統分享面板，附一句介紹與商店網址（iOS 給 App Store、Android 給 Google Play） | 免費 | 兩者 | `app/(tabs)/settings.tsx`、`src/logic/appStore.ts` |
| 推廣夥伴計畫 | 設定頁「支持我們」進入說明頁：分潤 10%～30%、3 個參加步驟、可複製的私訊範本、按鈕開 Threads @ptalk.design | 免費 | 兩者 | `app/affiliate.tsx` |
| 設定 | 主題（跟隨系統／亮／暗）、每日目標、顯示羅馬拼音、提醒時間、發音速度、掉字操作、恢復購買、關於（KanjiVG 授權） | 免費 | 兩者 | `app/(tabs)/settings.tsx` |
| 幫助與聯絡 | 常見問題、聯絡信箱、回報問題（自動帶 App 與系統版本） | 免費 | 兩者 | `app/help.tsx`、`src/logic/help.ts` |
| 廣告隱私選項 | 歐盟等地區才顯示，可重開同意表單 | 免費 | 兩者（顯示條件待確認） | `app/(tabs)/settings.tsx:248`、`src/monetization/privacyOptions.ts` |
| 離線與本機保存 | 進度存手機（SQLite＋AsyncStorage），音檔全打包在 App 內，無帳號、無後端 | 免費 | 兩者 | `src/db/sqliteRepository.ts`、`CLAUDE.md` |
| 熱更新（OTA） | 非使用者功能，僅內部發版用 | — | 兩者 | `app.config.js` |

功能總數：28（含 OTA 與離線保存兩項非互動項目；使用者可直接操作的功能 26 項）。

## 內容數量
| 項目 | 數量 | 統計方式 |
|---|---|---|
| 假名總數 | 208（平假名 104、片假名 104） | `node -e 'const k=require("./src/data/kana.json");console.log(k.length)'` |
| 清音／濁音半濁音／拗音（各文字） | 46／25／33 | 同上，依 `script` 與 `kind` 分組計數 |
| 筆順資料 | 151 個字 | `node -e 'console.log(Object.keys(require("./src/data/strokes.json")).length)'` |
| 例字／外來語 | 平假名 179、片假名 97（可出題的外來語）＋15（僅當例字） | `node -e` 讀 `src/data/words.json`，依 `script` 與 `exampleOnly` 分組 |
| 預錄音檔 | 998 檔（499 個一般＋499 個慢速） | `ls assets/audio \| wc -l`；`ls assets/audio \| grep -v slow \| wc -l` |
| 易混淆字組 | 18 組 | `grep -n "id: '" src/data/confusables.ts \| wc -l` |
| 差異提示（記法）組 | 7 組 | `grep -c "groupId:" src/data/mnemonics.ts` |
| 特殊音 | 3 類（長音、促音、拗音）× 3 組對立詞；每類練習 6 題 | `src/data/specialSounds.ts`（`pairs`、`SPECIAL_QUIZ_LENGTH`） |
| 諧音梗 | 64 句（清音 42＋濁音／半濁音／拗音 22）；免費讀音 10 個（け 無句子，實際免費 9 句） | 以 `src/data/puns.ts` 的 `PUNS`、`VOICED_PUNS` 區塊逐行計數（正規表示式）；`FREE_SOUNDS` 見 `:95` |
| 掉字歸類關卡 | 6 關，每關 12 字 | `src/logic/dropGame.ts` 的 `DROP_STAGES`、`ROUND_SIZE` |
| 測驗題型 | 10 種正式出題（see、hear、confuse、loanword、wordread、findall、readseq、seq、maskhalf、recall）；spoterr 未啟用 | `src/logic/session.ts:102` |
| 單字、文法、閱讀題 | 0 | 無對應資料檔 |

## 付費模式
- **免費範圍**：所有學習、練習、遊戲、特殊音、易混淆字功能完全免費；沒有訂閱。
- **付費範圍**：只有「好笑記憶包」（諧音梗）。免費讀音：あ行、か行（`FREE_SOUNDS`，`src/data/puns.ts:95`）。其餘清音：看一支獎勵廣告永久解鎖 3 個讀音（點到的＋往後 2 個）；濁音、半濁音、拗音的句子只能買斷（`src/logic/punUnlock.ts:5`）。平假名與片假名以讀音共用解鎖。
- **買斷**：一次買斷，永久解鎖全部諧音梗並免廣告；RevenueCat entitlement `pun_pack`，iOS、Android 商品 ID `com.ptalk.kana5min.punpack`（`src/monetization/purchases.ts:1`）。**價格從商店讀取**（`src/monetization/usePunPackPrice.ts`）；抓不到時畫面備用顯示 NT$90（`purchases.ts` 的 `FALLBACK_PRICE`），實際售價以商店為準。
- **付費提示**：看完第 2、第 6 支廣告後各跳一次買斷提示，之後只留被動入口（設定頁、記憶卡）（`PROMPT_AT_ADS`）。
- **廣告位置**：只有獎勵廣告（使用者主動點「看廣告解鎖」才播），沒有橫幅或插頁；全部非個人化、不跳 ATT；使用 AdMob（`src/monetization/ads.ts`，`app.json` 內有 AdMob app id）。
- **恢復購買**：設定頁「好笑記憶包」區。
- **未設 key 時**：RevenueCat key 與廣告 unit id 從環境變數讀，沒設就顯示「暫時無法使用」（`ads.ts`、`purchases.ts`）。

## 隱藏或未啟用
| 項目 | 狀態 | 出處 |
|---|---|---|
| 抓錯字（spoterr）題型 | 旗標 `SPOT_ERROR_IN_PRACTICE = false`，不進自動練習；詞庫待核可（`words-spot-error.md`）；只在開發版可看 | `src/data/spotErrorWords.ts:10`、`src/logic/spotError.ts:48` |
| 諧音梗 け、つ、ひ（❌）、ふ、へ（未審） | 不顯示卡片；`kana-puns.md` 有試寫新句但未採用 | `PROGRESS.md`（好笑記憶包段）、`kana-puns.md` |
| 除錯選單與開發進度預設（`kana5min://debug`、分享卡預覽、掉字／測驗 DEV 按鈕） | 只在 `__DEV__`，正式版重導回首頁 | `app/debug.tsx`、`app/share-preview.tsx`、`src/dev/` |
| 各入口第一次進入的說明彈窗 | 已和使用者確認先不做（每行有一句說明、首頁有「？」面板） | `PROGRESS.md` |

## 未來功能建議（依優先順序，最多 5 項）
| 優先 | 功能 | 解決誰的什麼問題 | 為什麼先做 | 工作量（小／中／大） |
|---|---|---|---|---|
| 1 | 抓錯字題型上線（補詞庫、產音檔、旗標改 true） | 想練「看久了認錯字」的學習者 | 介面與邏輯已完成，只差詞庫核可（`src/data/spotErrorWords.ts:1-10`、`words-spot-error.md`） | 小 |
| 2 | 補完尚缺的諧音梗（け、つ、ひ、ふ、へ） | 付費買斷者覺得「還有字沒梗」 | 目前 5 個清音沒有卡片，直接影響買斷的完整度（`PROGRESS.md`、`kana-puns.md`） | 小 |
| 3 | 學完假名後的「假名組成單字」銜接練習（讀、聽簡單日常詞） | 剛畢業、對單字還沒信心的人 | 畢業到壽司日檢中間有落差；目前只有 97 個外來語讀題，且只有看拼音 | 中 |
| 4 | 畢業頁依表現推薦下一步（導壽司日檢 N5；想練手寫的導向待確認） | 畢業後流失的使用者 | 導流頁已存在（`app/next.tsx`），可更精準，且是學習地圖的銜接點 | 小 |
| 5 | 兩平台實機購買與廣告驗證（沙盒購買、恢復購買、Android 實機） | 付費使用者實際買不到會流失 | `PROGRESS.md` 待辦仍列為未測；是營收風險不是新功能，但需先排除 | 小 |

## 文件與程式不一致
| 文件說法 | 程式實際 | 出處 |
|---|---|---|
| `PROGRESS.md` 階段 1：例字與「一行學完」單字池 164 筆 | `words.json` 現有 291 筆（平假名 179、片假名 112） | `src/data/words.json`（腳本統計） |
| `PROGRESS.md`：音檔 536 檔，後又寫 998 檔 | 目前 998 檔（499×2） | `assets/audio` |
| `PROGRESS.md` 好笑記憶包段：只收 41 句 | 目前 64 句（清音 42＋濁音拗音 22） | `src/data/puns.ts` |
| `PROGRESS.md` 階段 2：易混淆字 5 組 | 目前 18 組（後續新增 13 組） | `src/data/confusables.ts`、git log `7cf3644` |
| `PROGRESS.md` 階段 1：練習分頁為簡版（自動練習 10 題） | 練習頁已有掉字歸類、易混淆字、特殊音、練剛學的字入口 | `app/(tabs)/practice.tsx:54-76` |
| `CLAUDE.md`：好笑記憶包的付費機制不在四個階段範圍內、不要實作 | 已實作廣告解鎖與買斷（後續階段另行決定） | `src/monetization/`、`PROGRESS.md` 好笑記憶包段 |
| `CLAUDE.md`：不要加入任何帳號、追蹤或分析 SDK；音檔用 expo-av 或 expo-audio | 已加入 AdMob 與 RevenueCat（購買與廣告用），音檔用 expo-audio | `package.json`、`src/monetization/` |
| `PROGRESS.md` 階段 4：`eas.json` 的 `appVersionSource: local` | 實際為 `remote`；另新增 OTA（xprem）設定 | `eas.json:4`、`app.config.js` |
| `README.md`：design/ 44 個設計畫面 | 待確認（未逐一數） | `README.md` |

## 官網用 JSON
```json
{"id":"kana5min","name":"諧音五十音","tagline":"台灣人專屬的平假名片假名諧音記憶法","language":"jp","stages":["零基礎"],"skills":["認字","手寫","聽力"],"audience":"完全沒學過日文、要從平假名與片假名開始的台灣人；已認得假名的人請改用壽司日檢","features":[{"title":"每日學新字","desc":"每輪 3 個新字，看與聽、筆順動畫、描寫練習，間隔複習幫你記住","paid":false},{"title":"五十音表與發音","desc":"平假名、片假名各 104 個，附一般與慢速發音","paid":false},{"title":"多種測驗與練習","desc":"看字選音、聽音選字、遮一半猜字、默寫、讀外來語、自動練習","paid":false},{"title":"掉字歸類遊戲","desc":"六關由易到難，把掉下來的假名分到正確的籃子","paid":false},{"title":"易混淆字對比","desc":"18 組長得像的字並排比較，答錯自動累計","paid":false},{"title":"長音、促音、拗音","desc":"拍數方塊加最小對立詞，聽音二選一","paid":false},{"title":"好笑記憶包","desc":"64 句中文諧音梗；あ行、か行免費，其餘看廣告解鎖或買斷","paid":true},{"title":"每日提醒","desc":"本機通知，練過的日子不打擾","paid":false},{"title":"學完推薦下一款","desc":"學完五十音後推薦壽司日檢，設定頁列出更多 PTalk App 並可開 PTalk 學習地圖","paid":false},{"title":"評分、分享與推廣夥伴","desc":"設定頁可直接給五星好評、推薦給朋友，或加入推廣夥伴計畫賺分潤","paid":false}],"counts":[{"label":"假名","value":208},{"label":"筆順資料","value":151},{"label":"例字與外來語","value":291},{"label":"預錄音檔","value":998},{"label":"易混淆字組","value":18},{"label":"諧音梗","value":64}],"pricing":"免費下載；好笑記憶包可看獎勵廣告逐步解鎖，或一次買斷（價格以商店為準，備用顯示 NT$90）","prev":[],"next":["壽司日檢"],"updated":"2026-11-05"}
```
