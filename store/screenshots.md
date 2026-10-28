# 商店截圖建議（草稿）

只列出建議的畫面與順序，指向 `screenshots/` 內現有的模擬器截圖；不複製、不移動圖檔。標語為建議文字，由開發者做商店版面時加上。

## 尺寸要求與現有檔案的差距

| 平台 | 必要尺寸 | 說明 |
|---|---|---|
| App Store（iPhone 6.9 吋） | 1320×2868、1290×2796 或 1260×2736（直式，2～10 張） | 必填；其他 iPhone 尺寸 Apple 會自動縮放 |
| Google Play 手機 | 長邊不超過短邊 2 倍、每邊 320～3840 px，至少 2 張（建議 1080×1920，最多 8 張） | 另需 512×512 圖示與 1024×500 主題圖（已完成：`store/graphics/play-icon-512.png`、`store/graphics/play-feature-1024x500.png`） |

`screenshots/phase1`～`phase4` 的圖是 1206×2622（iPhone 6.3 吋模擬器），`phase5` 是 1178×2556，**都不是 6.9 吋尺寸**，Google Play 也會因長寬比超過 2:1 被退。所以這些圖只作為「選哪些畫面」的依據；實際上傳前要在 iPhone 6.9 吋模擬器（例如 iPhone 17 Pro Max）用同一組 Maestro 流程重新截圖，Google Play 版另外裁成 9:16 或 1080×1920。本次沒有產生新截圖。

## 建議順序（亮色版為主，暗色版可另做一組）

| # | 畫面 | 現有檔案（亮色；暗色把 `light` 換成 `dark`） | 建議標語 |
|---|---|---|---|
| 1 | 好笑記法（已解鎖） | `screenshots/phase5/F1-Unlocked-light.png` | 你是在く（哭）喔？ |
| 2 | 首頁：今天的練習與各行進度 | `screenshots/phase1/C2-02-Home-light.png` | 每天只要 5 分鐘 |
| 3 | 學新字：看、聽、寫 | `screenshots/phase1/C2-05-LearnIntro-light.png` | 一次學 3 個字 |
| 4 | 筆順動畫 | `screenshots/phase1/C2-06-Stroke-light.png` | 跟著筆順寫一次 |
| 5 | 聽音選字測驗 | `screenshots/phase1/C2-09-QuizHear-correct-light.png` | 用耳朵記讀音 |
| 6 | 易混淆字並排比較 | `screenshots/phase2/C2-14-Confuse-light.png` | ぬ、め、シ、ツ 不再搞混 |
| 7 | 長音、促音、拗音 | `screenshots/phase2/C2-15-Long-light.png` | 長音促音一看就懂 |
| 8 | 片假名：外來語練習 | `screenshots/phase3/C2-20-KataWord-light.png` | 用外來語學片假名 |
| 9 | 好笑記憶包總覽 | `screenshots/phase5/F4-Overview-Purchased-light.png` | 全部諧音梗一次看 |
| 10 | 解鎖面板／買斷頁 | `screenshots/phase5/F2-UnlockSheet-light.png`、`screenshots/phase5/F3-PunPack-light.png` | 看一支廣告，或一次買斷 |

Apple 取 1～8 即可（至少 3 張，建議 6～8 張）；Google Play 取 1～8。第 9、10 張涉及廣告與購買，審查時需與實際功能一致。

## 備用

- 分享卡：`screenshots/phase5/F5-share-card-light.png`（社群分享素材，不放進商店截圖也可）。
- 五十音表：`screenshots/phase1/C2-03-Chart-light.png`。
- 設定頁的外觀選項（亮／暗）：`screenshots/phase1/C2-12-Settings-light.png`。
- 注意：截圖中不要出現開發版才有的除錯選單或測試廣告字樣。

## 已產生的商店截圖（2026-10-28）

用 iPhone 17 Pro Max（6.9 吋，1320×2868）模擬器、亮色、狀態列 9:41 重截，共 8 張，順序兩個商店相同：

| # | 檔名 | 畫面 | 賣點 |
|---|---|---|---|
| 1 | `01-home.png` | 首頁：各行進度、開始今天的 5 分鐘 | 每天只要 5 分鐘 |
| 2 | `02-pun-detail.png` | 「か」詳情：好笑記法、正常／慢速 | 用諧音梗記假名 |
| 3 | `03-stroke.png` | 筆順動畫 | 跟著筆順寫一次 |
| 4 | `04-quiz-hear.png` | 聽音選字測驗 | 用耳朵記讀音 |
| 5 | `05-confusable.png` | わ、ね、れ 易混淆比較 | 長得像的字不再搞混 |
| 6 | `06-youon.png` | 拗音合成 | 拗音一看就懂 |
| 7 | `07-katakana-word.png` | 片假名測驗「ケーキ」 | 用外來語學片假名 |
| 8 | `08-pun-overview.png` | 好笑記法總覽 | 全部諧音梗一次看 |

- `store/screenshots/ios-6.9/`：原圖 1320×2868，直接上傳 App Store（6.9 吋）。
- `store/screenshots/google-play/`：同一組裁掉頂部 180 px（狀態列）與底部 48 px，成 1320×2640（長寬比剛好 2:1），符合 Google Play「長邊不超過短邊 2 倍」。
- 重截方式：6.9 吋模擬器跑 `maestro/screenshots/phase{1,2,3,5}-capture.yaml`（THEME=light）。注意：清除狀態後開發版 App 第一次啟動偶爾停在「No script URL」紅畫面，需點 Reload 才會連上 Metro。
