# 五十音 App 開發包

## 使用方式

1. 建立一個新資料夾並 `git init`，把這個開發包的所有檔案放進去。
2. 在這個資料夾開啟 Claude Code，切換到 auto mode。
3. 貼上下面這個指令，等它跑完。

```
/goal 依照 CLAUDE.md 的工作方式，依序完成 goals/01～04：四份 goal 檔裡所有完成條件的核取方塊都已勾選為 [x]，每個階段都有對應的 git commit，最後一次執行 `npx tsc --noEmit` 沒有錯誤、`npm test` 全部通過、maestro/ 裡所有流程都跑通
```

4. 跑完後看 `PROGRESS.md` 的「假設」與「待確認事項」，再依照最後的步驟用 EAS 打包上傳 TestFlight。

## 內容

| 檔案 | 用途 |
|---|---|
| CLAUDE.md | Claude Code 的工作規則與技術決定 |
| spec.md | 產品規格 |
| kana-puns.md | 諧音梗清單（あ行、か行用於免費的記憶小提示） |
| goals/01～04 | 四個開發階段的目標與完成條件 |
| PROGRESS.md | 進度、假設與待確認事項 |
| design/ | 44 個設計畫面原始檔（無 -L 為暗色，-L 為亮色） |
