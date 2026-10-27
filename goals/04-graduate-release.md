# Goal 04：畢業、導流與 TestFlight 準備

## 目標

做完畢業畫面與導流到壽司日檢的頁面，然後把整個 App 整理到可以用 EAS Build 打包、上傳 TestFlight 的狀態。這個階段結束後，開發者只需要自己執行打包與上傳指令。

## 參考

spec.md 第 4 節（C2-21～C2-22）、第 5.8 節。設計檔為 `design/C2-21-*`、`design/C2-22-*`。

## 範圍

畢業畫面在平假名與片假名的清音都學完時顯示一次，之後可以從設定再次查看。導流頁的壽司日檢 App Store 連結放在一個設定常數裡，先填 `[壽司日檢 App Store 連結]` 佔位；賣點文案沿用設計檔，第三點的佔位文字保留，記在 PROGRESS.md 待確認事項。

為了測試與截圖，加入一個只在開發版本出現的除錯選單，可以一鍵把進度設成「平假名全部完成」「全部完成」或重設。正式版本不能出現這個選單。

## TestFlight 準備

`app.json`（或 `app.config.ts`）要設定好：App 名稱、bundle identifier `com.ptalk.kana5min`、版本 `1.0.0`、build number、亮暗主題用的 `userInterfaceStyle: "automatic"`、啟動畫面、App 圖示佔位圖，以及 `ios.infoPlist.ITSAppUsesNonExemptEncryption: false`。

建立 `eas.json`，包含 development 與 production 兩個 profile。App 不收集任何使用者資料，若需要 privacy manifest 就依此填寫。

## 完成條件

- [x] 兩種假名都學完時顯示畢業畫面，數字來自真實資料，之後可從設定再次進入
- [x] 導流頁可開啟壽司日檢的 App Store 連結（使用設定常數），也可關閉回首頁
- [x] 開發版本有除錯選單可切換進度狀態；以 production 設定打包時不會包含除錯選單
- [x] `app.json` 與 `eas.json` 依上方「TestFlight 準備」設定完成
- [x] `npx expo-doctor` 沒有錯誤
- [x] 以 production 設定在本機完成一次 iOS 編譯（例如 `npx expo run:ios --configuration Release`），App 可在模擬器正常啟動
- [x] `maestro/phase4-*.yaml` 涵蓋：（以除錯選單設定全部完成）畢業畫面、導流頁開啟與關閉，全部跑通
- [x] `screenshots/phase4/` 有 C2-21～C2-22 的亮暗截圖，已對照設計檔確認
- [x] 第一到第三階段的 Maestro 流程仍然全部跑通
- [x] `npx tsc --noEmit` 沒有錯誤，`npm test` 全部通過
- [x] PROGRESS.md 有完整的待確認事項清單與上傳 TestFlight 的步驟說明，並 commit
